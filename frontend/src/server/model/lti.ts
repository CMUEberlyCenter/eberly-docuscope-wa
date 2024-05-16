export type ContextToken = {
  contextId: string;
  user: string;
  roles: string[];
  path: string;
  targetLinkUri: string;
  context: {
    id: string;
    label?: string;
    title?: string;
    type?: string[]; // ContextType
  };
  resource: {
    title?: string;
    description?: string;
    id: string;
  }
}

export type IdToken = {
  iss: string;
  user: string;
  userInfo?: {
    given_name?: string;
    family_name?: string;
    name?: string;
    email?: string;
  }
  platformInfo?: {
    product_family_code: string;
    version: string;
    guid: string;
    name: string;
    description: string;
  };
  clientId: string;
  platformId: string;
  deploymentId: string;
  platformContext: ContextToken;
}

export function isInstructor(token: ContextToken): boolean {
  return [
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'
  ].some(role => token.roles.includes(role));
}

// export function isStudent(token: ContextToken): boolean {
//   return [
//     "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
//   ].some(role => token.roles.includes(role));
// }
