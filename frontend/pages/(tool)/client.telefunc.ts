import { getContext } from 'telefunc';
import { grade } from '#server/model/lti.js';
import { IdToken, Provider } from 'ltijs';
import { JsonValue } from '#/index';
import { logger } from '#server/logger.js';

export async function onGrade(score: number, customData?: JsonValue) {
  try {
    const { token } = getContext<{ token: IdToken }>();
    return grade(Provider.Grade, token, score, customData);
  } catch (error) {
    logger.error('Error in onGrade telefunc:', error);
    return null; // or consider throwing an error or returning a specific error response
  }
}
