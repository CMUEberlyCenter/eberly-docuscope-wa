import { JsonValue } from "#/index";
import { logger } from "#server/logger.js";
import { grade } from "#server/model/lti.js";
import { GradeService, IdToken, } from "ltijs";
import { getContext } from "telefunc";

export async function gradeReview(token: IdToken, score: number, customData?: JsonValue) {
  try {
    const { gradeService } = getContext<{ gradeService: GradeService }>();
    logger.info(`Grading review with score: ${score} and customData: ${JSON.stringify(customData)}, token: ${!!token}, service: ${!!gradeService} `);
    return grade(gradeService, token, score, customData);
  } catch (error) {
    logger.error('Error in gradeReview telefunc:', error);
    return null; // or consider throwing an error or returning a specific error response
  }
}
