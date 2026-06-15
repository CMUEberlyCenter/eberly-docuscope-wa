import { Optional } from '..';
import { type OnTopicData } from './OnTopicData';

export type ReviewPrompt =
  | 'civil_tone'
  | 'credibility'
  | 'expectations'
  | 'lines_of_arguments'
  | 'logical_flow'
  | 'paragraph_clarity'
  | 'professional_tone'
  | 'prominent_topics'
  | 'sources';

export const BasicReviewPrompts: ReviewPrompt[] = [
  'civil_tone',
  'credibility',
  'lines_of_arguments',
  'logical_flow',
  'paragraph_clarity',
  'professional_tone',
  'prominent_topics',
  'sources',
];

export type ReviewTool =
  | ReviewPrompt
  | 'expectations'
  | 'sentence_density'
  | 'term_matrix'
  | 'ontopic'
  | 'docuscope';

type GeneralAssessment = {
  assessment: {
    /** A brief comment on the strenghts. */
    strengths: string;
    /** A brief comment on the weaknesses. */
    weaknesses: string;
  };
};

/** Check if the data has a valid general assessment. */
export function isAssessment(data: unknown): data is GeneralAssessment {
  return (
    !!data &&
    typeof data === 'object' &&
    'assessment' in data &&
    !!data.assessment &&
    typeof data.assessment === 'object' &&
    'strengths' in data.assessment &&
    'weaknesses' in data.assessment
  );
}

/** List of identified civility issues in the text. */
type CivilToneOutput = {
  /** Identified inappropriate text segment from the input text. */
  text: string;
  /** One sentence assessment about the use of uncivil tone. */
  assessment: string;
  /** One sentence suggestion describing how the text can be improved. */
  suggestion: string;
  /** The id of the span element for the sentence from the input text that was identified as having tone issues. */
  sent_id: string;
}[];
// function isCivilToneOutput(data: unknown): data is CivilToneOutput {
//   return (
//     !!data &&
//     Array.isArray(data) &&
//     data.every(
//       (item) =>
//         typeof item === 'object' &&
//         item !== null &&
//         'text' in item &&
//         typeof item.text === 'string' &&
//         'assessment' in item &&
//         typeof item.assessment === 'string' &&
//         'suggestion' in item &&
//         typeof item.suggestion === 'string' &&
//         'sent_id' in item &&
//         typeof item.sent_id === 'string'
//     )
//   );
// }

/** List of identified credibility issues in the text */
type CredibilityOutput = {
  /** One sentence assessment about the credibility issue. */
  issue: string;
  /** One sentence suggestion describing how the text can be improved. */
  suggestion: string;
  /** A list of IDs for the sentences containing the credibility issue. */
  sent_ids: string[];
}[];
// function isCredibilityOutput(data: unknown): data is CredibilityOutput {
//   return (
//     !!data &&
//     Array.isArray(data) &&
//     data.every(
//       (item) =>
//         typeof item === 'object' &&
//         item !== null &&
//         'issue' in item &&
//         typeof item.issue === 'string' &&
//         'suggestion' in item &&
//         typeof item.suggestion === 'string' &&
//         'sent_ids' in item &&
//         Array.isArray(item.sent_ids) &&
//         item.sent_ids.every((id: unknown) => typeof id === 'string')
//     )
//   );
// }

/** Assessment of whether the input text meets the expectations. */
export type ExpectationsOutput = {
  /** A list of IDs for the sentences adressing the expectation. */
  sent_ids: string[];
  /** An explanation of of what is working and/or possible issues, if any. */
  assessment: string;
  /** A brief suggestion for meeting the expectation better. */
  suggestion: string;
  /** True if the text sufficiently addresses the expectation. */
  expectation_met?: boolean;
};
export function isExpectationsOutput(
  data: unknown
): data is ExpectationsOutput {
  return (
    !!data &&
    typeof data === 'object' &&
    'sent_ids' in data &&
    Array.isArray(data.sent_ids) &&
    'suggestion' in data &&
    typeof data.suggestion === 'string' &&
    'assessment' in data &&
    typeof data.assessment === 'string'
  );
}

