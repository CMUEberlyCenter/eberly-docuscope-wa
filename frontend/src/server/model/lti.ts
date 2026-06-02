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

export const MAX_SCORE = 1.0; // Using undefined, 0 (openned), and 1 (used at least one tool)

const createLineItem = async (
  gradeService: GradeService,
  token: IdToken
): Promise<string> => {
  try {
    console.log(
      'Creating line item for resource link:',
      token.platformContext.resource.id
    );
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

const getLineItemId = async (
  gradeService: GradeService,
  token: IdToken
): Promise<string> => {
  return (
    token.platformContext.endpoint?.lineitem ||
    createLineItem(gradeService, token)
  );
};

export const startGrading = async (
  gradeService: GradeService,
  token: Optional<IdToken>
) => {
  if (!gradeService) return null;
  if (!token) return null;
  const existingGrade = await getGrade(gradeService, token);
  if (existingGrade) {
    // Don't update the grade if it already exists.
    return;
  }
  const lineItemId = await getLineItemId(gradeService, token);
  const gradeObj: Score = {
    userId: token.user,
    activityProgress: 'InProgress',
    gradingProgress: 'NotReady',
  };
  return gradeService.submitScore(token, lineItemId, gradeObj);
};

export const grade = async (
  gradeService: GradeService,
  token: Optional<IdToken>,
  score: number,
  customData?: JsonValue
) => {
  if (!gradeService) return null;
  if (!token) return null;
  // Check if a line item already exists for this resource link, and if so, get the existing grade.
  const existingGrade = await getGrade(gradeService, token);
  console.log('Existing grade:', existingGrade);
  if (
    existingGrade?.scoreGiven !== undefined &&
    existingGrade.scoreGiven >= score
  ) {
    // Don't update the grade if the new score is not higher than the existing score.
    return existingGrade;
  }
  const lineItemId = await getLineItemId(gradeService, token);
  console.log(
    'Submitting grade with lineItemId:',
    lineItemId,
    'score:',
    score,
    'customData:',
    customData
  );
  const gradeObj: Score = {
    userId: token.user,
    scoreGiven: score * 1.0, // ensure it is a float, as some LTI platforms may require a decimal value for the score, even if it is a whole number.
    scoreMaximum: MAX_SCORE,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
    'https://docuscope-sc.eberly.cmu.edu/myprose/score': customData,
  };
  return gradeService.submitScore(token, lineItemId, gradeObj);
};

async function getGrade(gradeService: GradeService, token: Optional<IdToken>) {
  if (!gradeService) return null;
  if (!token) return null;
  if (!token.platformContext.endpoint?.lineitem) return null;
  const lineItemId = token.platformContext.endpoint.lineitem;
  const { scores } = await gradeService.getScores(token, lineItemId, {
    userId: token.user,
  });
  return scores.at(0) ?? null;
}
