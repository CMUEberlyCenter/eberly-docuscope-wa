/** @fileoverview Accessing LTI 1.3 information. */

import { bind } from '@react-rxjs/core';
import { BehaviorSubject, catchError, filter, of, switchMap } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import type { WritingTask } from '../../lib/WritingTask';

type LtiInfo = {
  instructor: boolean;
  resource: {
    title?: string;
    description?: string;
    id: string;
  };
  userInfo?: {
    given_name?: string;
    family_name?: string;
    name?: string;
    email?: string;
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
  if (!ltik) {
    throw new Error('Missing LTI key.');
  }
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
  lti.pipe(
    filter((v) => v), // only if in LTI mode
    switchMap(() =>
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
      )
    )
  ),
  null
);

// Reassigning is done via deeplinking.
