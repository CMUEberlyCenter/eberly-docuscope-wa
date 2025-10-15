import { type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import type { OnTopicData } from '../../lib/OnTopicData';
import {
  Forbidden,
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
  isEnabled,
  isWritingTask,
  type WritingTask,
} from '../../lib/WritingTask';
import { getSettings } from '../../ToolSettings';
import { doChat } from '../data/chat';
import { insertLog } from '../data/mongo';
import { validate } from '../model/validate';
import { countPrompt } from '../prometheus';
import { DEFAULT_LANGUAGE, ONTOPIC_URL, SEGMENT_URL } from '../settings';

export const reviews = Router();

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

/**
 * @route POST <reviews>/segment
 * @summary Segment text into sentences.
 * @description Segments the given text into sentences and labels them using the onTopic service.
 * This is used to prepare the text for analysis.
 * @param document The text to be segmented.
 * @returns Segmented text.
 * @returns { status: 422, body: @type{UnprocessableContent}}
 * @returns { status: 500: body: @type{InternalServerError}}
 */
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

/**
 * @route POST <reviews>/ontopic
 * @summary Analyze text for topic relevance.
 * @description Analyzes the given text for topic relevance using the onTopic service.
 * @param document The text to be analyzed.
 * @returns Analysis results.
 * @returns { status: 422, body: @type{UnprocessableContent}}
 * @returns { status: 500: body: @type{InternalServerError}}
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
      return response
        .status(403)
        .send(Forbidden('Expectations tool is not available!'));
    }
    const { document, writing_task, expectation } =
      request.body as AnalysisBody;
    if (!isWritingTask(writing_task)) {
      return response
        .status(422)
        .send(UnprocessableContent('Invalid writing task'));
    }
    if (!isEnabled(writing_task, 'expectations')) {
      return response
        .status(403)
        .send(Forbidden('Expectations tool is disabled!'));
    }
    if (!expectation) {
      return response
        .status(422)
        .send(UnprocessableContent('Expectation is required'));
    }
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    try {
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
      return response
        .status(403)
        .send(Forbidden(`${analysis} tool is not available!`));
    }
    const { document, writing_task } = request.body as AnalysisBody;
    // const token: IdToken | undefined = response.locals.token;
    if (writing_task && !isWritingTask(writing_task)) {
      // conditional validation as writing_task is optional #230
      return response
        .status(422)
        .send(UnprocessableContent('Invalid writing task'));
    }
    if (writing_task && !isEnabled(writing_task, analysis as ReviewPrompt)) {
      return response.status(403).send(Forbidden(`${analysis} is disabled!`));
    }
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
