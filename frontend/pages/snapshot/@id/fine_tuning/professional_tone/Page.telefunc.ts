import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import {
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
} from '#lib/ProblemDetails';
import { OptionalReviewData, ProfessionalToneData } from '#lib/ReviewResponse';
import { TelefuncContext } from '#lib/TelefuncContext';
import { onAnalysis } from '#server/api/snapshot';
import { getContext } from 'telefunc';

const handler = onAnalysis<ProfessionalToneData>('professional_tone');

export const onProfessionalTone = async (
  id: string
): Promise<
  | { analysis: OptionalReviewData<ProfessionalToneData> }
  | { error: ErrorDetails }
> => {
  const { onClose, settings } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings.professional_tone) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    const analysis = await handler(id, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, id, {
        tool: 'professional_tone',
        phase: 'snapshot',
      }),
    };
  }
};
