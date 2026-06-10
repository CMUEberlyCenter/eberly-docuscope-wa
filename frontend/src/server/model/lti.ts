import type { PlatformContext } from 'ltijs';

export function isInstructor(token?: PlatformContext): boolean {
  return (
    !!token &&
    ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'].some(
      (role) => token.roles.includes(role)
    )
  );
}

// export function isStudent(token: ContextToken): boolean {
//   return [
//     "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
//   ].some(role => token.roles.includes(role));
// }
