import { fromFetch } from 'rxjs/fetch';
import { Configuration } from '../../lib/Configuration';
import { fetcher } from './fetcher';
import { assignmentId } from './lti.service';
import useSWR from 'swr';
import { catchError, of, switchMap } from 'rxjs';
import { bind } from '@react-rxjs/core';
import DocuScopeRules from '../lib/DocuScopeRules';

const ruleUrl = new URL(
  `/api/v1/assignments/${assignmentId()}/configuration`,
  location.href
);

export function useConfiguration() {
  return useSWR(ruleUrl, fetcher<Configuration>);
}

export const rules = fromFetch(ruleUrl.toString()).pipe(
  switchMap(async (response) => {
    if (!response.ok) {
      throw new Error(`Bad response: ${response.status}`);
    }
    const config: Configuration = await response.json();
    const dsRules = new DocuScopeRules();
    dsRules.load(config);
    return dsRules;
  }),
  catchError((err) => {
    // Network or other error, handle appropriately
    console.error(err);
    return of(null);
  })
);

export const [useRules, rules$] = bind<DocuScopeRules | null>(rules, null);