export type Claim = {
  /** A brief description of the claim. */
  claim: string;
  /** A list of evidence supporting the claim. */
  support: string[];
  /** A list of span element IDs from the input text containing the sentences stating the claim. */
  claim_sent_ids: string[];
  /** A list of span element IDs from the input text containing the sentences that support the claim. */
  support_sent_ids: string[];
  /** One sentence suggestion describing how the text may be improved. */
  suggestion?: string;
  /** One sentence description of how suggested revisions will strengthen the thesis. */
  impact?: string;
};
// function isClaim(data: unknown): data is Claim {
//   return (
//     !!data &&
//     typeof data === 'object' &&
//     'claim' in data &&
//     typeof data.claim === 'string' &&
//     'support' in data &&
//     Array.isArray(data.support) &&
//     data.support.every((s) => typeof s === 'string') &&
//     'claim_sent_ids' in data &&
//     Array.isArray(data.claim_sent_ids) &&
//     data.claim_sent_ids.every((id) => typeof id === 'string') &&
//     'support_sent_ids' in data &&
//     Array.isArray(data.support_sent_ids) &&
//     data.support_sent_ids.every((id) => typeof id === 'string') &&
//     ('suggestion' in data ? typeof data.suggestion === 'string' : true) &&
//     ('impact' in data ? typeof data.impact === 'string' : true)
//   );
// }

/** JSON structure for the results of the arguments prompt. */
type LinesOfArgumentsOutput = {
  /** A brief description of the thesis. */
  thesis: string;
  /** A list of identified rhetorical and persuasive strategies used by the author of the text. */
  strategies: string[];
  /** List of span ids for sentences that present the central position of the text. */
  sent_ids?: string[];
  /** List of identified claims that supports the thesis. */
  claims: Claim[];
} & Partial<GeneralAssessment>;
// function isLinesOfArgumentsOutput(
//   data: unknown
// ): data is LinesOfArgumentsOutput {
//   return (
//     !!data &&
//     typeof data === 'object' &&
//     'thesis' in data &&
//     typeof data.thesis === 'string' &&
//     'strategies' in data &&
//     Array.isArray(data.strategies) &&
//     data.strategies.every((s) => typeof s === 'string') &&
//     ('sent_ids' in data
//       ? Array.isArray(data.sent_ids) &&
//         data.sent_ids.every((id) => typeof id === 'string')
//       : true) &&
//     'claims' in data &&
//     Array.isArray(data.claims) &&
//     data.claims.every((claim) => isClaim(claim)) &&
//     ('assessment' in data ? isAssessment(data) : true)
//   );
// }

/** List of identified logical flow issues (i.e., disruptions). */
type LogicalFlowOutput = {
  /** One sentence assessment about the disruption. */
  issue: string;
  /** One sentence suggestion describing how the text may be improved. */
  suggestion: string;
  /** A list of span element IDs from the input text containing the sentences related to the issue. */
  sent_ids: string[];
  /** A list of p element IDs from the input text for the paragraphs related to the issue. */
  para_ids: string[];
}[];
// function isLogicalFlowOutput(data: unknown): data is LogicalFlowOutput {
//   return (
//     !!data &&
//     Array.isArray(data) &&
//     data.every(
//       (item) =>
//         typeof item === 'object' &&
//         item !== null &&
//         'issue' in item &&
//         typeof item.issue === 'string' &&
//         'suggestion' in item &&
//         typeof item.suggestion === 'string' &&
//         'sent_ids' in item &&
//         Array.isArray(item.sent_ids) &&
//         item.sent_ids.every((id: unknown) => typeof id === 'string') &&
//         'para_ids' in item &&
//         Array.isArray(item.para_ids) &&
//         item.para_ids.every((id: unknown) => typeof id === 'string')
//     )
//   );
// }

/** List of identified paragraph clarity issues. */
type ParagraphClarityOutput = {
  /** One sentence assessment about the paragraph clarity issue. */
  issue: string;
  /** One sentence suggestion describing how the text may be improved. */
  suggestion: string;
  /** A list of span element IDs from the input text containing the sentences related to the issue. */
  sent_ids: string[];
  /** p element ID from the input text for the paragraphs related to the issue. */
  para_id: string;
}[];
// function isParagraphClarityOutput(
//   data: unknown
// ): data is ParagraphClarityOutput {
//   return (
//     !!data &&
//     Array.isArray(data) &&
//     data.every(
//       (item) =>
//         typeof item === 'object' &&
//         item !== null &&
//         'issue' in item &&
//         typeof item.issue === 'string' &&
//         'suggestion' in item &&
//         typeof item.suggestion === 'string' &&
//         'sent_ids' in item &&
//         Array.isArray(item.sent_ids) &&
//         item.sent_ids.every((id: unknown) => typeof id === 'string') &&
//         'para_id' in item &&
//         typeof item.para_id === 'string'
//     )
//   );
// }

