import { bind } from '@react-rxjs/core';
import { BehaviorSubject, of, switchMap } from 'rxjs';
import useSWR from 'swr';
import { WritingTask } from '../../lib/WritingTask';
import DocuScopeRules from '../lib/DocuScopeRules';
import { fetcher } from './fetcher';

const writing_tasks = new URL('/api/v2/writing_tasks', location.href);
export function useWritingTasks() {
  return useSWR(writing_tasks, fetcher<WritingTask[]>);
}

export const writingTask = new BehaviorSubject<WritingTask | null>(null);

export const [useWritingTask, writingTask$] = bind(writingTask, null);
// const ruleUrl = new URL(
//   `/api/v1/assignments/${assignmentId()}/configuration`,
//   location.href
// );

// export function useConfiguration() {
//   return useSWR(ruleUrl, fetcher<WritingTask>);
// }

// export const rules = fromFetch(ruleUrl.toString()).pipe(
//   switchMap(async (response) => {
//     if (!response.ok) {
//       throw new Error(`Bad response: ${response.status}`);
//     }
//     const config: WritingTask = await response.json();
//     const dsRules = new DocuScopeRules();
//     dsRules.load(config);
//     return dsRules;
//   }),
//   catchError((err) => {
//     // Network or other error, handle appropriately
//     console.error(err);
//     return of(null);
//   })
// );

export const [useRules, rules$] = bind<DocuScopeRules | null>(
  writingTask.pipe(
    switchMap((task) => {
      if (task) {
        const rules = new DocuScopeRules();
        rules.load(task);
        return of(rules);
      }
      return of(null);
    })
  ),
  null
);
