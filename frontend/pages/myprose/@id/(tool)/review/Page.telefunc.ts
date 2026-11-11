import { AccessDeniedReason } from '#/lib/AccessDeniedReason.ts';
import {
  AbortError,
  BadRequestError,
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
  GatewayError,
} from '#/lib/ProblemDetails.ts';
import { ExpectationRequest } from '#/lib/Requests.ts';
import {
  ExpectationsData,
  isExpectationsData,
  isExpectationsOutput,
  OptionalReviewData,
} from '#/lib/ReviewResponse.ts';
import { TelefuncContext } from '#/lib/TelefuncContext.ts';
import {
  equivalentWritingTasks,
  getExpectationByIndex,
  isEnabled,
  isWritingTask,
} from '#/lib/WritingTask.ts';
import { doChat, reviewData } from '#/server/data/chat.ts';
import { findWritingTaskById, insertLog } from '#/server/data/mongo.ts';
import { segmentText } from '#/server/data/segmentText.ts';
import { getContext } from 'telefunc';

export const onExpectation = async ({
  index,
  document,
  writing_task,
}: ExpectationRequest): Promise<
  { analysis: OptionalReviewData<ExpectationsData> } | { error: ErrorDetails }
> => {
  const { settings, onClose, session, acceptLanguage, sessionId } =
    getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings?.expectations) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    if (!document || document.trim() === '') {
      throw new BadRequestError('Empty document!');
    }
    if (!writing_task) {
      throw new BadRequestError(
        `Invalid writing task provided: ${writing_task}`
      );
    }

    const task =
      session?.writing_task?.info.id === writing_task
        ? session.writing_task
        : await findWritingTaskById(writing_task);
    if (!isWritingTask(task)) {
      throw new BadRequestError(
        `Invalid writing task provided: ${writing_task}`
      );
    }
    if (!isEnabled(task, 'expectations')) {
      throw new ForbiddenError(AccessDeniedReason.WRITING_TASK_DENY);
    }
    const expectation = getExpectationByIndex(task, index);
    if (!expectation) {
      throw new BadRequestError(`Invalid expectation index provided: ${index}`);
    }
    // update session
    if (
      session &&
      task &&
      !equivalentWritingTasks(session?.writing_task, task)
    ) {
      session.writing_task = task;
      session.analysis = [];
    }
    if (session && document && document !== session.document) {
      session.segmented = undefined;
      session.document = document;
      session.analysis = [];
    }
    if (session && !session.segmented) {
      const segmented = await segmentText(document, acceptLanguage);
      if (segmented.trim() === '') {
        throw new BadRequestError('Unable to segment document!');
      }
      session.segmented = segmented;
    }
    const cached = session?.analysis
      ?.filter(isExpectationsData)
      .find((a) => a.expectation === expectation.name);
    if (cached) {
      return { analysis: cached };
    }
    const chat = await doChat<ExpectationsData>(
      'expectations',
      {
        ...reviewData({
          segmented: session?.segmented,
          writing_task: task,
        }),
        expectation: expectation.name,
        description: expectation.description,
      },
      controller.signal,
      true,
      true
    );
    if (controller.signal.aborted) {
      throw new AbortError();
    }
    insertLog(sessionId ?? '', chat);
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response) {
      throw new GatewayError(
        `NULL chat response for expectation ${index}: ${expectation}`
      );
    }
    if (!isExpectationsOutput(chat_response)) {
      throw new GatewayError(`Malformed results for ${index}: ${expectation}`, {
        cause: chat_response,
      });
    }
    const analysis: ExpectationsData = {
      tool: 'expectations',
      datetime,
      expectation: expectation.name,
      response: chat_response,
    };
    if (session) {
      session.analysis = [...(session.analysis ?? []), analysis];
    }
    return { analysis };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, sessionId, {
        tool: 'expectations',
        phase: 'myprose',
        writing_task,
        expectationIndex: index,
      }),
    };
  }
};
