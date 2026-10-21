import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import { getAnalysis } from '#components/ReviewContext/createReviewDataContext';
import { userLanguage } from '#lib/languageCode';
import {
  AbortError,
  errorToProblemDetails,
  ForbiddenError,
  GatewayError,
} from '#lib/ProblemDetails';
import {
  Analysis,
  ExpectationsData,
  ExpectationsOutput,
  isExpectationsData,
  isExpectationsOutput,
  OnTopicReviewData,
  OptionalReviewData,
  ReviewPrompt,
  ReviewResponse,
  ReviewTool,
} from '#lib/ReviewResponse';
import { getExpectationByIndex, isEnabled } from '#lib/WritingTask';
import {
  enhance,
  Get,
  params,
  UniversalHandler,
} from '@universal-middleware/core';
import { Request, Router } from 'express';
import { param } from 'express-validator';
import { doChat, reviewData } from '../data/chat';
import { findSnapshotById, updateSnapshotReviewsById } from '../data/mongo';
import { doOnTopic } from '../data/ontopic';
import { getSettings } from '../getSettings';
import { validate } from '../model/validate';

/** Router for handling snapshot-related API endpoints. */
export const snapshot = Router();

export async function getExpectation(
  id: string,
  index: number,
  signal: AbortSignal
) {
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
  const target = getExpectationByIndex(snapshot.task, index);
  if (!target) {
    throw new ReferenceError(`No expectation found at index ${index}.`);
  }
  const analysisData = snapshot.analyses
    .filter((data) => isExpectationsData(data))
    .find(({ expectation }) => expectation === target.name);
  if (analysisData) {
    return analysisData;
  }
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
    signal,
    true,
    true
  );
  if (signal.aborted) {
    throw new AbortError();
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
  return data;
}

export const snapshotExpectationHandler = (() => {
  return enhance(
    async (request, _context, runtime) => {
      try {
        const settings = await getSettings();
        if (!settings.expectations) {
          throw new ForbiddenError(
            'Expectation Analysis tool is not available!'
          );
        }
        const snapshotParams = params(
          request,
          runtime,
          '/api/v2/snapshot/:id/expectation/:index'
        );
        if (!snapshotParams) {
          throw new Error('Invalid parameters');
        }
        const indexNum = parseInt(snapshotParams.index, 10);
        if (isNaN(indexNum) || indexNum < 0) {
          throw new ReferenceError(
            `Invalid index parameter: ${snapshotParams.index}`
          );
        }
        const snapshot = await getExpectation(
          snapshotParams.id,
          indexNum,
          request.signal
        );
        return Response.json(snapshot);
      } catch (error) {
        if (request.signal.aborted) {
          return Response.json(
            errorToProblemDetails(new AbortError(), request.url),
            { status: 499 }
          );
        }
        console.error('Error in snapshotExpectationHandler:', error);
        const details = errorToProblemDetails(error);
        return Response.json(details, { status: details.status || 400 });
      }
    },
    {
      method: ['GET'],
      name: 'myprose:snapshotExpectationHandler',
      path: '/api/v2/snapshot/:id/expectation/:index',
      params: {
        id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
        index: { type: 'string', pattern: '^[0-9]+$' },
      },
    }
  );
}) satisfies Get<[], UniversalHandler>;

snapshot.get(
  '/:id/expectation/:index',
  validate(param('id').isMongoId()),
  validate(param('index').isInt({ min: 0 })),
  async (request: Request<{ id: string; index: string }>, response) => {
    const { id, index } = request.params;
    const indexNum = parseInt(index, 10);
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const settings = await getSettings();
    if (!settings.expectations) {
      throw new ForbiddenError('Expectation Analysis tool is not available!');
    }
    const snapshot = await getExpectation(id, indexNum, controller.signal);
    return response.send(snapshot);
  }
);

/**
 * Creates a function that handles a specific review analysis.
 * @param tool the review tool id.
 * @returns A function that takes a snapshot id and an AbortSignal, and returns the analysis data or throws an error if access is denied or if the analysis fails.
 */
export function onAnalysis<T extends Analysis>(tool: ReviewPrompt) {
  return async (id: string, signal: AbortSignal) => {
    const snapshot = await findSnapshotById(id);
    if (!isEnabled(snapshot.task, tool)) {
      throw new ForbiddenError(AccessDeniedReason.WRITING_TASK_DENY);
    }
    if (!snapshot.tool_config?.includes(tool)) {
      throw new ForbiddenError(AccessDeniedReason.SNAPSHOT_CONFIG_DENY);
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

export async function onOnTopic(
  id: string,
  tool: ReviewTool,
  signal: AbortSignal
) {
  const snapshot = await findSnapshotById(id);
  if (!isEnabled(snapshot.task, tool)) {
    throw new ForbiddenError(AccessDeniedReason.WRITING_TASK_DENY);
  }
  if (!snapshot.tool_config.includes(tool)) {
    throw new ForbiddenError(AccessDeniedReason.SNAPSHOT_CONFIG_DENY);
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
