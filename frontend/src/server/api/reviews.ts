import { NextFunction, Request, Response, Router } from 'express';
import { body, ContextRunner, param } from 'express-validator';
import { OnTopicData } from '../../lib/OnTopicData';
import {
  BadRequest,
  FileNotFound,
  InternalServerError,
} from '../../lib/ProblemDetails';
import {
  AllExpectationsData,
  AllExpectationsResponse,
  Analysis,
  ArgumentsResponse,
  GlobalCoherenceResponse,
  isAllExpectationsData,
  KeyPointsResponse,
  OnTopicReviewData,
} from '../../lib/ReviewResponse';
import { isWritingTask, WritingTask } from '../../lib/WritingTask';
import { doChat } from '../data/chat';
import {
  deleteReviewById,
  findReviewById,
  insertReview,
  updateReviewByIdAddAnalysis,
} from '../data/mongo';
import { IdToken } from '../model/lti';
import { ReviewPrompt } from '../model/prompt';
import { Review } from '../model/review';
import { DEFAULT_LANGUAGE, ONTOPIC_URL } from '../settings';

export const reviews = Router();

const validate = (...validations: ContextRunner[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      const valid = await validation.run(req);
      if (!valid.isEmpty()) {
        return res.status(400).send(BadRequest(JSON.stringify(valid.array())));
      }
    }
    next();
  };
};

const ANALYSES: ReviewPrompt[] = [
  'global_coherence',
  'key_points',
  'arguments',
];

