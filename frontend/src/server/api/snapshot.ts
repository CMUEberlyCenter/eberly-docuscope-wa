import { getAnalysis } from '#components/ReviewContext/createReviewDataContext';
import { userLanguage } from '#lib/languageCode';
import { ForbiddenError, GatewayError } from '#lib/ProblemDetails';
import {
  Analysis,
  BasicReviewPrompts,
  ExpectationsData,
  ExpectationsOutput,
  isExpectationsData,
  isExpectationsOutput,
  OnTopicReviewData,
  OptionalReviewData,
  ReviewPrompt,
  ReviewResponse,
} from '#lib/ReviewResponse';
import { getExpectationByIndex, isEnabled } from '#lib/WritingTask';
import { Request, Router } from 'express';
import { param } from 'express-validator';
import { doChat, reviewData } from '../data/chat';
import { findSnapshotById, updateSnapshotReviewsById } from '../data/mongo';
import { doOnTopic } from '../data/ontopic';
import { getSettings } from '../getSettings';
import { validate } from '../model/validate';

/** Router for handling snapshot-related API endpoints. */
export const snapshot = Router();

snapshot.get(
  '/:id',
  validate(param('id').isMongoId()),
  async (request: Request<{ id: string }>, response) => {
    const id = request.params.id;
    response.send(await findSnapshotById(id));
  }
);

snapshot.get(
  '/:id/ontopic',
  validate(param('id').isMongoId()),
  async (request: Request<{ id: string }>, response) => {
    const id = request.params.id;
    const settings = await getSettings();
    if (!settings.term_matrix && !settings.sentence_density) {
      throw new ForbiddenError('Ontopic tool is not available!');
    }
    const snapshot = await findSnapshotById(id);
    const analysisData = snapshot.analyses.find(
      ({ tool }) => tool === 'ontopic'
    );
    if (analysisData) {
      return response.send(analysisData);
    }
    // generate analysis on the fly
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const data = await doOnTopic(
      snapshot.segmented,
      userLanguage(snapshot.task),
      controller.signal
    );
    if (controller.signal.aborted) {
      return;
    }
    if (!data) {
      throw new GatewayError('No response from onTopic');
    }
    await updateSnapshotReviewsById(id, data);
    response.send(data);
  }
);

snapshot.get(
  '/:id/expectation/:index',
  validate(param('id').isMongoId()),
  validate(param('index').isInt({ min: 0 })),
  async (request: Request<{ id: string; index: string }>, response) => {
    const { id, index } = request.params;
    const indexNum = parseInt(index, 10);
    const settings = await getSettings();
    if (!settings.expectations) {
      throw new ForbiddenError('Expectation Analysis tool is not available!');
    }
    const snapshot = await findSnapshotById(id);
    if (!isEnabled(snapshot.task, 'expectations')) {
      throw new ForbiddenError(
        `Expectation analysis is not enabled for this writing task.`
      );
    }
    if (!snapshot.tool_config.includes('expectations')) {
      throw new ForbiddenError(
        `Expectation analysis is not configured for this snapshot.`
      );
    }
    const target = getExpectationByIndex(snapshot.task, indexNum);
    if (!target) {
      throw new ReferenceError(`No expectation found at index ${index}.`);
    }
    const analysisData = snapshot.analyses
      .filter((data) => isExpectationsData(data))
      .find(({ expectation }) => expectation === target.name);
    if (analysisData) {
      return response.send(analysisData);
    }
    // generate analysis on the fly
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const chat = await doChat<ExpectationsOutput>(
      'expectations',
      {
        ...reviewData({
          segmented: snapshot.segmented,
          writing_task: snapshot.task ?? null,
        }),
        expectation: target.name,
        description: target.description ?? '',
      },
      controller.signal,
      true,
      true
    );
    if (controller.signal.aborted) {
      return;
    }
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response)
      throw new Error(
        `NULL chat response for expectation ${index}: ${target.name}`
      );
    if (!isExpectationsOutput(chat_response)) {
      throw new Error(`Malformed results for ${index}: ${target.name}`, {
        cause: chat_response,
      });
    }
    const data: ExpectationsData = {
      tool: 'expectations',
      datetime,
      expectation: target.name,
      response: chat_response,
    };
    await updateSnapshotReviewsById(id, data);
    response.json(data);
  }
);

