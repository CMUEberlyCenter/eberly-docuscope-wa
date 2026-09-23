import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import {
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
} from '#lib/ProblemDetails';
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
  const { settings, onClose } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings?.lines_of_arguments) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    const analysis = await handler(id, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, id, {
        tool: 'lines_of_arguments',
        phase: 'snapshot',
      }),
    };
  }
};
