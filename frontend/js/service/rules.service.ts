import { fromFetch } from 'rxjs/fetch';
import { assignmentId } from './lti.service';
import { catchError, map, of, switchMap } from 'rxjs';
import DocuScopeRules from '../DocuScopeRules';
import { bind } from '@react-rxjs/core';

const ruleUrl = new URL(`/api/v1/rules`, location.href);
ruleUrl.searchParams.append('course_id', assignmentId());
export const rules = fromFetch(ruleUrl.toString()).pipe(
  switchMap((response) => {
    if (response.ok) {
      return response.json();
    }
    return of({ error: true, message: `Error ${response.status}` });
  }),
  catchError((err) => {
    // Network or other error, handle appropriately
    console.error(err);
    return of({ error: true, message: err.message });
  }),
  map((response) => {
    const dsrules = new DocuScopeRules();
    dsrules.setContext(assignmentId());
    dsrules.load(response.data);
    return dsrules;
  })
);

export const [useRules, rule$] = bind<DocuScopeRules | null>(rules, null);