/** List of identified professional tone issues. */
export type ProfessionalToneOutput = {
  /** A text segment with inappropriate tone.*/
  text: string;
  /** An ID of a sentence (<span> element) from the input text that contains the text segment with inappropriate tone, e.g., 'p1s1'. */
  sent_id: string;
  /** One sentence assessment about the professional tone issue. */
  issue: string;
  /** One sentence suggestion describing how the text may be improved. */
  suggestion: string;
  /** Classification of the tone problem. */
  tone_type: 'confidence' | 'subjectivity' | 'emotional';
}[];
// function isProfessionalToneOutput(
//   data: unknown
// ): data is ProfessionalToneOutput {
//   return (
//     !!data &&
//     Array.isArray(data) &&
//     data.every(
//       (item) =>
//         typeof item === 'object' &&
//         item !== null &&
//         'text' in item &&
//         typeof item.text === 'string' &&
//         'sent_id' in item &&
//         typeof item.sent_id === 'string' &&
//         'issue' in item &&
//         typeof item.issue === 'string' &&
//         'suggestion' in item &&
//         typeof item.suggestion === 'string' &&
//         'tone_type' in item &&
//         ['confidence', 'subjectivity', 'emotional'].includes(item.tone_type)
//     )
//   );
// }

/** JSON structure for the results of the prominent_topics prompt. */
type ProminentTopicsOutput = {
  /** One sentence summary of the central idea presented in the text. */
  main_idea: string;
  /** A list of identified elaboration strategies in the input text. */
  strategies: string[];
  /** A list of span IDs from the input text for the sentences that describe the central idea. */
  sent_ids: string[];
  /** List of prominent topics found in the text. */
  topics: {
    /** A brief description of the topic. */
    topic: string;
    /** A list of elaboration techniques used to develop the topic. Do not include minor techniques. An empty list if no major elaboration techniques are found. */
    techniques: string[];
    /** A list of span element IDs from the input text for the sentences that describe the topic. */
    topic_sents_ids: string[];
    /** A list of span element IDs from the input text for the sentences that elaborate on the topic. */
    elaboration_sents_ids: string[];
    /** One sentence suggestion describing how the text may be improved. */
    suggestion?: string;
    /** One sentence description of how suggested revisions will strengthen the thesis. */
    impact?: string;
  }[];
};
// function isProminentTopicsOutput(data: unknown): data is ProminentTopicsOutput {
//   return (
//     !!data &&
//     typeof data === 'object' &&
//     'main_idea' in data &&
//     typeof data.main_idea === 'string' &&
//     'strategies' in data &&
//     Array.isArray(data.strategies) &&
//     data.strategies.every((s) => typeof s === 'string') &&
//     'sent_ids' in data &&
//     Array.isArray(data.sent_ids) &&
//     data.sent_ids.every((id) => typeof id === 'string') &&
//     'topics' in data &&
//     Array.isArray(data.topics) &&
//     data.topics.every(
//       (topic) =>
//         !!topic &&
//         typeof topic === 'object' &&
//         'topic' in topic &&
//         typeof topic.topic === 'string' &&
//         'techniques' in topic &&
//         Array.isArray(topic.techniques) &&
//         topic.techniques.every((t: unknown) => typeof t === 'string') &&
//         'topic_sents_ids' in topic &&
//         Array.isArray(topic.topic_sents_ids) &&
//         topic.topic_sents_ids.every((id: unknown) => typeof id === 'string') &&
//         'elaboration_sents_ids' in topic &&
//         Array.isArray(topic.elaboration_sents_ids) &&
//         topic.elaboration_sents_ids.every(
//           (id: unknown) => typeof id === 'string'
//         ) &&
//         ('suggestion' in topic ? typeof topic.suggestion === 'string' : true) &&
//         ('impact' in topic ? typeof topic.impact === 'string' : true)
//     )
//   );
// }

export type SourceType = 'supporting' | 'hedged' | 'alternative' | 'neutral';
export type Source = {
  names: string;
  assessment: string;
  sent_ids: string[];
  src_type: SourceType;
};
// function isSource(data: unknown): data is Source {
//   return (
//     !!data &&
//     typeof data === 'object' &&
//     'names' in data &&
//     typeof data.names === 'string' &&
//     'assessment' in data &&
//     typeof data.assessment === 'string' &&
//     'sent_ids' in data &&
//     Array.isArray(data.sent_ids) &&
//     data.sent_ids.every((id) => typeof id === 'string') &&
//     'src_type' in data &&
//     ['supporting', 'hedged', 'alternative', 'neutral'].includes(
//       data.src_type as string
//     )
//   );
// }
/** A list of citation related issues found in the input text. */
type SourcesOutput = {
  /** One sentence assessment about the citation related issue. */
  issue: string;
  /** One sentence suggestion describing how the text may be improved. */
  suggestion: string;
  /** A list of span element IDs from the input text for the sentences displaying the citation related issue. */
  sent_ids: string[];
}[];
// function isSourcesOutput(data: unknown): data is SourcesOutput {
//   return (
//     !!data &&
//     typeof data === 'object' &&
//     'sources' in data &&
//     Array.isArray(data.sources) &&
//     data.sources.every((source) => isSource(source)) &&
//     'issues' in data &&
//     Array.isArray(data.issues) &&
//     data.issues.every(
//       (item) =>
//         !!item &&
//         typeof item === 'object' &&
//         'issue' in item &&
//         typeof item.issue === 'string' &&
//         'suggestion' in item &&
//         typeof item.suggestion === 'string' &&
//         'sent_ids' in item &&
//         Array.isArray(item.sent_ids) &&
//         item.sent_ids.every((id: unknown) => typeof id === 'string')
//     )
//   );
// }