/** @deprecated replaced with telefunc */
snapshot.get(
  '/:id/:analysis',
  validate(param('id').isMongoId()),
  validate(param('analysis').isString().isIn(BasicReviewPrompts)),
  async (request: Request<{ id: string; analysis: string }>, response) => {
    // should this be behind authentication?
    const { id, analysis } = request.params;
    const settings = getSettings();
    if (analysis in settings && !settings[analysis as keyof typeof settings]) {
      throw new ForbiddenError(`${analysis} tool is not available!`);
    }
    const snapshot = await findSnapshotById(id);
    if (!isEnabled(snapshot.task, analysis)) {
      throw new ForbiddenError(
        `Analysis ${analysis} is not enabled for this writing task.`
      );
    }
    if (!snapshot.tool_config.includes(analysis)) {
      throw new ForbiddenError(
        `Analysis ${analysis} is not configured for this snapshot.`
      );
    }
    const analysisData = snapshot.analyses.find((a) => a.tool === analysis);
    if (analysisData) {
      return response.send(analysisData);
    }
    // generate analysis on the fly
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const chat = await doChat<ReviewResponse>(
      analysis as ReviewPrompt,
      reviewData({
        segmented: snapshot.segmented,
        writing_task: snapshot.task ?? null,
      }),
      controller.signal,
      true,
      true
    );
    if (controller.signal.aborted) {
      return;
    }
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response) throw new Error(`NULL chat response for ${analysis}`);
    if (typeof chat_response === 'string') {
      throw new Error(chat_response); // if string, throw as error
    }
    const data = {
      tool: analysis as ReviewPrompt,
      datetime,
      response: chat_response,
    } as Analysis;
    await updateSnapshotReviewsById(id, data);
    response.json(data);
  }
);

export function onAnalysis<T extends Analysis>(tool: ReviewPrompt) {
  return async (id: string, signal: AbortSignal) => {
    const snapshot = await findSnapshotById(id);
    if (!isEnabled(snapshot.task, tool)) {
      throw new ForbiddenError(
        `${tool} tool is not available for this writing task.`
      );
    }
    if (!snapshot.tool_config?.includes(tool)) {
      throw new ForbiddenError(
        `${tool} tool is not configured for this snapshot.`
      );
    }
    const analysis = getAnalysis<T>(snapshot.analyses, tool);
    if (analysis) {
      return analysis;
    }
    const chat = await doChat<ReviewResponse>(
      tool,
      reviewData({
        segmented: snapshot.segmented,
        writing_task: snapshot.task ?? null,
      }),
      signal,
      true,
      true
    );
    if (signal.aborted) {
      throw new Error('Request aborted');
    }
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response) throw new Error(`NULL chat response for ${tool}`);
    if (typeof chat_response === 'string') {
      throw new Error(chat_response); // if string, throw as error
    }
    const data = {
      tool,
      datetime,
      response: chat_response,
    } as Analysis;
    await updateSnapshotReviewsById(id, data);

    return data as OptionalReviewData<T>;
  };
}

export async function onOnTopic(id: string, signal: AbortSignal) {
  const snapshot = await findSnapshotById(id);
  if (!isEnabled(snapshot.task, 'ontopic')) {
    throw new ForbiddenError(
      `Ontopic tool is not available for this writing task.`
    );
  }
  if (!snapshot.tool_config?.includes('ontopic')) {
    throw new ForbiddenError(
      `Ontopic tool is not configured for this snapshot.`
    );
  }
  const analysis = getAnalysis<OnTopicReviewData>(snapshot.analyses, 'ontopic');
  if (analysis) {
    return analysis;
  }
  // generate analysis on the fly
  const data = await doOnTopic(
    snapshot.segmented,
    userLanguage(snapshot.task),
    signal
  );
  if (signal.aborted) {
    throw new Error('Request aborted');
  }
  if (!data) {
    throw new GatewayError('No response from onTopic');
  }
  await updateSnapshotReviewsById(id, data);
  return data;
}
