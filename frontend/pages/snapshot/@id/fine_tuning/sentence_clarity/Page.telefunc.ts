import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import {
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
} from '#lib/ProblemDetails';
import { OnTopicReviewData, OptionalReviewData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onOnTopic } from '#server/api/snapshot';
import { getContext } from 'telefunc';

export const onSentenceClarity = async (
  id: string
): Promise<
  { analysis: OptionalReviewData<OnTopicReviewData> } | { error: ErrorDetails }
> => {
  const { onClose, settings } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings?.sentence_density) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    const analysis = await onOnTopic(id, 'sentence_density', controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, id, {
        tool: 'sentence_clarity',
        phase: 'snapshot',
      }),
    };
  }
};
