import { type JsonValue } from '#/index';
import { type TelefuncContext } from '#lib/TelefuncContext.js';
import { logger } from '#server/logger.js';
import { grade, isStudent, isTestUser } from '#server/model/lti.js';
import { getContext } from 'telefunc';

export async function onGrade(score: number, customData?: JsonValue) {
  const { gradeService, session } = getContext<TelefuncContext>();
  if (!session?.token || !gradeService) {
    return null; // no-op if no token is present, as grading requires a valid LTI token.
  }
  const { token } = session;
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
