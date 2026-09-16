import { type TelefuncContext } from '#lib/TelefuncContext';
import { logger } from '#server/logger';
import { grade, isStudent, isTestUser } from '#server/model/lti';
import { getContext } from 'telefunc';

type ExpectationGradeData = {
  /** The tool use that initiated the grading request. */
  tool: string;
  /** The writing task ID. */
  task_id?: string;
  /** Approximate text length of student submission. */
  input_length?: number;
  /** The expectation being evaluated. */
  expectation: string;
};

/* NOTE: the generic JSON type does not work with automatic shield generation. */

/**
 * Issue a grade for a student's work based on the expectation.
 * Current paradigm is that a grade of 1.0 indicates that at least one review tool was used.
 * @param score - The score to assign.
 * @param customData - Additional data for the line item.
 * @returns A promise resolving to a Score or null.
 */
export async function onGrade(
  ltik: string | null | undefined,
  score: number,
  customData?: ExpectationGradeData
) {
  if (!ltik) {
    return null; // no-op if no token is present, as grading requires a valid LTI token.
  }
  const { provider } = getContext<TelefuncContext>();
  const launchContext = await provider?.getLaunchContext(ltik);
  if (!launchContext) {
    logger.warn('Launch context not found for provided LTI token.');
    return null; // no-op if launch context is not found.
  }
  if (!launchContext.grading.isAvailable()) {
    // TODO remove as grade checks this
    logger.info(
      'Grading service is not available (governed by platform settings).'
    );
    return null; // no-op if grading service is not available.
  }
  if (isStudent(launchContext.idToken)) {
    // Only attempt to grade if the user is a student.
    if (isTestUser(launchContext.idToken)) {
      logger.info(
        `Test user grading with score: ${score} and customData: ${JSON.stringify(customData)}`
      );
    }
    try {
      return grade(launchContext, score, customData);
    } catch (error) {
      logger.error('Error in onGrade telefunc:', error);
      return null; // or consider throwing an error or returning a specific error response
    }
  }
  // TODO handle instructor grading if support for grade adjustment is needed.
  return null;
}
