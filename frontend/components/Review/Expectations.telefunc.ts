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
  if (!token || !gradeService) {
    return null; // no-op if no token is present, as grading requires a valid LTI token.
  }
  if (isStudent(token)) {
    // Only attempt to grade if the user is a student.
    if (isTestUser(token)) {
      logger.info(
        `Test user grading with score: ${score} and customData: ${JSON.stringify(customData)}`
      );
    }
    try {
      return grade(gradeService, token, score, customData);
    } catch (error) {
      logger.error('Error in onGrade telefunc:', error);
      return null; // or consider throwing an error or returning a specific error response
    }
  }
  // TODO handle instructor grading if support for grade adjustment is needed.
  return null;
}