export type ReviewResponse =
  | CivilToneOutput
  | CredibilityOutput
  | ExpectationsOutput
  | LinesOfArgumentsOutput
  | LogicalFlowOutput
  | ParagraphClarityOutput
  | ProfessionalToneOutput
  | ProminentTopicsOutput
  | SourcesOutput
  | OnTopicData;
// const isReviewResponse = (data: unknown): data is ReviewResponse => {
//   return (
//     isCivilToneOutput(data) ||
//     isCredibilityOutput(data) ||
//     isExpectationsOutput(data) ||
//     isLinesOfArgumentsOutput(data) ||
//     isLogicalFlowOutput(data) ||
//     isParagraphClarityOutput(data) ||
//     isProfessionalToneOutput(data) ||
//     isProminentTopicsOutput(data) ||
//     isSourcesOutput(data) ||
//     isOnTopicData(data)
//   );
// };

interface ReviewData<T extends ReviewResponse> {
  tool: ReviewTool;
  datetime?: Date;
  response: T;
}

export interface CivilToneData extends ReviewData<CivilToneOutput> {
  tool: 'civil_tone';
}
export interface CredibilityData extends ReviewData<CredibilityOutput> {
  tool: 'credibility';
}
export interface ExpectationsData extends ReviewData<ExpectationsOutput> {
  tool: 'expectations';
  expectation: string;
}

export const isExpectationsData = (
  data: ExpectationsData | unknown
): data is ExpectationsData =>
  !!data &&
  typeof data === 'object' &&
  'tool' in data &&
  data.tool === 'expectations' &&
  'expectation' in data &&
  typeof data.expectation === 'string' &&
  'response' in data &&
  isExpectationsOutput(data.response);

/** Test if the string is the "none" fail state in the LLM response. */
const isNone = (suggestion: string): boolean =>
  suggestion.match(/^none/i) !== null;

/**
 * Tests if the suggestion in expectation data is marked as "none".
 * @param data Expectation data returned from the review process.
 * @returns true if the suggestions start with "none", indicating that the LLM did not identify references to the expectation.
 * @deprecated The expectations prompt no longer uses the "none" fail state.
 */
export function isExpectationsDataSuggestionNone(
  data: ExpectationsData
): boolean {
  return isNone(data.response.suggestion);
}

export interface LinesOfArgumentsData extends ReviewData<LinesOfArgumentsOutput> {
  tool: 'lines_of_arguments';
}
export interface LogicalFlowData extends ReviewData<LogicalFlowOutput> {
  tool: 'logical_flow';
}
export interface ParagraphClarityData extends ReviewData<ParagraphClarityOutput> {
  tool: 'paragraph_clarity';
}
export interface ProfessionalToneData extends ReviewData<ProfessionalToneOutput> {
  tool: 'professional_tone';
}
export interface ProminentTopicsData extends ReviewData<ProminentTopicsOutput> {
  tool: 'prominent_topics';
}
export interface SourcesData extends ReviewData<SourcesOutput> {
  tool: 'sources';
}
export interface OnTopicReviewData extends ReviewData<OnTopicData> {
  tool: 'ontopic';
}

// export function isOnTopicReviewData(data: unknown): data is OnTopicReviewData {
//   return (
//     !!data &&
//     typeof data === 'object' &&
//     'tool' in data &&
//     data.tool === 'ontopic'
//   );
// }

/** Error data structure used to represent errors in review tools. */
export type ErrorData = {
  tool: ReviewTool;
  datetime?: Date;
  error: Error;
};
/** Test if the data is an ErrorData object. */
export function isErrorData(data: unknown): data is ErrorData {
  return !!data && typeof data === 'object' && 'error' in data && !!data.error;
}
/** Custom error class to encapsulate ErrorData. */
export class ErrorDataError extends Error {
  data: ErrorData;
  constructor(data: ErrorData) {
    super(data.error.message);
    this.data = data;
  }
}

export type OptionalReviewData<T> = Optional<T | ErrorData>;

export type Analysis =
  | CivilToneData
  | CredibilityData
  | ExpectationsData
  | LinesOfArgumentsData
  | LogicalFlowData
  | ParagraphClarityData
  | ProfessionalToneData
  | ProminentTopicsData
  | SourcesData
  | OnTopicReviewData
  | ErrorData;
