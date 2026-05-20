import { getContext } from 'telefunc';
import { grade } from '#server/model/lti.js';
import { IdToken, Provider } from 'ltijs';
import { JsonValue } from '#/index';

export async function onGrade(score: number, customData?: JsonValue) {
  const { token } = getContext<{ token: IdToken }>();
  return grade(Provider.Grade, token, score, customData);
}
