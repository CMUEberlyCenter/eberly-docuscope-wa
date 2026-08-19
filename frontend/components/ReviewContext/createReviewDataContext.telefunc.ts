import { type TelefuncContext } from '#lib/TelefuncContext.js';
import { logger } from '#server/logger.js';
import { grade, isStudent, isTestUser } from '#server/model/lti.js';
import { getContext } from 'telefunc';

type ReviewGradeData = {
  /** The tool use that initiated the grading request. */
  tool: string;
  /** The writing task ID. */
  task_id?: string;
  /** Approximate text length of student submission. */
  input_length?: number;
}

/**
 * Issue a grade for a student's work based on the review tool used.
 * Current paradigm is that a grade of 1.0 indicates that at least one review tool was used.
 * @param score - The score to assign.
 * @param customData - Additional data for the line item.
 * @returns A promise resolving to a Score or null.
 */
export async function onGrade(score: number, customData?: ReviewGradeData) {
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
