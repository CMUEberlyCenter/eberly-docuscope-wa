import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import {
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
} from '#lib/ProblemDetails';
import { OptionalReviewData, SourcesData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onAnalysis } from '#server/api/snapshot';
import { getContext } from 'telefunc';

const handler = onAnalysis<SourcesData>('sources');

export const onSources = async (
  id: string
): Promise<
  { analysis: OptionalReviewData<SourcesData> } | { error: ErrorDetails }
> => {
  const { onClose, settings } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings?.sources) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    const analysis = await handler(id, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, id, {
        tool: 'sources',
        phase: 'snapshot',
      }),
    };
  }
};
