import { AccessDeniedReason } from '#/lib/AccessDeniedReason';
import {
  ErrorDetails,
  errorToProblemDetails,
  ForbiddenError,
} from '#/lib/ProblemDetails';
import { ExpectationsData, OptionalReviewData } from '#/lib/ReviewResponse';
import { TelefuncContext } from '#/lib/TelefuncContext';
import { getExpectation } from '#/server/api/snapshot';
import { getContext } from 'telefunc';

export const onExpectation = async (
  id: string,
  index: number
): Promise<
  { analysis: OptionalReviewData<ExpectationsData> } | { error: ErrorDetails }
> => {
  const { settings, onClose } = getContext<TelefuncContext>();
  const controller = new AbortController();
  onClose(() => {
    controller.abort();
  });
  try {
    if (!settings?.expectations) {
      throw new ForbiddenError(AccessDeniedReason.SERVER_DENY);
    }
    const analysis = await getExpectation(id, index, controller.signal);
    return {
      analysis,
    };
  } catch (error) {
    return {
      error: errorToProblemDetails(error, id, {
        tool: 'expectations',
        phase: 'snapshot',
        expectationIndex: index,
      }),
    };
  }
};
