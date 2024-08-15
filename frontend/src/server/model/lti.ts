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
  };
};

export type IdToken = {
  iss: string;
  user: string;
  userInfo?: {
    given_name?: string;
    family_name?: string;
    name?: string;
    email?: string;
  };
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
};

export function isInstructor(token: ContextToken): boolean {
  return ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'].some(
    (role) => token.roles.includes(role)
  );
}

// export function isStudent(token: ContextToken): boolean {
//   return [
//     "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
//   ].some(role => token.roles.includes(role));
// }

type IconProps = {
  url: string; // URL
  width: number; // int
  height: number; // int
};

type WindowProps = {
  targetName?: string;
  width?: number; // int
  height?: number; // int
  windowReatures?: string; // comma-separated list
};
type StartEndDate = {
  startDateTime?: string; // ISO8601
  endDateTime?: string; // ISO8601
};

type LTI_Link = {
  type: 'link';
  url: string; // URL
  title?: string;
  text?: string;
  icon?: IconProps;
  thumbnail?: IconProps;
  embed?: string; // HTML fragment
  window?: WindowProps;
  iframe?: {
    src: string; // URL
    width?: number; // int
    height?: number; // int
  };
};

type LTI_ResourceLink = {
  type: 'ltiResourceLink';
  url?: string; // URL
  title?: string;
  text?: string;
  icon?: IconProps;
  thumbnail?: IconProps;
  window?: WindowProps;
  iframe?: {
    width?: number;
    height?: number;
  };
  custom?: Record<string, any>;
  lineItem?: {
    label?: string;
    scoreMaximum: number;
    resourceId?: string;
    tag?: string;
    gradesReleased?: boolean;
  };
  available?: StartEndDate;
  submission?: StartEndDate;
};

type LTI_File = {
  type: 'file';
  url: string; // URL
  title?: string;
  text?: string;
  icon?: IconProps;
  thumbnail?: IconProps;
  expiresAt?: string; // ISO8901
};

type LTI_HTMLFragment = {
  type: 'html';
  html: string; // HTML
  title?: string;
  text?: string;
};

type LTI_Image = {
  type: 'image';
  url: string; // URL
  title?: string;
  text?: string;
  icon?: IconProps;
  thumbnail?: IconProps;
  width?: number; // int
  height?: number; // int
};
export type ContentItemType =
  | LTI_Link
  | LTI_ResourceLink
  | LTI_File
  | LTI_HTMLFragment
  | LTI_Image;
