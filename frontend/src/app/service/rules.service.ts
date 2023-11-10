import { bind } from '@react-rxjs/core';
import { catchError, of, switchMap } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { Configuration } from '../../lib/Configuration';
import { assignmentId } from './lti.service';

const ruleUrl = new URL(
  `/api/v1/assignments/${assignmentId()}/configuration`,
  location.href
);
// TODO: add lti token/session
export const rules = fromFetch(ruleUrl.toString()).pipe(
  switchMap(async (response) => {
    if (!response.ok) {
      throw new Error(`Bad response: ${response.status}`);
    }
    const config: Configuration = await response.json();
    return config;
  }),
  catchError((err) => {
    // Network or other error, handle appropriately
    console.error(err);
    return of(null);
  }),
);

export const [useRules, rule$] = bind<Configuration | null>(rules, null);
