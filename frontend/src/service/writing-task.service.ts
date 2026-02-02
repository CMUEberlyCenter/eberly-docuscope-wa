import useSWR from 'swr';
import type { WritingTask } from '../lib/WritingTask';

// TODO: add lti token/session
async function fetcher<T>(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<T> {
  const res = await fetch(input, {
    headers: {
      Accept: 'application/json',
    },
    ...init,
  });
  if (!res.ok) {
    console.error(`Server error ${res.status} - ${res.statusText}`);
    throw new Error(res.statusText);
  }
  return res.json() as T;
}

const writing_tasks = new URL('/api/v2/writing_tasks', location.href);
/**
 * Retrieve the public writing tasks.
 * @returns a list of publicly available writing tasks.
 */
export function useWritingTasks() {
  return useSWR(writing_tasks, fetcher<WritingTask[]>);
}
