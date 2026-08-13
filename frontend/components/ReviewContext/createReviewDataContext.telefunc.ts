import { JsonValue } from '#/index';
import { TelefuncContext } from '#lib/TelefuncContext.js';
import { logger } from '#server/logger.js';
import { grade, isStudent, isTestUser } from '#server/model/lti.js';
import { IdToken } from 'ltijs';
import { getContext } from 'telefunc';

export async function onGrade(
  token: IdToken,
  score: number,
  customData?: JsonValue
) {
  const { gradeService } = getContext<TelefuncContext>();
  if (!token) {
    // logger.warn('Attempted to grade without a token'); // TODO remove this line for production.
    return null; // no-op if no token is present, as grading requires a valid LTI token.
  }
  if (!gradeService) {
    logger.error('Grade service is not available in the context'); // TODO remove this line for production.
    return null; // no-op if the grade service is not available, as grading cannot proceed without it.
  }
  if (isTestUser(token)) {
    // NOOP for test users, but log the grading attempt for debugging purposes.
    logger.info(
      `Test user grading with score: ${score} and customData: ${JSON.stringify(customData)}`
    );
  }
  if (isStudent(token)) {
    // Only attempt to grade if the user is a student.
    try {
      // logger.info(
      //   `Grading review with score: ${score} and customData: ${JSON.stringify(customData)}`
      // );
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
