import { type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import {
  ForbiddenError,
  GatewayError,
  UnprocessableContentError,
} from '../../lib/ProblemDetails';
import {
  type Analysis,
  BasicReviewPrompts,
  type ExpectationsData,
  type ExpectationsOutput,
  isExpectationsData,
  isExpectationsOutput,
  type ReviewPrompt,
  type ReviewResponse,
} from '../../lib/ReviewResponse';
import {
  equivalentWritingTasks,
  getExpectations,
  isEnabled,
  isWritingTask,
  type WritingTask,
} from '../../lib/WritingTask';
import { doChat, reviewData } from '../data/chat';
import { insertLog } from '../data/mongo';
import { segmentText } from '../data/segmentText';
import { getSettings } from '../getSettings';
import { validate } from '../model/validate';
import { countPrompt } from '../prometheus';
import { doOnTopic } from '../data/ontopic';

export const reviews = Router();

/**
 * @swagger
 * <reviews>/segment:
 *   post:
 *     summary: Segment text into sentences.
 *     description: Segments the given text into sentences and labels them using the onTopic service. This is used to prepare the text for analysis.
 *     requestBody:
 *       required: true
 *       content:
 *         plain/text:
 *           schema:
 *             type: string
 *             description: The text to be segmented.
 *     responses:
 *       '200':
 *         description: Segmented text.
 *         content:
 *           plain/text:
 *             schema:
 *               type: string
 *       '422':
 *         description: Unprocessable Content Error.
 *         content:
 *           application/problem+json:
 *             schema:
 *               $ref: '#/components/schemas/UnprocessableContent'
 */
reviews.post(
  '/segment',
  validate(body().isString().notEmpty()),
  async (request: Request, response: Response) => {
    const segmented = await segmentText(request.body as string);
    if (segmented.trim() === '') {
      throw new UnprocessableContentError(['Unable to segment document']);
    }
    request.session.document = request.body; // save original document
    request.session.segmented = segmented; // save segmented document
    response.send(segmented);
  }
);

/**
 * Update the session data with the given document and writing task.
 * @param request Request object.
 * @param document user's document text.
 * @param writing_task the writing task.
 * @throws {UnprocessableContentError} if validation fails.
 */
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

/**
 * @route POST <reviews>/ontopic
 * @summary Analyze text for topic relevance.
 * @description Analyzes the given text for topic relevance using the onTopic service.
 * @param document The text to be analyzed.
 * @returns Analysis results.
 * @throws {UnprocessableContentError}
 * @throws {InternalServerError}
 */
reviews.post(
  '/ontopic',
  validate(body('document').isString().notEmpty()),
  async (request: Request, response: Response) => {
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const { document } = request.body as AnalysisBody;
    await updateSession(request, document);
    const cached = request.session.analysis?.find((a) => a.tool === 'ontopic');
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
    if (!data) throw new GatewayError(`NULL onTopic results.`);
    request.session.analysis = [...(request.session.analysis ?? []), data];
    response.json(data);
  }
);

/**
 * @route POST <reviews>/expectation
 * @summary Analyze text for a given expectation.
 * @description Analyzes the given text to see if it addresses the given expectation using large language models.
 * @param document The text to be analyzed.
 * @param writing_task The writing task context.
 * @param expectation The specific expectation to analyze.
 * @returns Analysis results.
 * @returns { status: 403, body: @type{Forbidden}}
 * @returns { status: 422, body: @type{UnprocessableContent}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
reviews.post(
  '/expectation',
  validate(body('document').isString().notEmpty()),
  validate(
    body('writing_task')
      .isObject()
      .custom(isWritingTask)
      .withMessage('Invalid writing task')
  ),
  validate(
    body('expectation')
      .isString()
      .notEmpty()
      .withMessage('Expectation is required')
  ),
  async (request: Request, response: Response) => {
    if (!getSettings().expectations) {
      throw new ForbiddenError('Expectations tool is not available!');
    }
    const { document, writing_task, expectation } =
      request.body as AnalysisBody;
    if (!isWritingTask(writing_task)) {
      throw new UnprocessableContentError('Invalid writing task');
    }
    if (!isEnabled(writing_task, 'expectations')) {
      throw new ForbiddenError(
        'Expectations tool is disabled for this writing task!'
      );
    }
    if (!expectation) {
      throw new UnprocessableContentError('Expectation is required');
    }
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    await updateSession(request, document, writing_task);
    const cached = request.session.analysis?.find(
      (a) => isExpectationsData(a) && a.expectation === expectation
    );
    if (cached) {
      response.json({ input: request.session.segmented, data: cached });
      return;
    }
    const chat = await doChat<ExpectationsOutput>(
      'expectations',
      {
        ...reviewData({
          segmented: request.session.segmented,
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
    response.json({ input: request.session.segmented, data });
  }
);

/**
 * @route POST <reviews>/:analysis
 * @summary Submit a document for analysis.
 * @description Analyzes the given document using the specified analysis type.
 * @param analysis The type of analysis to perform.  Must be one of the basic review prompts.
 * @returns Analysis results.
 * @returns { status: 403, body: @type{Forbidden}}
 * @returns { status: 422, body: @type{UnprocessableContent}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
reviews.post(
  '/:analysis',
  validate(param('analysis').isString().isIn(BasicReviewPrompts)),
  validate(body('document').isString().notEmpty()),
  async (request: Request, response: Response) => {
    const { analysis } = request.params;
    // Check if the tool is enabled in settings
    const settings = getSettings();
    if (analysis in settings && !settings[analysis as keyof typeof settings]) {
      throw new ForbiddenError(`${analysis} tool is not available!`);
    }
    const { document, writing_task } = request.body as AnalysisBody;
    // const token: IdToken | undefined = response.locals.token;
    if (writing_task && !isWritingTask(writing_task)) {
      // conditional validation as writing_task is optional #230
      throw new UnprocessableContentError('Invalid writing task');
    }
    if (writing_task && !isEnabled(writing_task, analysis as ReviewPrompt)) {
      throw new ForbiddenError(`${analysis} is disabled!`);
    }
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });

    await updateSession(request, document, writing_task);
    const cached = request.session.analysis?.find((a) => a.tool === analysis);
    if (cached) {
      // console.log(`Returning cached analysis for ${analysis}`);
      response.json({ input: request.session.segmented, data: cached });
      return;
    }
    const chat = await doChat<ReviewResponse>(
      analysis as ReviewPrompt,
      reviewData({
        segmented: request.session.segmented,
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
  }
);
