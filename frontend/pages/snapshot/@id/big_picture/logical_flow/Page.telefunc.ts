import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import {
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
} from '#lib/ProblemDetails';
import { LogicalFlowData, OptionalReviewData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onAnalysis } from '#server/api/snapshot';
import { getContext } from 'telefunc';

const handler = onAnalysis<LogicalFlowData>('logical_flow');

export const onLogicalFlow = async (
  id: string
): Promise<
  { analysis: OptionalReviewData<LogicalFlowData> } | { error: ErrorDetails }
> => {
  const { onClose, settings } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings?.logical_flow) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    const analysis = await handler(id, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, id, {
        tool: 'logical_flow',
        phase: 'snapshot',
      }),
    };
  }
};
