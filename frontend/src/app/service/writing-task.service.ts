import { bind } from '@react-rxjs/core';
import { BehaviorSubject } from 'rxjs';
import useSWR from 'swr';
import { WritingTask } from '../../lib/WritingTask';
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
