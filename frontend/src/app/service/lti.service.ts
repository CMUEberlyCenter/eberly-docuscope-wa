/** @fileoverview Accessing LTI 1.3 information. */

import { bind } from '@react-rxjs/core';
import { BehaviorSubject, catchError, of } from 'rxjs';
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
}

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

const isLti = (): boolean => {
  try {
    const key = getLtik();
    return !!key && Object.keys(key).length > 0;
  } catch {
    return false;
  }
};

const lti = new BehaviorSubject<boolean>(isLti());
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



// /**
//  *
//  */
// export function launch(forceStudent?: boolean) {
//   const ltiFields: Record<string, string> = window.serverContext?.lti ?? {};

//   // Change the role to student if forceStudent is set
//   if (forceStudent) {
//     ltiFields['roles'] = 'urn:lti:instrole:ims/lis/Student,Student';
//     ltiFields['ext_roles'] = 'urn:lti:instrole:ims/lis/Student,Student';
//   }

//   const element = document.getElementById('ltirelayform');
//   if (!element) return;
//   const relayform = element as HTMLFormElement;
//   relayform.innerHTML = '';

//   // Now transform the LTI fields into form elements
//   for (const key in ltiFields) {
//     if (Object.prototype.hasOwnProperty.call(ltiFields, key)) {
//       const ltiField = document.createElement('input');
//       ltiField.type = 'hidden';
//       ltiField.id = key;
//       ltiField.name = key;
//       ltiField.value = ltiFields[key];

//       relayform.appendChild(ltiField);
//     }
//   }

//   relayform.setAttribute('action', window.location.href);
//   relayform.submit();
//   relayform.style.visibility = 'hidden';
// }