const doOnTopic = async (
  review: Review
): Promise<OnTopicReviewData | undefined> => {
  try {
    const res = await fetch(ONTOPIC_URL, {
      method: 'POST',
      body: JSON.stringify({
        status: 'request',
        data: {
          base: review.text,
          custom: '', // no topics in current set of tasks
          customStructured: [], // no topics in current set of tasks
        },
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(
        `Bad response from ontopic: ${res.status} - ${res.statusText}`
      );
      return;
    }
    const data = (await res.json()) as OnTopicData;
    return {
      tool: 'ontopic',
      datetime: new Date(),
      response: data,
    };
  } catch (err) {
    console.error(err);
  }
};

const reviewData = (review: Review) => ({
  text: review.text,
  user_lang:
    (isWritingTask(review.writing_task)
      ? review.writing_task.info.user_lang
      : undefined) ?? DEFAULT_LANGUAGE,
  target_lang:
    (isWritingTask(review.writing_task)
      ? review.writing_task.info.target_lang
      : undefined) ?? DEFAULT_LANGUAGE,
});

reviews.get(
  '/:id/expectations',
  validate(param('id').isMongoId()),
  async (request: Request, response: Response) => {
    try {
      const { id } = request.params;
      const review = await findReviewById(id);

      response.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
      });
      response.flushHeaders();
      response.on('close', () => response.end());
      const { writing_task } = review;
      response.write(`data: ${JSON.stringify(review)}\n\n`);
      if (isWritingTask(writing_task)) {
        const user_lang = writing_task.info.user_lang ?? DEFAULT_LANGUAGE;
        const target_lang = writing_task.info.target_lang ?? DEFAULT_LANGUAGE;
        // Filter out already analysed expectations.
        const existing = new Set(
          review.analysis
            .filter(isAllExpectationsData)
            .map(({ expectation }) => expectation)
        );
        const expectations = writing_task.rules.rules
          .flatMap((rule) => (rule.is_group ? rule.children : [rule]))
          .filter((rule) => !existing.has(rule.name));
        await Promise.allSettled(
          expectations.map(async (expectation) => {
            const content = await doChat(
              'all_expectations',
              {
                expectation: expectation.name,
                description: expectation.description,
                text: review.text,
                user_lang,
                target_lang,
              },
              true
            );
            const resp = content.response.choices.at(0)?.message.content;
            if (!resp) return; //FIXME
            const analysis: AllExpectationsData = {
              tool: 'all_expectations',
              datetime: content.finished,
              expectation: expectation.name,
              response: JSON.parse(resp) as AllExpectationsResponse,
            };
            const upd = await updateReviewByIdAddAnalysis(id, analysis);
            if (!response.closed) {
              response.write(`data: ${JSON.stringify(upd)}\n\n`);
            }
          })
        );
        if (!response.closed) {
          const final = await findReviewById(id);
          response.write(`data: ${JSON.stringify(final)}\n\n`);
          return response.end();
        }
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        return response.status(404).send(FileNotFound(err));
      }
      return response.status(500).send(InternalServerError(err));
    }
  }
);

reviews.get(
  '/:id',
  validate(param('id', 'Invalid review id').isMongoId()),
  async (request: Request, response: Response) => {
    const { id } = request.params;
    const tool = request.query.tool;
    const analyses = [...ANALYSES, 'ontopic'].filter((analysis) => {
      if (!tool) {
        return true;
      }
      if (Array.isArray(tool)) {
        return (tool as string[]).includes(analysis);
      }
      if (typeof tool === 'string') {
        return analysis === tool;
      }
    });
    try {
      const review = await findReviewById(id);
      response.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
      });
      response.flushHeaders();
      response.on('close', () => response.end());
      response.write(`data: ${JSON.stringify(review)}\n\n`);
      await Promise.allSettled([
        ...analyses
          .filter((tool) => !review.analysis.some((a) => a.tool === tool))
          .map(async (tool) => {
            let analysis: Analysis | undefined = undefined;
            switch (tool) {
              case 'global_coherence': {
                const resp = await doChat(tool, reviewData(review), true);
                const data = resp?.response.choices.at(0)?.message.content;
                if (data) {
                  analysis = {
                    tool,
                    datetime: resp.finished,
                    response: JSON.parse(data) as GlobalCoherenceResponse,
                  };
                }
                break;
              }
              case 'key_points': {
                const resp = await doChat(tool, reviewData(review), true);
                const data = resp?.response.choices.at(0)?.message.content;
                if (data) {
                  analysis = {
                    tool,
                    datetime: resp.finished,
                    response: JSON.parse(data) as KeyPointsResponse,
                  };
                }
                break;
              }
              case 'arguments': {
                const resp = await doChat(tool, reviewData(review), true);
                const data = resp?.response.choices.at(0)?.message.content;
                if (data) {
                  analysis = {
                    tool,
                    datetime: resp.finished,
                    response: JSON.parse(data) as ArgumentsResponse,
                  };
                }
                break;
              }
              case 'ontopic':
                analysis = await doOnTopic(review);
                break;
              default:
                // never reachable...
                console.error(`Unknown tool: ${tool}`);
            }
            if (analysis) {
              const upd = await updateReviewByIdAddAnalysis(id, analysis);
              if (!response.closed) {
                response.write(`data: ${JSON.stringify(upd)}\n\n`);
              }
            }
            return analysis;
          }),
      ]);
      if (!response.closed) {
        const final = await findReviewById(id);
        response.write(`data: ${JSON.stringify(final)}\n\n`);
        return response.end();
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        return response.status(404).send(FileNotFound(err));
      }
      return response.status(500).send(InternalServerError(err));
    }
  }
);

reviews.delete(
  '/:id',
  validate(param('id').isMongoId()),
  async (request: Request, response: Response) => {
    try {
      const { id } = request.params;
      console.log(`delete ${id}`);
      deleteReviewById(id);
      return response.sendStatus(204);
    } catch (err) {
      if (err instanceof ReferenceError) {
        return response.status(404).send(FileNotFound(err));
      }
      return response.status(500).send(InternalServerError(err));
    }
  }
);

type ReviewBody = {
  text: string;
  document: string;
  writing_task: WritingTask | null;
};
reviews.post(
  '/',
  validate(body('text').isString(), body('document').isString()),
  async (request: Request, response: Response) => {
    const { text, document, writing_task } = request.body as ReviewBody;
    const token: IdToken | undefined = response.locals.token;
    try {
      const id = await insertReview(
        text,
        document,
        writing_task,
        token?.user,
        token?.platformContext.resource.id
      );
      return response.send(id);
    } catch (err) {
      return response.status(500).send(InternalServerError(err));
    }
  }
);
