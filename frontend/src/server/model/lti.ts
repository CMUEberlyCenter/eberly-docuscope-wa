import { JsonValue, Optional } from '#/index';
import { logger } from '#server/logger.js';
import type { PlatformContext, GradeService, IdToken, Score } from 'ltijs';

/*
// @deprecated
const LIS_System_Roles_Core = [
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator',
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#None',
];
// @deprecated
const LIS_System_Roles_NonCore = [
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#AccountAdmin',
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#Creator',
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#SysAdmin',
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#SysSupport',
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#User',
];
// @deprecated
const LIS_Institution_Roles_Core = [
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Guest',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#None',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Other',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student',
];
const LIS_Institution_Roles_NonCore = [
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Alumni',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Learner',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Member',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Mentor',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Observer',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#ProspectiveStudent',
];
const LIS_Context_Roles_Core = [
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor',
];
const LIS_Context_Roles_NonCore = [
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Manager',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Member',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Officer',
];

const LIS_Sub_Roles = [
  ...['Administrator', 'Developer', 'ExternalDeveloper', 'ExternalSupport', 'ExternalSystemAdministrator', 'Support'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#${sub}`),
  ...['ContentDeveloper', 'ContentExpert', 'ExternalContentExpert', 'Librarian'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/ContentDeveloper#${sub}`),
  ...['ExternalInstructor',
    'Grader',
    'GuestInstructor',
    'Lecturer',
    'PrimaryInstructor',
    'SecondaryInstructor',
    'TeachingAssistant',
    'TeachingAssistantGroup',
    'TeachingAssistantOffering',
    'TeachingAssistantSection',
    'TeachingAssistantSectionAssociation',
    'TeachingAssistantTemplate'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#${sub}`),
  ...['ExternalLearner', 'GuestLearner', 'Instructor', 'Learner', 'NonCreditLearner'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Learner#${sub}`),
  ...['AreaManager',
    'CourseCoordinator',
    'ExternalObserver',
    'Manager',
    'Observer'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Manager#${sub}`),
  ...['Member'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Member#${sub}`),
  ...['Advisor',
    'Auditor',
    'ExternalAdvisor',
    'ExternalAuditor',
    'ExternalLearningFacilitator',
    'ExternalMentor',
    'ExternalReviewer',
    'ExternalTutor',
    'LearningFacilitator',
    'Mentor',
    'Reviewer',
    'Tutor'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Mentor#${sub}`),
  ...['Chair', 'Communications', 'Secretary', 'Treasurer', 'Vice-Chair'].map(sub => `http://purl.imsglobal.org/vocab/lis/v2/membership/Officer#${sub}`),
];
*/
const LTI_Test_User = 'http://purl.imsglobal.org/vocab/lti/system/person#TestUser';

export function isTestUser(token: IdToken): boolean {
  return token.platformContext.roles.includes(LTI_Test_User);
}
export function isInstructor(token: IdToken): boolean {
  return (
    ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'].some(
      (role) => token.platformContext.roles.includes(role)
    )
  );
}

export function isStudent(token: IdToken): boolean {
  return [
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
  ].some(role => token.platformContext.roles.includes(role));
}

export function isContentDeveloper(token: IdToken): boolean {
  return ['http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper'].some(
    (role) => token.platformContext.roles.includes(role)
  );
}

// export function isTorus(token?: IdToken): boolean {
//   return !!token && token.platformInfo?.guid === 'true';
// }

export const MAX_SCORE = 1.0; // Using undefined, 0 (openned), and 1 (used at least one tool)

const createLineItem = async (
  gradeService: GradeService,
  token: IdToken
): Promise<string> => {
  try {
    console.log(
      'Creating line item for resource link:',
      token.platformContext.resource.id
    );
    // Check if a line item already exists for this resource link
    const response = await gradeService.getLineItems(token, {
      resourceLinkId: true,
    });
    const lineItemId = response.lineItems.at(0)?.id;
    if (lineItemId) {
      // If a line item already exists for this resource link, use it.
      return lineItemId;
    }
    const newLineItem = await gradeService.createLineItem(token, {
      scoreMaximum: MAX_SCORE,
      label: 'myProse Score',
      resourceId: token.platformContext.resource.id,
    });
    return newLineItem.id!;
  } catch (err) {
    logger.error('Error creating line item:', { error: err });
    throw new Error('Failed to create line item for grade submission.', {
      cause: err,
    });
  }
};

const getLineItemId = async (
  gradeService: GradeService,
  token: IdToken
): Promise<string> => {
  return (
    token.platformContext.endpoint?.lineitem ||
    createLineItem(gradeService, token)
  );
};

export const startGrading = async (
  gradeService: GradeService,
  token: Optional<IdToken>
) => {
  if (!gradeService) return null;
  if (!token) return null;
  const existingGrade = await getGrade(gradeService, token);
  if (existingGrade) {
    // Don't update the grade if it already exists.
    return;
  }
  const lineItemId = await getLineItemId(gradeService, token);
  const gradeObj: Score = {
    userId: token.user,
    activityProgress: 'InProgress',
    gradingProgress: 'NotReady',
  };
  return gradeService.submitScore(token, lineItemId, gradeObj);
};

export const grade = async (
  gradeService: GradeService,
  token: Optional<IdToken>,
  score: number,
  customData?: JsonValue
) => {
  if (!gradeService) return null;
  if (!token) return null;
  // Check if a line item already exists for this resource link, and if so, get the existing grade.
  const existingGrade = await getGrade(gradeService, token);
  console.log('Existing grade:', existingGrade);
  if (
    existingGrade?.scoreGiven !== undefined &&
    existingGrade.scoreGiven >= score
  ) {
    console.log("non-clobbering grading");
    // Don't update the grade if the new score is not higher than the existing score.
    return existingGrade;
  }
  const lineItemId = await getLineItemId(gradeService, token);
  console.log(
    'Submitting grade with lineItemId:',
    lineItemId,
    'score:',
    score,
    'customData:',
    customData
  );
  const gradeObj: Score = {
    userId: token.user,
    scoreGiven: score * 1.0, // ensure it is a float, as some LTI platforms may require a decimal value for the score, even if it is a whole number.
    scoreMaximum: MAX_SCORE,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
    'https://docuscope-sc.eberly.cmu.edu/myprose/score': customData,
  };
  return gradeService.submitScore(token, lineItemId, gradeObj);
};

async function getGrade(gradeService: GradeService, token: Optional<IdToken>) {
  if (!gradeService) return null;
  if (!token) return null;
  if (!token.platformContext.endpoint?.lineitem) return null;
  const lineItemId = token.platformContext.endpoint.lineitem;
  const { scores } = await gradeService.getScores(token, lineItemId, {
    userId: token.user,
  });
  console.log(scores); // Check if need to better handle multiple scores.
  return scores.at(0) ?? null;
}
