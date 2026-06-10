import { JsonValue } from '#/index';
import { logger } from '#server/logger.js';
import { grade, isStudent, isTestUser } from '#server/model/lti.js';
import { GradeService, IdToken } from 'ltijs';
import { getContext } from 'telefunc';

export async function onGrade(
  token: IdToken,
  score: number,
  customData?: JsonValue
) {
  if (!token) {
    logger.warn('Attempted to grade without a token'); // TODO remove this line for production.
    return null;
  }
  if (isTestUser(token)) {
    // NOOP for test users, but log the grading attempt for debugging purposes.
    logger.info(
      `Test user grading with score: ${score} and customData: ${JSON.stringify(customData)}`
    );
    return null; // or consider returning a specific response for test users
  }
  if (isStudent(token)) {
    // Only attempt to grade if the user is a student.
    try {
      const { gradeService } = getContext<{ gradeService: GradeService }>();
      logger.info(
        `Grading review with score: ${score} and customData: ${JSON.stringify(customData)}, token: ${!!token}, service: ${!!gradeService} `
      );
      return grade(gradeService, token, score, customData);
    } catch (error) {
      logger.error('Error in onGrade telefunc:', error);
      return null; // or consider throwing an error or returning a specific error response
    }
  }
  // TODO handle instructor grading if support for grade adjustment is needed.
  logger.warn('Attempted to grade with a non-student token:', {
    token,
  }); // TODO remove this line for production.
  return null;
}
