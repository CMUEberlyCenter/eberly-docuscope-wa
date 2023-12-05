/** @fileoverview Accessing LTI 1.0 settings from injected global variable. */

// Typing for injected variable.
declare const window: {
  serverContext?: {
    lti?: {
      roles?: string;
      ext_roles?: string;
      custom_canvas_course_id?: string;
      ext_lti_assignment_id?: string;
      resource_link_id?: string;
    };
  };
} & Window;

// All possible student role identifiers.
const studentRoles = new Set(['urn:lti:instrole:ims/lis/Student', 'Student']);
/**
 * Check if on of the student roles is in the list of user roles.
 * @returns true if one of the roles is a student role.
 */
export function isStudent(): boolean {
  return (
    window.serverContext?.lti?.roles
      ?.split(',')
      .some((r) => studentRoles.has(r)) ?? false
  );
}

// All possible instructor role identifiers.
const instructorRoles = new Set([
  'urn:lti:instrole:ims/lis/Instructor',
  'urn:lti:instrole:ims/lis/Administrator',
  'Instructor',
]);
/**
 * Checks the user's roles against the set of instructor roles.
 * @returns true if one of the user's roles is an instructor role.
 */
export function isInstructor(): boolean {
  return (
    window.serverContext?.lti?.roles
      ?.split(',')
      .some((r) => instructorRoles.has(r)) ?? false
  );
}

/**
 * Retrieve the course identifier.
 * @returns the assignment identifier.
 */
export function assignmentId(): string {
  return (
    window.serverContext?.lti?.ext_lti_assignment_id ??
    window.serverContext?.lti?.resource_link_id ??
    'global'
  );
}

/**
 *
 */
export function launch(forceStudent?: boolean) {
  const ltiFields: Record<string, string> = window.serverContext?.lti ?? {};

  // Change the role to student if forceStudent is set
  if (forceStudent) {
    ltiFields['roles'] = 'urn:lti:instrole:ims/lis/Student,Student';
    ltiFields['ext_roles'] = 'urn:lti:instrole:ims/lis/Student,Student';
  }

  const element = document.getElementById('ltirelayform');
  if (!element) return;
  const relayform = element as HTMLFormElement;
  relayform.innerHTML = '';

  // Now transform the LTI fields into form elements
  for (const key in ltiFields) {
    if (Object.prototype.hasOwnProperty.call(ltiFields, key)) {
      const ltiField = document.createElement('input');
      ltiField.type = 'hidden';
      ltiField.id = key;
      ltiField.name = key;
      ltiField.value = ltiFields[key];

      relayform.appendChild(ltiField);
    }
  }

  relayform.setAttribute('action', window.location.href);
  relayform.submit();
  relayform.style.visibility = 'hidden';
}
