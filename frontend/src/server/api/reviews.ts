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
  OnTopicReviewData,
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
import { DEFAULT_LANGUAGE, ONTOPIC_URL, SEGMENT_URL } from '../settings';

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
        base: review.document,
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(
        `Bad response from ontopic: ${res.status} - ${res.statusText} - ${await res.text()}`
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
 * Segments the given text into sentences.
 * @param text content of editor.
 * @returns HTML string or ''.
 */
const segmentText = async (text: string): Promise<string> => {
  try {
    const res = await fetch(SEGMENT_URL, {
      method: 'POST',
      body: JSON.stringify({ text }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(
        `Bad response from segment: ${res.status} - ${res.statusText} - ${await res.text()}`
      );
      return '';
    }
    const data = (await res.json()) as string;
    return data;
  } catch (err) {
    console.error(err); // fetch error, rare errors
    return '';
  }
};

/**
 * Extract data from a Review's writing task used for the templates.
 * @param review A review object from the database.
 * @returns Acceptable object for "format" function.
 */
const reviewData = ({
  segmented,
  writing_task,
}: Review): Record<string, string> => ({
  text: segmented, // use content which has already been segmented into sentences.
  user_lang:
    (isWritingTask(writing_task) ? writing_task.info.user_lang : undefined) ??
    DEFAULT_LANGUAGE,
  target_lang:
    (isWritingTask(writing_task) ? writing_task.info.target_lang : undefined) ??
    DEFAULT_LANGUAGE,
  extra_instructions:
    (isWritingTask(writing_task)
      ? writing_task.extra_instructions
      : undefined) ?? '',
});

// Depricate
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
            const { response: data, finished: datetime } = await doChat(
              'all_expectations',
              {
                ...reviewData(review),
                expectation: expectation.name,
                description: expectation.description,
              },
              true
            );
            if (!data) return; //FIXME add throw
            const analysis: AllExpectationsData = {
              tool: 'all_expectations',
              datetime,
              expectation: expectation.name,
              response: data as AllExpectationsResponse,
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

/**
 * @route GET <reviews>/:id
 * @summary Retrieve review data.
 * @description Retrieves review data and generate missing data if necessary.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @param tool optional query for limiting which reviews to retrieve.
 * @returns stream of review data, updated as reviews complete, finishes when all review complete.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
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
              },
              true
            );
            if (!response) return; // TODO throw null results
            return updateAnalysis({
              tool: 'all_expectations',
              datetime,
              expectation,
              response: response as AllExpectationsResponse,
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
          if (!response) return;
          return updateAnalysis({
            tool: key,
            datetime,
            response,
          } as Analysis); // FIXME typescript shenanigans
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

/**
 * @route DELETE <review>/:id
 * @description Delete a review with the given id.
 * This should be protected behind authentication.
 * @param id Database id of the review request.  Must be a Mongo Id.
 */
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

/**
 * Expected form of review post requests.
 */
type ReviewBody = {
  /** Document text to be reviewed, plain text or HTML string. */
  document: string; // HTML content.
  /** Writing Task specification to use for the analysis. */
  writing_task: WritingTask | null;
};

/**
 * @route POST <review>/
 * Handles post request to add a review requiest for the given content and
 * performs any preprocessing of the incoming document.
 * This adds the document text and writing task to the database, it does
 * not initiate the review process, that is handled when reviews are fetched.
 * The front end uses this to get the database reference id that is used to
 * construct the get request that will do the reviews if necessary.
 * @returns Database id.
 * @returns { status: 422, body: @type{UnprocessableContent}}
 * @returns { status: 500, body: @type{InternalServerError}}
 */
reviews.post(
  '/',
  validate(body('document').isString()),
  async (request: Request, response: Response) => {
    const { document, writing_task } = request.body as ReviewBody;
    const token: IdToken | undefined = response.locals.token;
    try {
      // Validate writing task.
      if (!isWritingTask(writing_task)) {
        throw new UnprocessableContentError(['Invalid writing task object']);
      }
      // Validate document.  It should contain some text.
      if (document.trim() === '') {
        throw new UnprocessableContentError(['Empty document!']);
      }
      // Preprocessing - Sentence Segmenting.
      const segmented = await segmentText(document);
      if (segmented.trim() === '') {
        throw new UnprocessableContentError(['Unable to segment document']);
      }
      // Add to database.
      const id = await insertReview(
        document,
        segmented,
        writing_task,
        token?.user,
        token?.platformContext.resource.id
      );
      response.send(id);
    } catch (err) {
      if (err instanceof UnprocessableContentError) {
        response.status(422).send(UnprocessableContent(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);
