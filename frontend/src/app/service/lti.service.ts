/** @fileoverview Accessing LTI 1.3 information. */

import { bind } from '@react-rxjs/core';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';
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
    return !!key && key.length > 0;
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
export const getLtiRequest = (): RequestInit => {
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

export const [useLtiInfo, ltiInfo$] = bind(
  fromFetch('/lti/info', {
    ...getLtiRequest(),
    // selector: (r) => r.json(),
  }).pipe(
    switchMap(async (response: Response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      // check for form
      return (await response.json()) as LtiInfo;
    }),
    catchError(() => of(null))
  ),
  null
);
ltiInfo$.subscribe((lti_info) => {
  if (lti_info?.writing_task) {
    writingTask.next(lti_info.writing_task);
  }
});

export const [useSelectTaskAvailable, selectTaskAvailable$] = bind(
  ltiInfo$.pipe(map((info) => !info?.writing_task)),
  false
);

// Reassigning is done via deeplinking.
