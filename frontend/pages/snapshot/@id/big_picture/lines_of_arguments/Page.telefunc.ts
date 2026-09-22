import { ErrorDetails, errorToProblemDetails } from '#lib/ProblemDetails';
import { LinesOfArgumentsData, OptionalReviewData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onAnalysis } from '#server/api/snapshot';
import { getContext } from 'telefunc';

const handler = onAnalysis<LinesOfArgumentsData>('lines_of_arguments');

export const onLinesOfArguments = async (
  id: string
): Promise<
  | { analysis: OptionalReviewData<LinesOfArgumentsData> }
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
