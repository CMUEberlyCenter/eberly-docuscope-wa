import { JsonValue, Optional } from '#/index';
import { logger } from '#server/logger.js';
import type { PlatformContext, GradeService, IdToken, Score } from 'ltijs';

export function isInstructor(token?: PlatformContext): boolean {
  return (
    !!token &&
    ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'].some(
      (role) => token.roles.includes(role)
    )
  );
}

// export function isStudent(token: ContextToken): boolean {
//   return [
//     "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
//   ].some(role => token.roles.includes(role));
// }

export const MAX_SCORE = 1; // Using undefined, 0 (openned), and 1 (used at least one tool)

const createLineItem = async (gradeService: GradeService, token: IdToken): Promise<string> => {
  try {
    // Check if a line item already exists for this resource link
    const response = await gradeService.getLineItems(token, {
      resourceLinkId: true,
    });
    const lineItemId = response.lineItems.at(0)?.id;
    if (lineItemId) {
      // If a line item already exists for this resource link, use it.
      return lineItemId;
    }
    const newLineItem = await gradeService.createLineItem(token, {
      scoreMaximum: MAX_SCORE,
      label: 'myProse Score',
      resourceId: token.platformContext.resource.id,
    });
    return newLineItem.id!;
  } catch (err) {
    logger.error('Error creating line item:', { error: err });
    throw new Error('Failed to create line item for grade submission.', {
      cause: err,
    });
  }
};

export const grade = async (gradeService: GradeService, token: Optional<IdToken>,
  score: number,
  customData?: JsonValue
) => {
  if (!gradeService) return null;
  if (!token) return null;
  const lineItemId =
    token.platformContext.endpoint?.lineitem ?? (await createLineItem(gradeService, token));
  const gradeObj: Score = {
    userId: token.user,
    scoreGiven: score,
    scoreMaximum: MAX_SCORE,
    activityProgress: score >= MAX_SCORE ? 'Completed' : 'Started',
    gradingProgress: 'FullyGraded',
    'https://docuscope-sc.eberly.cmu.edu/myprose/score': customData,
  };
  return gradeService.submitScore(token, lineItemId, gradeObj);
};
