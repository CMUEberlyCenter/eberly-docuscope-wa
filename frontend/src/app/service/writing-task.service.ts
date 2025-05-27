import { bind } from '@react-rxjs/core';
import { BehaviorSubject, filter, map, switchMap } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import sanitizeHtml from 'sanitize-html';
import { Node } from 'slate';
import useSWR from 'swr';
import type { WritingTask } from '../../lib/WritingTask';
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

/** Serialization of an html string. */
const descriptionToSlate = (description: string): string => {
  // TODO add markings.
  return sanitizeHtml(description, { allowedTags: [] });
};

/** Transform writing task json to Slate editor content. */
export const taskToEditor = (task: WritingTask, details?: boolean): Node[] => [
  // { type: "heading-one", children: [{ text: task.info.name }] },
  ...(details
    ? [{ type: 'paragraph', children: [{ text: task.rules.overview }] }]
    : []),
  ...task.rules.rules.flatMap((rule) => [
    {
      type: 'heading-five',
      children: [{ text: rule.name }],
    },
    ...(details
      ? [
          {
            type: 'paragraph',
            children: [{ text: descriptionToSlate(rule.description) }],
          },
        ]
      : []),
    ...rule.children.flatMap((child) => [
      { type: 'heading-six', children: [{ text: child.name }] },
      ...(details
        ? [
            {
              type: 'paragraph',
              children: [{ text: descriptionToSlate(child.description) }],
            },
          ]
        : []),
    ]),
  ]),
];

/** Serialize to text for the clipboard. */
export const taskToClipboard = (
  task: WritingTask | null | undefined,
  includeDetails: boolean
): string => {
  if (!task) return '';
  const lines = includeDetails ? [task.rules.overview] : [];
  lines.push(
    ...task.rules.rules.flatMap((rule) => [
      rule.name,
      ...(includeDetails ? [descriptionToSlate(rule.description)] : []),
      ...rule.children.flatMap((cluster) => [
        '\t' + cluster.name,
        ...(includeDetails ? [descriptionToSlate(cluster.description)] : []),
      ]),
    ])
  );
  return lines.join('\n\n');
};
