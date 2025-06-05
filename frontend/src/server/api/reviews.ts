import { type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import type { OnTopicData } from '../../lib/OnTopicData';
import {
  InternalServerError,
  UnprocessableContent,
  UnprocessableContentError,
} from '../../lib/ProblemDetails';
import {
  type Analysis,
  BasicReviewPrompts,
  type ExpectationsData,
  type ExpectationsOutput,
  isExpectationsData,
  isExpectationsOutput,
  type OnTopicReviewData,
  type ReviewPrompt,
  type ReviewResponse,
} from '../../lib/ReviewResponse';
import {
  equivalentWritingTasks,
  getExpectations,
  isWritingTask,
  type WritingTask,
} from '../../lib/WritingTask';
import { doChat } from '../data/chat';
import { insertLog } from '../data/mongo';
import { validate } from '../model/validate';
import { countPrompt } from '../prometheus';
import { DEFAULT_LANGUAGE, ONTOPIC_URL, SEGMENT_URL } from '../settings';

export const reviews = Router();

// const ANALYSES: ReviewPrompt[] = [
//   'civil_tone',
//   'credibility',
//   // 'ethos',
//   'lines_of_arguments',
//   'logical_flow',
//   'paragraph_clarity',
//   // 'pathos',
//   'professional_tone',
//   'prominent_topics',
//   // 'revision_plan',
//   // 'sentence_density', // ontopic
//   'sources',
//   // 'term_matrix', // ontopic
// ];

/**
 * Submit data to onTopic for processing.
 * @param review Review data to be sent to onTopic
 * @returns Processed data.
 * @throws fetch errors
 * @throws Bad onTopic response status
 * @throws JSON.parse errors
 */
const doOnTopic = async (
  document: string,
  signal?: AbortSignal
): Promise<OnTopicReviewData | undefined> => {
  const res = await fetch(ONTOPIC_URL, {
    method: 'POST',
    body: JSON.stringify({
      base: document,
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
}: {
  segmented: string;
  writing_task: WritingTask | null;
}): Record<string, string> => ({
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

reviews.post(
  '/segment',
  validate(body().isString().notEmpty()),
  async (request: Request, response: Response) => {
    try {
      const segmented = await segmentText(request.body as string);
      if (segmented.trim() === '') {
        throw new UnprocessableContentError(['Unable to segment document']);
      }
      request.session.document = request.body; // save original document
      request.session.segmented = segmented; // save segmented document
      response.send(segmented);
    } catch (err) {
      console.error(err);
      if (err instanceof UnprocessableContentError) {
        response.status(422).send(UnprocessableContent(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);

async function updateSession(
  request: Request,
  document?: string,
  writing_task?: WritingTask | null
): Promise<void> {
  if (
    writing_task &&
    !equivalentWritingTasks(writing_task, request.session.writing_task)
  ) {
    if (!isWritingTask(writing_task)) {
      throw new UnprocessableContentError(['Invalid writing task object']);
    }
    request.session.writing_task = writing_task;
    request.session.analysis = []; // reset analysis
    // request.session.writing_task_id = writing_task.info.id;
  }
  // Validate document.  It should contain some text.
  if (document && document !== request.session.document) {
    if (document.trim() === '') {
      throw new UnprocessableContentError(['Empty document!']);
    }
    request.session.segmented = undefined; // reset segmented document
    request.session.document = document; // save original document
    request.session.analysis = []; // reset analysis
  }
  if (!request.session.segmented && request.session.document) {
    const segmented = await segmentText(request.session.document);
    if (segmented.trim() === '') {
      throw new UnprocessableContentError(['Unable to segment document']);
    }
    request.session.segmented = segmented; // save segmented document
  }
}
type AnalysisBody = {
  /** Document text to be analyzed, plain text or HTML string. */
  document?: string;
  /** Writing Task. */
  writing_task?: WritingTask | null;
  expectation?: string; // for expectations tool
};
reviews.post(
  '/ontopic',
  validate(body('document').isString().notEmpty()),
  async (request: Request, response: Response) => {
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const { document } = request.body as AnalysisBody;
    try {
      await updateSession(request, document);
      const cached = request.session.analysis?.find(
        (a) => a.tool === 'ontopic'
      );
      if (cached) {
        response.json(cached);
        return;
      }
      const data = await doOnTopic(
        request.session.document ?? '',
        controller.signal
      );
      if (controller.signal.aborted) {
        return;
      }
      if (!data) throw new Error(`NULL onTopic results.`);
      request.session.analysis = [...(request.session.analysis ?? []), data];
      response.json(data);
    } catch (err) {
      if (err instanceof UnprocessableContentError) {
        response.status(422).send(UnprocessableContent(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);
reviews.post(
  '/expectation',
  validate(body('document').isString().notEmpty()),
  validate(body('writing_task').isObject()),
  validate(body('expectation').isString().notEmpty()),
  async (request: Request, response: Response) => {
    const { document, writing_task, expectation } =
      request.body as AnalysisBody;
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    try {
      if (!expectation) {
        throw new UnprocessableContentError(['Expectation is required']);
      }
      await updateSession(request, document, writing_task);
      const cached = request.session.analysis?.find(
        (a) => isExpectationsData(a) && a.expectation === expectation
      );
      if (cached) {
        response.json(cached);
        return;
      }
      const chat = await doChat<ExpectationsOutput>(
        'expectations',
        {
          ...reviewData({
            segmented: request.session.segmented ?? '',
            writing_task: writing_task ?? null,
          }),
          expectation,
          description:
            getExpectations(writing_task ?? null).find(
              (rule) => rule.name === expectation
            )?.description ?? '',
        },
        controller.signal,
        true,
        true
      );
      if (controller.signal.aborted) {
        return;
      }
      countPrompt(chat);
      insertLog(request.sessionID ?? '', chat);
      const { response: chat_response, finished: datetime } = chat;
      if (!chat_response) throw new Error(`NULL results for ${expectation}`);
      if (!isExpectationsOutput(chat_response)) {
        console.error(`Malformed results for ${expectation}`, chat_response);
        throw new Error(`Malformed results for ${expectation}`);
      }
      const data: ExpectationsData = {
        tool: 'expectations',
        datetime,
        expectation,
        response: chat_response,
      };
      request.session.analysis = [...(request.session.analysis ?? []), data];
      response.json(data);
    } catch (err) {
      if (err instanceof UnprocessableContentError) {
        response.status(422).send(UnprocessableContent(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);
reviews.post(
  '/:analysis',
  validate(body('document').isString().notEmpty()),
  validate(body('writing_task').isObject()),
  validate(param('analysis').isString().isIn(BasicReviewPrompts)),
  async (request: Request, response: Response) => {
    const { analysis } = request.params;
    const { document, writing_task } = request.body as AnalysisBody;
    // const token: IdToken | undefined = response.locals.token;
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });

    try {
      await updateSession(request, document, writing_task);
      const cached = request.session.analysis?.find((a) => a.tool === analysis);
      if (cached) {
        console.log(`Returning cached analysis for ${analysis}`);
        response.json({ input: request.session.segmented, data: cached });
        return;
      }
      const chat = await doChat<ReviewResponse>(
        analysis as ReviewPrompt,
        reviewData({
          segmented: request.session.segmented ?? '',
          writing_task: writing_task ?? null,
        }),
        controller.signal,
        true,
        true
      );
      if (controller.signal.aborted) {
        return;
      }
      countPrompt(chat);
      insertLog(request.sessionID ?? '', chat);
      const { response: chat_response, finished: datetime } = chat;
      if (!chat_response) throw new Error(`NULL chat response for ${analysis}`);
      if (typeof chat_response === 'string') {
        throw new Error(chat_response); // if string, throw as error
      }
      const data: Analysis = {
        tool: analysis as ReviewPrompt,
        datetime,
        response: chat_response,
      } as Analysis; // FIXME typescript shenanigans
      request.session.analysis = [...(request.session.analysis ?? []), data];
      response.json({ input: request.session.segmented, data });
    } catch (err) {
      if (err instanceof UnprocessableContentError) {
        response.status(422).send(UnprocessableContent(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);
/** @deprecated 3.0.0
 * @route GET <reviews>/:id/
 * @summary Retrieve review data entry.
 * @description Retrieves review data entry from the database.  This is the current state of the review and does not initiate any analyses.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @returns Review data.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
// reviews.get(
//   '/:id',
//   validate(param('id', 'Invalid review id').isMongoId()),
//   async (request: Request, response: Response) => {
//     const { id } = request.params;
//     try {
//       const review = await findReviewById(id);
//       response.json(review);
//     } catch (err) {
//       console.error(err);
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/** @deprecated 3.0.0
 * @route GET <reviews>/:id/text
 * @summary Retrieve text for the given review.
 * @description Retrieves the segmented text for the review for display.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @returns Segmented user submitted text.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
// reviews.get(
//   '/:id/text',
//   validate(param('id', 'Invalid review id').isMongoId()),
//   async (request: Request, response: Response) => {
//     try {
//       const { id } = request.params;
//       const review = await findReviewById(id);
//       response.json(review.segmented);
//     } catch (err) {
//       console.error(err);
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/** @deprecated 3.0.0
 * @route GET <reviews>/:id/ontopic
 * @summary Retrieve review data including onTopic analysis.
 * @description Retrieves review data for onTopic and generates missing data if necessary.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @returns Updated review data.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
// reviews.get(
//   '/:id/ontopic',
//   validate(param('id', 'Invalid review id').isMongoId()),
//   async (request: Request, response: Response) => {
//     const { id } = request.params;
//     const controller = new AbortController();
//     request.on('close', () => {
//       controller.abort();
//     });
//     try {
//       const review = await findReviewById(id);
//       // add isWritingTask check? not needed for this analysis
//       // add isEnabled check? complicated as multiple tools use this.
//       if (review.analysis.some(({ tool }) => tool === 'ontopic')) {
//         response.json(review);
//         return;
//       }
//       const data = await doOnTopic(review.document, controller.signal);
//       if (controller.signal.aborted) {
//         return;
//       }
//       if (!data) throw new Error(`NULL onTopic results.`);
//       await updateReviewByIdAddAnalysis(id, data);
//       response.json(await findReviewById(id)); // return most recent with update.
//     } catch (err) {
//       console.error(err);
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/** @deprecated 3.0.0
 * @route GET <reviews>/:id/expectations
 * @summary Retrieve expectations review data.
 * @description Retrieves review data for expectations and generates missing data if necessary.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @returns Stream of updated review data.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
// reviews.get(
//   '/:id/expectations',
//   validate(param('id', 'Invalid review id').isMongoId()),
//   async (request: Request, response: Response) => {
//     const { id } = request.params;
//     const controller = new AbortController();
//     request.on('close', () => {
//       controller.abort();
//     });
//     try {
//       const review = await findReviewById(id);
//       if (!isWritingTask(review.writing_task)) {
//         response.status(400).send(BadRequest('No Writing Task Definition'));
//         return;
//       }
//       if (!isEnabled(review.writing_task, 'expectations')) {
//         response.status(403).send(Forbidden('Expectations tool is disabled!'));
//         return;
//       }
//       response.set({
//         'Cache-Control': 'no-cache',
//         'Content-Type': 'text/event-stream',
//         Connection: 'keep-alive',
//       });
//       response.flushHeaders();
//       response.on('close', () => response.end());
//       response.write(`data: ${JSON.stringify(review)}\n\n`);

//       const existing = new Set(
//         review.analysis
//           .filter(isExpectationsData)
//           .map(({ expectation }) => expectation)
//       );
//       const expectations = getExpectations(review.writing_task).filter(
//         (rule) => !existing.has(rule.name)
//       );
//       for (const { name: expectation, description } of expectations) {
//         if (response.writableEnded) break;
//         try {
//           const chat = await doChat<ExpectationsOutput>(
//             'expectations',
//             {
//               // ...reviewData(review),
//               expectation,
//               description,
//             },
//             controller.signal,
//             true,
//             true
//           );
//           if (controller.signal.aborted) {
//             return;
//           }
//           const { response: chat_response, finished: datetime } = chat;
//           if (!chat_response)
//             throw new Error(`NULL results for ${expectation}`);
//           if (!isExpectationsOutput(chat_response)) {
//             console.error(
//               `Malformed results for ${expectation}`,
//               chat_response
//             );
//             throw new Error(`Malformed results for ${expectation}`);
//           }
//           countPrompt(chat);
//           insertLog(request.sessionID ?? id, chat);
//           await updateReviewByIdAddAnalysis(id, {
//             tool: 'expectations',
//             datetime,
//             expectation,
//             response: chat_response,
//           });
//           if (!response.closed) {
//             const ret = await findReviewById(id); // get updated
//             response.write(`data: ${JSON.stringify(ret)}\n\n`);
//           }
//         } catch (err) {
//           console.error(err);
//           await updateReviewByIdAddAnalysis(id, {
//             tool: 'expectations',
//             datetime: new Date(),
//             expectation,
//             error: {
//               message: err instanceof Error ? err.message : `${err}`,
//               details: err,
//             },
//           });
//           if (!response.closed) {
//             // if not closed, send the update
//             const ret = await findReviewById(id); // get
//             response.write(`data: ${JSON.stringify(ret)}\n\n`);
//           }
//         }
//       }
//       if (!response.closed) {
//         const final = await findReviewById(id);
//         response.write(`data: ${JSON.stringify(final)}\n\n`);
//         response.end();
//       }
//     } catch (err) {
//       console.error(err);
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/** @deprecated 3.0.0
 * @route GET <reviews>/:id/:prompt
 * @summary Retrieve review data for a specific tool.
 * @description Retrieves review data for a specific tool and generates missing data if necessary.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @param prompt The tool to use for the analysis.
 * @returns Updated review data.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
// reviews.get(
//   '/:id/:prompt',
//   validate(
//     param('id', 'Invalid review id').isMongoId(),
//     param('prompt').isString().isIn(BasicReviewPrompts)
//   ),
//   async (request: Request, response: Response) => {
//     const { id, prompt } = request.params;
//     const controller = new AbortController();
//     request.on('close', () => {
//       controller.abort();
//     });
//     try {
//       const review = await findReviewById(id);
//       if (!isWritingTask(review.writing_task)) {
//         response.status(400).send(BadRequest('No Writing Task Definition!'));
//         return;
//       }
//       if (!isEnabled(review.writing_task, prompt as ReviewPrompt)) {
//         response.status(403).send(Forbidden(`Tool ${prompt} is disabled!`));
//         return;
//       }
//       if (review.analysis.some(({ tool }) => tool === prompt)) {
//         response.json(review); // already completed, return saved
//         return;
//       }
//       const chat = await doChat<ReviewResponse>(
//         prompt as ReviewPrompt,
//         {}, //reviewData(review),
//         controller.signal,
//         true,
//         true
//       );
//       if (controller.signal.aborted) {
//         return;
//       }
//       countPrompt(chat);
//       insertLog(request.sessionID ?? id, chat);
//       const { response: chat_response, finished: datetime } = chat;
//       if (!chat_response) throw new Error(`NULL chat response for ${prompt}`);
//       await updateReviewByIdAddAnalysis(id, {
//         tool: prompt,
//         datetime,
//         response: chat_response,
//       } as Analysis);
//       response.json(await findReviewById(id));
//     } catch (err) {
//       console.error(err);
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/** @deprecated 3.0.0
 * @route GET <reviews>/:id
 * @summary Retrieve review data.
 * @description Retrieves review data and generate missing data if necessary.
 * @param id Database id of the review request.  Must be a Mongo Id.
 * @param tool optional query for limiting which reviews to retrieve.
 * @returns stream of review data, updated as reviews complete, finishes when all review complete.
 * @returns { status: 404, body: @type{FileNotFound}}
 * @returns { status: 500: body: @type{InternalServerError}}
 * @deprecated 2.1.0
 */
// reviews.get(
//   '/:id/ex',
//   validate(param('id', 'Invalid review id').isMongoId()),
//   async (request: Request, response: Response) => {
//     const controller = new AbortController();
//     request.on('close', () => {
//       controller.abort();
//     });

//     const { id } = request.params;
//     const tool = request.query.tool; // use query to specify subset
//     const analyses = [...ANALYSES, 'ontopic', 'expectations'].filter(
//       (analysis) => {
//         return (
//           !tool ||
//           (typeof tool === 'string' && analysis === tool) ||
//           (Array.isArray(tool) && (tool as string[]).includes(analysis))
//         );
//       }
//     );

//     const updateAnalysis = async (analysis: Analysis | undefined) => {
//       if (analysis) {
//         await updateReviewByIdAddAnalysis(id, analysis);
//         if (!response.closed) {
//           const ret = await findReviewById(id); // get the updated review
//           response.write(`data: ${JSON.stringify(ret)}\n\n`);
//         }
//       }
//       return analysis;
//     };

//     try {
//       const review = await findReviewById(id);
//       response.set({
//         'Cache-Control': 'no-cache',
//         'Content-Type': 'text/event-stream',
//         Connection: 'keep-alive',
//       });
//       response.flushHeaders();
//       response.on('close', () => response.end());
//       response.write(`data: ${JSON.stringify(review)}\n\n`);

//       // if (
//       //   !request.closed &&
//       //   analyses.includes('ontopic') &&
//       //   !review.analysis.some(({ tool }) => tool === 'ontopic')
//       // ) {
//       //   try {
//       //     doOnTopic(review.document, controller.signal).then((data) => {
//       //       if (!data) throw new Error(`NULL onTopic results.`);
//       //       return updateAnalysis(data);
//       //     });
//       //     // const data = await doOnTopic(review.document, controller.signal);
//       //     // // TODO check for errors
//       //     // if (!data) throw new Error(`NULL onTopic results.`);
//       //     // await updateAnalysis(data);
//       //   } catch (err) {
//       //     console.error(err);
//       //     await updateAnalysis({
//       //       tool: 'ontopic',
//       //       datetime: new Date(),
//       //       error: {
//       //         message: err instanceof Error ? err.message : `${err}`,
//       //         details: err,
//       //       },
//       //     });
//       //   }
//       // }

//       // const expectJobs: Promise<Analysis | undefined>[] = [];
//       if (
//         isWritingTask(review.writing_task) &&
//         isEnabled(review.writing_task, 'expectations') &&
//         analyses.includes('expectations')
//       ) {
//         const existing = new Set(
//           review.analysis
//             .filter(isExpectationsData)
//             .map(({ expectation }) => expectation)
//         );
//         const expectations = getExpectations(review.writing_task).filter(
//           (rule) => !existing.has(rule.name)
//         );
//         for (const { name: expectation, description } of expectations) {
//           if (response.closed) break;
//           // }
//           // expectJobs.push(
//           //   ...expectations.map(async ({ name: expectation, description }) => {
//           // if (response.closed) return;
//           try {
//             console.log(`starting expectation ${expectation}`);
//             performance.mark('expectation');
//             const { response: chat_response, finished: datetime } =
//               await doChat<ExpectationsOutput>(
//                 'expectations',
//                 {
//                   // ...reviewData(review),
//                   expectation,
//                   description,
//                 },
//                 controller.signal,
//                 true,
//                 true
//               );
//             console.log(
//               `finished expectation: ${expectation}`,
//               performance.measure('expectation to Now', 'expectation')
//             );
//             if (!chat_response)
//               throw new Error(`NULL results for ${expectation}`);
//             if (!isExpectationsOutput(chat_response)) {
//               console.error(
//                 `Malformed results for ${expectation}`,
//                 chat_response
//               );
//               throw new Error(`Malformed results for ${expectation}`);
//             }
//             await updateAnalysis({
//               tool: 'expectations',
//               datetime,
//               expectation,
//               response: chat_response,
//             });
//           } catch (err) {
//             console.error(err);
//             await updateAnalysis({
//               tool: 'expectations',
//               datetime: new Date(),
//               expectation,
//               error: {
//                 message: err instanceof Error ? err.message : `${err}`,
//                 details: err, // TODO remove this in production.
//               },
//             });
//           }
//           // })
//           // );
//         }
//       }
//       const chatJobs = analyses.filter(
//         (a): a is ReviewPrompt =>
//           ANALYSES.includes(a as ReviewPrompt) &&
//           isWritingTask(review.writing_task) &&
//           isEnabled(review.writing_task, a) &&
//           !review.analysis.some(({ tool }) => tool === a) // do not clobber // TODO check if error
//       );
//       for (const key of chatJobs) {
//         // .map(async (key) => {
//         if (response.closed) break; // abort on closed response
//         // if (review.analysis.some(({ tool }) => tool === key)) continue; // do not clobber // TODO check if error
//         try {
//           const { response: chat_response, finished: datetime } =
//             await doChat<ReviewResponse>(
//               key,
//               {}, //reviewData(review),
//               controller.signal,
//               true,
//               true
//             );
//           if (!chat_response) throw new Error(`NULL chat response for ${key}`);
//           await updateAnalysis({
//             tool: key,
//             datetime,
//             response: chat_response,
//           } as Analysis); // FIXME typescript shenanigans
//         } catch (err) {
//           console.error(err);
//           await updateAnalysis({
//             tool: key,
//             datetime: new Date(),
//             error: {
//               message: err instanceof Error ? err.message : `${err}`,
//               details: err, // TODO remove this in production.
//             },
//           });
//         }
//       } //);
//       //const ontopicJobs = ['ontopic'].map(async () => {
//       // });
//       // await Promise.allSettled([...expectJobs, ...chatJobs, ...ontopicJobs]);
//       if (!response.closed) {
//         console.log(`Looking up final ${id}`);
//         const final = await findReviewById(id);
//         response.write(`data: ${JSON.stringify(final)}\n\n`);
//         response.end();
//       }
//     } catch (err) {
//       console.error(err);
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/** @deprecated 3.0.0
 * @route DELETE <review>/:id
 * @description Delete a review with the given id.
 * This should be protected behind authentication.
 * @param id Database id of the review request.  Must be a Mongo Id.
 */
// reviews.delete(
//   '/:id',
//   validate(param('id').isMongoId()),
//   async (request: Request, response: Response) => {
//     try {
//       const { id } = request.params;
//       console.log(`delete ${id}`);
//       deleteReviewById(id);
//       response.sendStatus(204);
//     } catch (err) {
//       if (err instanceof ReferenceError) {
//         response.status(404).send(FileNotFound(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );

/**
 * Expected form of review post requests.
 */
// type ReviewBody = {
//   /** Document text to be reviewed, plain text or HTML string. */
//   document: string; // HTML content.
//   /** Writing Task specification to use for the analysis. */
//   writing_task: WritingTask | null;
// };

/** @deprecated 3.0.0
 * @route POST <review>/
 * @summary Add a review request.
 * @description
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
// reviews.post(
//   '/',
//   validate(body('document').isString()),
//   async (request: Request, response: Response) => {
//     const { document, writing_task } = request.body as ReviewBody;
//     const token: IdToken | undefined = response.locals.token;
//     try {
//       // Validate writing task.
//       if (!isWritingTask(writing_task)) {
//         throw new UnprocessableContentError(['Invalid writing task object']);
//       }
//       // Validate document.  It should contain some text.
//       if (document.trim() === '') {
//         throw new UnprocessableContentError(['Empty document!']);
//       }
//       // Preprocessing - Sentence Segmenting.
//       const segmented = await segmentText(document);
//       if (segmented.trim() === '') {
//         throw new UnprocessableContentError(['Unable to segment document']);
//       }
//       // Add to database.
//       const id = await insertReview(
//         document,
//         segmented,
//         writing_task,
//         token?.user ?? request.sessionID,
//         token?.platformContext.resource.id
//       );
//       // request.session['wtd'] = writing_task; // FUTURE use session for analysis
//       // request.session['document'] = document; // FUTURE use session for analysis
//       // request.session.review_id = id;
//       // request.session.reviews = [...(request.session.reviews ?? []), id];
//       response.send(id);
//     } catch (err) {
//       if (err instanceof UnprocessableContentError) {
//         response.status(422).send(UnprocessableContent(err));
//       } else {
//         response.status(500).send(InternalServerError(err));
//       }
//     }
//   }
// );
