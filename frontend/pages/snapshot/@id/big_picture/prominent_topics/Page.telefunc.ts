import { ErrorDetails, errorToProblemDetails } from '#lib/ProblemDetails';
import { OptionalReviewData, ProminentTopicsData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onAnalysis } from '#server/api/snapshot';
import { getContext } from 'telefunc';

const handler = onAnalysis<ProminentTopicsData>('prominent_topics');

export const onProminentTopics = async (
  id: string
): Promise<
  | { analysis: OptionalReviewData<ProminentTopicsData> }
  | { error: ErrorDetails }
> => {
  const { onClose } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    const analysis = await handler(id, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return { error: errorToProblemDetails(error, id) };
  }
};
