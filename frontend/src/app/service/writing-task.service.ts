import { bind } from '@react-rxjs/core';
import { BehaviorSubject, filter, map, switchMap } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import useSWR from 'swr';
import { WritingTask } from '../../lib/WritingTask';
import { fetcher } from './fetcher';
import { lti$, ltiInfo$ } from './lti.service';

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

function writingTaskIdFromParams() {
  const params = new URLSearchParams(location.search);
  return params.get('writing_task');
}

lti$
  .pipe(
    filter((v) => !v && !!writingTaskIdFromParams()),
    switchMap(() =>
      fromFetch(`${writing_tasks}/${writingTaskIdFromParams() ?? ''}`)
    )
  )
  .subscribe(async (response: Response) => {
    if (!response.ok) {
      console.error(response.statusText);
      // TODO add error WritingTask.
      return;
    }
    writingTask.next((await response.json()) as WritingTask);
  });

ltiInfo$.subscribe((lti_info) => {
  if (lti_info?.writing_task) {
    writingTask.next(lti_info.writing_task);
  }
});

export const [useSelectTaskAvailable, selectTaskAvailable$] = bind(
  ltiInfo$.pipe(
    map((info) => writingTaskIdFromParams() === null && !info?.writing_task)
  ),
  writingTaskIdFromParams() === null
);
