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
  Analysis,
  isExpectationsData,
  isExpectationsOutput,
  OnTopicReviewData,
  ReviewPrompt,
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
import { Review } from '../model/review';
import { validate } from '../model/validate';
import { DEFAULT_LANGUAGE, ONTOPIC_URL, SEGMENT_URL } from '../settings';

export const reviews = Router();

const ANALYSES: ReviewPrompt[] = [
  'key_ideas',
  'lines_of_arguments',
  'logical_flow',
  'ethos',
  'civil_tone',
  'paragraph_clarity',
  'pathos',
  'professional_tone',
  'sources',
];

/**
 * Submit data to onTopic for processing.
 * @param review Review data to be sent to onTopic
 * @returns Processed data.
 * @throws fetch errors
 * @throws Bad onTopic response status
 * @throws JSON.parse errors
 */
const doOnTopic = async (
  review: Review
): Promise<OnTopicReviewData | undefined> => {
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
    throw new Error(`onTopic Response status: ${res.status}`);
  }
  const data = (await res.json()) as OnTopicData;
  return {
    tool: 'ontopic',
    datetime: new Date(),
    response: data,
  };
};

/**
 * Segments the given text into sentences.
 * @param text content of editor.
 * @returns HTML string.
 * @throws Error on bad service status.
 * @throws Network errors.
 * @throws JSON parse errors.
 */
const segmentText = async (text: string): Promise<string> => {
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
    throw new Error(`Bad service response from 'segment': ${res.status}`);
  }
  const data = (await res.json()) as string;
  return data.trim();
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
            .filter(isExpectationsData)
            .map(({ expectation }) => expectation)
        );
        const expectations = getExpectations(review.writing_task).filter(
          (rule) => !existing.has(rule.name)
        );
        expectJobs.push(
          ...expectations.map(async ({ name: expectation, description }) => {
            try {
              const { response, finished: datetime } = await doChat(
                'expectations',
                {
                  ...reviewData(review),
                  expectation,
                  description,
                },
                true
              );
              if (!response) throw new Error(`NULL results for ${expectation}`);
              if (!isExpectationsOutput(response)) {
                console.error(`Malformed results for ${expectation}`, response);
                throw new Error(`Malformed results for ${expectation}`);
              }
              return updateAnalysis({
                tool: 'expectations',
                datetime,
                expectation,
                response: response,
              });
            } catch (err) {
              console.error(err);
              return updateAnalysis({
                tool: 'expectations',
                datetime: new Date(),
                expectation,
                error: {
                  message: err instanceof Error ? err.message : `${err}`,
                  details: err, // TODO remove this in production.
                },
              });
            }
          })
        );
      }
      const chatJobs = analyses
        .filter((a): a is ReviewPrompt => ANALYSES.includes(a as ReviewPrompt))
        .map(async (key) => {
          if (review.analysis.some(({ tool }) => tool === key)) return; // do not clobber // TODO check if error
          try {
            const { response, finished: datetime } = await doChat(
              key,
              reviewData(review),
              true
            );
            if (!response) throw new Error(`NULL chat response for ${key}`);
            return updateAnalysis({
              tool: key,
              datetime,
              response,
            } as Analysis); // FIXME typescript shenanigans
          } catch (err) {
            console.error(err);
            return updateAnalysis({
              tool: key,
              datetime: new Date(),
              error: {
                message: err instanceof Error ? err.message : `${err}`,
                details: err, // TODO remove this in production.
              },
            });
          }
        });
      const ontopicJobs = ['ontopic'].map(async () => {
        if (!analyses.includes('ontopic')) return;
        if (review.analysis.some(({ tool }) => tool === 'ontopic')) return;
        try {
          const data = await doOnTopic(review);
          // TODO check for errors
          if (!data) throw new Error(`NULL onTopic results.`);
          return updateAnalysis(data);
        } catch (err) {
          console.error(err);
          return updateAnalysis({
            tool: 'ontopic',
            datetime: new Date(),
            error: {
              message: err instanceof Error ? err.message : `${err}`,
              details: err,
            },
          });
        }
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
