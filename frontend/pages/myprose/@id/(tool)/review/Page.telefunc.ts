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
  Analysis,
  BasicReviewPrompts,
  ExpectationsData,
  isExpectationsData,
  isExpectationsOutput,
  LinesOfArgumentsData,
  LogicalFlowData,
  OptionalReviewData,
  ParagraphClarityData,
  ProfessionalToneData,
  ProminentTopicsData,
  ReviewPrompt,
  ReviewResponse,
  SourcesData
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
import { doOnTopic } from '#/server/data/ontopic.ts';
import { segmentText } from '#/server/data/segmentText.ts';
import { countPrompt } from '#/server/prometheus.ts';
import { Abort, getContext } from 'telefunc';

export const onExpectation = async ({
  index,
  document,
  writing_task,
}: ExpectationRequest): Promise<
  { input?: string, analysis: OptionalReviewData<ExpectationsData> } | { error: ErrorDetails }
> => {
  const { settings, onClose, session, acceptLanguage, auth } =
    getContext<TelefuncContext>();
  if (!auth?.user) {
    return {
      error: errorToProblemDetails(
        new ForbiddenError('User not authenticated.'),
        undefined,
        {
          tool: 'expectations',
          phase: 'myprose',
          writing_task,
          expectationIndex: index,
        }
      ),
    };
  }
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
      return { input: session?.segmented ?? '', analysis: cached };
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
    countPrompt(chat);
    if (controller.signal.aborted) {
      throw new AbortError();
    }
    insertLog(auth.user.email ?? '', chat);
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
    return { input: session?.segmented ?? '', analysis };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, auth.user.email, {
        tool: 'expectations',
        phase: 'myprose',
        writing_task,
        expectationIndex: index,
      }),
    };
  }
};

type ReviewData = {
  document: string;
  writing_task?: string;
};

export async function onReview<T extends Analysis>(tool: ReviewPrompt, {
  document,
  writing_task,
}: ReviewData): Promise<{ input: string, analysis: T } | { error: ErrorDetails }> {
  if (!tool || !BasicReviewPrompts.includes(tool)) {
    throw Abort();
  }
  const { settings, onClose, session, acceptLanguage, auth } =
    getContext<TelefuncContext>();
  if (!settings?.[tool]) {
    throw Abort();
  }
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!auth?.user) {
      throw new ForbiddenError('User not authenticated.');
    }
    if (!document || document.trim() === '') {
      throw new BadRequestError('Empty document!');
    }
    const task =
      session?.writing_task?.info.id === writing_task
        ? session?.writing_task
        : (writing_task ? await findWritingTaskById(writing_task) : undefined);
    if (task && !isEnabled(task, tool)) {
      throw new ForbiddenError(AccessDeniedReason.WRITING_TASK_DENY);
    }
    if (session && task && !equivalentWritingTasks(session?.writing_task, task)) {
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
      ?.filter((a): a is T => a.tool === tool)
      .find((a) => a.tool === tool);
    if (cached) {
      return { input: session?.segmented ?? '', analysis: cached };
    }
    const chat = await doChat<ReviewResponse>(
      tool,
      reviewData({
        segmented: session?.segmented,
        writing_task: task ?? null,
      }),
      controller.signal,
      true,
      true
    );
    countPrompt(chat)
    if (controller.signal.aborted) {
      throw new AbortError();
    }
    insertLog(auth.user.email ?? '', chat);
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response) {
      throw new GatewayError(`NULL chat response for ${tool}`);
    }
    if (typeof chat_response === 'string') {
      throw new GatewayError(chat_response); // if string, throw as error
    }
    const analysis: T = {
      tool,
      datetime,
      response: chat_response,
    } as T;
    if (session) {
      session.analysis = [...(session.analysis ?? []), analysis];
    }
    return { input: session?.segmented ?? '', analysis };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, undefined, {
        tool,
        phase: 'myprose',
      })
    };
  }
}

export const onLinesOfArguments = (data: ReviewData) => onReview<LinesOfArgumentsData>('lines_of_arguments', data);
export const onLogicalFlow = (data: ReviewData) => onReview<LogicalFlowData>('logical_flow', data);
export const onParagraphClarity = (data: ReviewData) => onReview<ParagraphClarityData>('paragraph_clarity', data);
export const onProfessionalTone = (data: ReviewData) => onReview<ProfessionalToneData>('professional_tone', data);
export const onProminentTopics = (data: ReviewData) => onReview<ProminentTopicsData>('prominent_topics', data);
export const onSources = (data: ReviewData) => onReview<SourcesData>('sources', data);
const onOnTopic = async (tool: 'term_matrix' | 'sentence_density', document: string) => {
  const { settings, onClose, session, acceptLanguage, auth } = getContext<TelefuncContext>();
  if (!settings?.[tool]) {
    throw Abort();
  }
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!auth?.user) {
      throw new ForbiddenError('User not authenticated.');
    }
    if (!document || document.trim() === '') {
      throw new BadRequestError('Empty document!');
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
    const cached = session?.analysis?.find((a) => a.tool === 'ontopic');
    if (cached) {
      return { analysis: cached };
    }
    const data = await doOnTopic(document, acceptLanguage, controller.signal);
    if (controller.signal.aborted) {
      throw new AbortError();
    }
    if (!data) {
      throw new GatewayError(`NULL chat response for ${tool}`);
    }
    if (session) {
      session.analysis = [...(session.analysis ?? []), data];
    }
    return { analysis: data };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, undefined, {
        tool,
        phase: 'myprose',
      })
    };
  }
}
export const onTermMatrix = (data: ReviewData) => onOnTopic('term_matrix', data.document);
export const onSentenceDensity = (data: ReviewData) => onOnTopic('sentence_density', data.document);
