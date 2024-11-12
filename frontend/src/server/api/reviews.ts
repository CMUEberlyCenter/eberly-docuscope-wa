import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { OnTopicData } from '../../lib/OnTopicData';
import {
  FileNotFound,
  InternalServerError,
  UnprocessableContent,
  UnprocessableContentError,
} from '../../lib/ProblemDetails';
import {
  AllExpectationsData,
  AllExpectationsResponse,
  Analysis,
  isAllExpectationsData,
  OnTopicReviewData
} from '../../lib/ReviewResponse';
import {
  getExpectations,
  isWritingTask,
  WritingTask,
} from '../../lib/WritingTask';
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
import { validate } from '../model/validate';
import { DEFAULT_LANGUAGE, ONTOPIC_URL } from '../settings';

export const reviews = Router();

const ANALYSES: ReviewPrompt[] = [
  // 'global_coherence',
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

/**
 * Extract data from a Review's writing task used for the templates.
 * @param review
 * @returns Acceptable object for "format" function.
 */
const reviewData = (review: Review): Record<string, string> => ({
  text: review.text,
  user_lang:
    (isWritingTask(review.writing_task)
      ? review.writing_task.info.user_lang
      : undefined) ?? DEFAULT_LANGUAGE,
  target_lang:
    (isWritingTask(review.writing_task)
      ? review.writing_task.info.target_lang
      : undefined) ?? DEFAULT_LANGUAGE,
  extra_instructions:
    (isWritingTask(review.writing_task)
      ? review.writing_task.extra_instructions
      : undefined) ?? '',
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
                ...reviewData(review),
                expectation: expectation.name,
                description: expectation.description,
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
          response.end();
        }
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        response.status(404).send(FileNotFound(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);

reviews.get(
  '/:id',
  validate(param('id', 'Invalid review id').isMongoId()),
  async (request: Request, response: Response) => {
    const { id } = request.params;
    const tool = request.query.tool; // use query to specify subset
    const analyses = [...ANALYSES, 'ontopic', 'expectations'].filter(
      (analysis) => {
        return (
          !tool ||
          (typeof tool === 'string' && analysis === tool) ||
          (Array.isArray(tool) && (tool as string[]).includes(analysis))
        );
      }
    );
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

      const updateAnalysis = async (analysis: Analysis | undefined) => {
        if (analysis) {
          const upd = await updateReviewByIdAddAnalysis(id, analysis);
          if (!response.closed) {
            response.write(`data: ${JSON.stringify(upd)}\n\n`);
          }
        }
        return analysis;
      };

      const expectJobs: Promise<Analysis | undefined>[] = [];
      if (
        isWritingTask(review.writing_task) &&
        analyses.includes('expectations')
      ) {
        const existing = new Set(
          review.analysis
            .filter(isAllExpectationsData)
            .map(({ expectation }) => expectation)
        );
        const expectations = getExpectations(review.writing_task).filter(
          (rule) => !existing.has(rule.name)
        );
        expectJobs.push(
          ...expectations.map(async ({ name: expectation, description }) => {
            const { response, finished: datetime } = await doChat(
              'all_expectations',
              {
                ...reviewData(review),
                expectation,
                description,
              }
            );
            const data = response.choices.at(0)?.message.content;
            if (!data) return; // TODO throw null results
            return updateAnalysis({
              tool: 'all_expectations',
              datetime,
              expectation,
              response: JSON.parse(data) as AllExpectationsResponse,
            });
          })
        );
      }
      const chatJobs = analyses
        .filter((a): a is ReviewPrompt => ANALYSES.includes(a as ReviewPrompt))
        .map(async (key) => {
          if (review.analysis.some(({ tool }) => tool === key)) return; // do not clobber
          const { response, finished: datetime } = await doChat(
            key,
            reviewData(review),
            true
          );
          const data = response.choices.at(0)?.message.content;
          if (!data) return;
          return updateAnalysis({
            tool: key,
            datetime,
            response: JSON.parse(data),
          });
        });
      const ontopicJobs = ['ontopic'].map(async () => {
        if (!analyses.includes('ontopic')) return;
        if (review.analysis.some(({ tool }) => tool === 'ontopic')) return;
        const data = await doOnTopic(review);
        if (!data) return;
        return updateAnalysis(data);
      });
      await Promise.allSettled([...expectJobs, ...chatJobs, ...ontopicJobs]);
      if (!response.closed) {
        const final = await findReviewById(id);
        response.write(`data: ${JSON.stringify(final)}\n\n`);
        response.end();
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        response.status(404).send(FileNotFound(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
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
      response.sendStatus(204);
    } catch (err) {
      if (err instanceof ReferenceError) {
        response.status(404).send(FileNotFound(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
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
      if (!isWritingTask(writing_task)) {
        throw new UnprocessableContentError(['Invalid writing task object']);
      }
      const id = await insertReview(
        text,
        document,
        writing_task,
        token?.user,
        token?.platformContext.resource.id
      );
      response.send(id);
    } catch (err) {
      if (err instanceof UnprocessableContentError) {
        response.status(422).send(UnprocessableContent(err));
      } else {
        response
          .status(500)
          .send(
            InternalServerError(
              err instanceof Error ? err : new Error('Unrecognized Error')
            )
          );
      }
    }
  }
);
