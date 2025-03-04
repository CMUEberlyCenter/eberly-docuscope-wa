import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { OnTopicData } from '../../lib/OnTopicData';
import {
  BadRequest,
  FileNotFound,
  InternalServerError,
  UnprocessableContent,
  UnprocessableContentError,
} from '../../lib/ProblemDetails';
import {
  Analysis,
  BasicReviewPrompts,
  ExpectationsOutput,
  isExpectationsData,
  isExpectationsOutput,
  OnTopicReviewData,
  ReviewPrompt,
  ReviewResponse,
} from '../../lib/ReviewResponse';
import {
  getExpectations,
  isEnabled,
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
  'civil_tone',
  'ethos',
  'lines_of_arguments',
  'logical_flow',
  'paragraph_clarity',
  'pathos',
  'professional_tone',
  'prominent_topics',
  'revision_plan',
  // 'sentence_density', // ontopic
  'sources',
  // 'term_matrix', // ontopic
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
  review: Review,
  signal?: AbortSignal
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
    signal,
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

reviews.get(
  '/:id/fo',
  validate(param('id', 'Invalid review id').isMongoId()),
  async (request: Request, response: Response) => {
    const { id } = request.params;
    try {
      const review = await findReviewById(id);
      response.json(review);
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
  '/:id/text',
  validate(param('id', 'Invalid review id').isMongoId()),
  async (request: Request, response: Response) => {
    try {
      const { id } = request.params;
      const review = await findReviewById(id);
      response.json(review.segmented);
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
  '/:id/ontopic',
  validate(param('id', 'Invalid review id').isMongoId()),
  async (request: Request, response: Response) => {
    const { id } = request.params;
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    try {
      const review = await findReviewById(id);
      if (review.analysis.some(({ tool }) => tool === 'ontopic')) {
        response.json(review);
        return;
      }
      const data = await doOnTopic(review, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      if (!data) throw new Error(`NULL onTopic results.`);
      const analysis = await updateReviewByIdAddAnalysis(id, data);
      response.json(await findReviewById(id));
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        response.status(404).send(FileNotFound(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
    // response.json({
    //   ...review, analysis: [...review?.analysis ?? [], {
    //     tool: 'ontopic',
    //     datetime: new Date(),
    //     error: {
    //       message: err instanceof Error ? err.message : `${err}`,
    //       details: err,
    //     }
    //   }]
    // } as Review);
    // }
  }
);

reviews.get(
  '/:id/:prompt',
  validate(
    param('id', 'Invalid review id').isMongoId(),
    param('prompt').isString().isIn(BasicReviewPrompts)
  ),
  async (request: Request, response: Response) => {
    const { id, prompt } = request.params;
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    try {
      const review = await findReviewById(id);
      if (
        !isWritingTask(review.writing_task) ||
        !isEnabled(review.writing_task, prompt)
      ) {
        response
          .status(400)
          .send(BadRequest('No Writing Task Definition or tool is disabled!'));
        return;
      }
      if (review.analysis.some(({ tool }) => tool === prompt)) {
        response.json(review); // already completed, return saved
        return;
      }
      const { response: chat_response, finished: datetime } =
        await doChat<ReviewResponse>(
          prompt as ReviewPrompt,
          reviewData(review),
          controller.signal,
          true,
          true
        );
      if (controller.signal.aborted) {
        return;
      }
      if (!chat_response) throw new Error(`NULL chat response for ${prompt}`);
      const analysis = await updateReviewByIdAddAnalysis(id, {
        tool: prompt,
        datetime,
        response: chat_response,
      } as Analysis);
      response.json(await findReviewById(id));
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
// reviews.get('/:id/expectations', validate(param('id', 'Invalid review id').isMongoId()),
// async (request: Request, response: Response) => {
//   const { id } = request.params;
//   const controller = new AbortController();
//   request.on('close', () => {
//     controller.abort();
//   });
//   let review: Review | undefined;
//   try {
//     review = await findReviewById(id);
//     if (review.analysis.some(({ tool }) => tool === 'expectations')) {
//       response.json(review);
//       return;
//     }
//     const existing = new Set(
//       review.analysis
//         .filter(isExpectationsData)
//         .map(({ expectation }) => expectation)
//     );
//     const expectations = getExpectations(review.writing_task).filter(
//       (rule) => !existing.has(rule.name)
//     );
//     for (const { name: expectation, description } of expectations) {
//       if (response.writableEnded) break;
//       try {
//         const { response: chat_response, finished: datetime } =
//           await doChat<ExpectationsOutput>(
//             'expectations',
//             {
//               ...reviewData(review),
//               expectation,
//               description,
//             },
//             controller.signal,
//             true,
//             true
//           );
//         if (!chat_response)
//           throw new Error(`NULL results for ${expectation}`);
//         if (!isExpectationsOutput(chat_response)) {
//           console.error(
//             `Malformed results for ${expectation}`,
//             chat_response
//           );
//           throw new Error(`Malformed results for ${expectation}`);
//         }
//         const data = await updateReviewByIdAddAnalysis(id, {
//           tool: 'expectations',
//           datetime,
//           expectation,
//           response: chat_response,
//         });
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
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });

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

    const updateAnalysis = async (analysis: Analysis | undefined) => {
      if (analysis) {
        console.log(`updating ${id}`);
        const upd = await updateReviewByIdAddAnalysis(id, analysis);
        if (!response.closed) {
          response.write(`data: ${JSON.stringify(upd)}\n\n`);
        }
      }
      return analysis;
    };

    try {
      console.log(`Looking up ${id}`);
      const review = await findReviewById(id);
      response.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
      });
      response.flushHeaders();
      response.on('close', () => response.end());
      response.write(`data: ${JSON.stringify(review)}\n\n`);

      // if (
      //   !request.closed &&
      //   analyses.includes('ontopic') &&
      //   !review.analysis.some(({ tool }) => tool === 'ontopic')
      // ) {
      //   try {
      //     doOnTopic(review, controller.signal).then((data) => {
      //       if (!data) throw new Error(`NULL onTopic results.`);
      //       return updateAnalysis(data);
      //     });
      //     // const data = await doOnTopic(review, controller.signal);
      //     // // TODO check for errors
      //     // if (!data) throw new Error(`NULL onTopic results.`);
      //     // await updateAnalysis(data);
      //   } catch (err) {
      //     console.error(err);
      //     await updateAnalysis({
      //       tool: 'ontopic',
      //       datetime: new Date(),
      //       error: {
      //         message: err instanceof Error ? err.message : `${err}`,
      //         details: err,
      //       },
      //     });
      //   }
      // }

      // const expectJobs: Promise<Analysis | undefined>[] = [];
      if (
        isWritingTask(review.writing_task) &&
        isEnabled(review.writing_task, 'expectations') &&
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
        for (const { name: expectation, description } of expectations) {
          if (response.closed) break;
          // }
          // expectJobs.push(
          //   ...expectations.map(async ({ name: expectation, description }) => {
          // if (response.closed) return;
          try {
            console.log(`starting expectation ${expectation}`);
            performance.mark('expectation');
            const { response: chat_response, finished: datetime } =
              await doChat<ExpectationsOutput>(
                'expectations',
                {
                  ...reviewData(review),
                  expectation,
                  description,
                },
                controller.signal,
                true,
                true
              );
            console.log(
              `finished expectation: ${expectation}`,
              performance.measure('expectation to Now', 'expectation')
            );
            if (!chat_response)
              throw new Error(`NULL results for ${expectation}`);
            if (!isExpectationsOutput(chat_response)) {
              console.error(
                `Malformed results for ${expectation}`,
                chat_response
              );
              throw new Error(`Malformed results for ${expectation}`);
            }
            await updateAnalysis({
              tool: 'expectations',
              datetime,
              expectation,
              response: chat_response,
            });
          } catch (err) {
            console.error(err);
            await updateAnalysis({
              tool: 'expectations',
              datetime: new Date(),
              expectation,
              error: {
                message: err instanceof Error ? err.message : `${err}`,
                details: err, // TODO remove this in production.
              },
            });
          }
          // })
          // );
        }
      }
      const chatJobs = analyses.filter(
        (a): a is ReviewPrompt =>
          ANALYSES.includes(a as ReviewPrompt) &&
          isWritingTask(review.writing_task) &&
          isEnabled(review.writing_task, a) &&
          !review.analysis.some(({ tool }) => tool === a) // do not clobber // TODO check if error
      );
      for (const key of chatJobs) {
        // .map(async (key) => {
        if (response.closed) break; // abort on closed response
        // if (review.analysis.some(({ tool }) => tool === key)) continue; // do not clobber // TODO check if error
        try {
          const { response: chat_response, finished: datetime } =
            await doChat<ReviewResponse>(
              key,
              reviewData(review),
              controller.signal,
              true,
              true
            );
          if (!chat_response) throw new Error(`NULL chat response for ${key}`);
          await updateAnalysis({
            tool: key,
            datetime,
            response: chat_response,
          } as Analysis); // FIXME typescript shenanigans
        } catch (err) {
          console.error(err);
          await updateAnalysis({
            tool: key,
            datetime: new Date(),
            error: {
              message: err instanceof Error ? err.message : `${err}`,
              details: err, // TODO remove this in production.
            },
          });
        }
      } //);
      //const ontopicJobs = ['ontopic'].map(async () => {
      // });
      // await Promise.allSettled([...expectJobs, ...chatJobs, ...ontopicJobs]);
      if (!response.closed) {
        console.log(`Looking up final ${id}`);
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
