import { ErrorDetails, errorToProblemDetails } from '#lib/ProblemDetails';
import { OnTopicReviewData, OptionalReviewData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onOnTopic } from '#server/api/snapshot';
import { getContext } from 'telefunc';

export const onTopicalProgression = async (
  id: string
): Promise<
  { analysis: OptionalReviewData<OnTopicReviewData> } | { error: ErrorDetails }
> => {
  const { onClose } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    const analysis = await onOnTopic(id, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return { error: errorToProblemDetails(error, id) };
  }
};
