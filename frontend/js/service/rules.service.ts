import { fromFetch } from "rxjs/fetch";
import { courseId } from "./lti.service";
import { catchError, map, of, switchMap } from "rxjs";
import DocuScopeRules from "../DocuScopeRules";

const ruleUrl = new URL(`/api/v1/rules`);
ruleUrl.searchParams.append('course_id', courseId());
export const rules = fromFetch(ruleUrl.toString()).pipe(
  switchMap(response => {
    if (response.ok) {
      return response.json();
    }
    return of({ error: true, message: `Error ${ response.status }` });
  }),
  catchError(err => {
    // Network or other error, handle appropriately
    console.error(err);
    return of({ error: true, message: err.message })
  }),
  map(response => {
    const dsrules = new DocuScopeRules();
    dsrules.setContext(courseId());
    dsrules.load(response);
    return dsrules;
  } )
);
