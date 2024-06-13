/** @fileoverview Accessing LTI 1.3 information. */

import { bind } from '@react-rxjs/core';
import { BehaviorSubject, catchError, combineLatest, filter, of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { WritingTask } from '../../lib/WritingTask';
import { writingTask } from './writing-task.service';

type LtiInfo = {
  instructor: boolean;
  resource: {
    title?: string;
    description?: string;
    id: string;
  };
  writing_task?: WritingTask;
};

/**
 * Retrieves the LTI authentication token.
 * @returns LTI token string.
 */
const getLtik = (): string => {
  const searchParams = new URLSearchParams(window.location.search);
  const ltik = searchParams.get('ltik');
  if (!ltik) throw new Error('Missing lti key.');
  return ltik;
};

/**
 * Test if this is a LTI context.
 * @returns true if a LTI token exists.
 */
const isLti = (): boolean => {
  try {
    const key = getLtik();
    return !!key && Object.keys(key).length > 0;
  } catch {
    return false;
  }
};

const lti = new BehaviorSubject<boolean>(isLti());
/** True if detected that this is a LTI context. */
export const [useLti, lti$] = bind(lti, isLti());

/**
 * Construct the request parameters that includes the LTI credentials
 * @returns Request parameters with included credentials.
 */
const getLtiRequest = (): RequestInit => {
  try {
    return {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${getLtik()}`,
      },
    };
  } catch {
    return {};
  }
};

export const [useLtiInfo, assignment$] = bind(
  fromFetch<LtiInfo>('/lti/info', {
    ...getLtiRequest(),
    selector: (r) => r.json(),
  }).pipe(catchError(() => of(null))),
  null
);
assignment$.subscribe((lti_info) => {
  if (lti_info?.writing_task) {
    writingTask.next(lti_info.writing_task);
  }
});

// When in LTI context and the user has modification rights, set
// the writing task for the assignment.
combineLatest({
  task: writingTask,
  lti_info: assignment$,
})
  .pipe(filter(({ lti_info }) => lti_info !== null && lti_info.instructor))
  .subscribe(async ({ task }) => {
    try {
      const data = new FormData();
      data.append('file', JSON.stringify(task));
      const response = await fetch('/api/v2/assignments', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        throw new Error(await response.json());
      }
    } catch (error) {
      console.error(error);
      // TODO report error.
    }
  });
