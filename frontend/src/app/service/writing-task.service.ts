import { bind } from '@react-rxjs/core';
import { BehaviorSubject, of, switchMap } from 'rxjs';
import useSWR from 'swr';
import { WritingTask } from '../../lib/WritingTask';
import DocuScopeRules from '../lib/DocuScopeRules';
import { fetcher } from './fetcher';

const writing_tasks = new URL('/api/v2/writing_tasks', location.href);
/**
 * Retrieve the public writing tasks.
 * @returns a list of publicly available writing tasks.
 */
export function useWritingTasks() {
  return useSWR(writing_tasks, fetcher<WritingTask[]>);
}

/** The current writing task specification */
export const writingTask = new BehaviorSubject<WritingTask | null>(null);
export const [useWritingTask, writingTask$] = bind(writingTask, null);

/** The current set of DocuScopeRules based on the current writing task. */
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
