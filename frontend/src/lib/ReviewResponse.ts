import type { OnTopicData } from './OnTopicData';

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

export type GeneralAssessment = {
  assessment: {
    /** A brief comment on the strenghts. */
    strengths: string;
    /** A brief comment on the weaknesses. */
    weaknesses: string;
  };
};

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
export type CivilToneOutput = {
  text: string; // An inappropriate text segment.
  assessment: string;
  suggestion: string;
  sent_id: string;
}[];

/** List of identified credibility issues in the text */
export type CredibilityOutput = {
  issue: string;
  suggestion: string;
  sent_ids: string[];
}[];

export type ExpectationsOutput = {
  /** List of span ids */
  sent_ids: string[];
  /** An acknowledgment of what's working and possible issues, if any. */
  assessment: string;
  /** A brief summary of suggestions for better meeting the expectations. */
  suggestion: string;
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
  /** Summary of the claim written in a single sentence. */
  claim: string;
  /** A list of phrases describing a supporting evidence. */
  support: string[];
  /** List of span ids for sentences that support the claim. */
  claim_sent_ids: string[];
  /** A list of span ids for sentences that provide evidence to support the claim. */
  support_sent_ids: string[];
  /** One sentence suggestion describing how the text may be improved. */
  suggestion?: string;
  /** One sentence description of how suggested revisions will strengthen the thesis. */
  impact?: string;
};

/** JSON structure for the results of the arguments prompt. */
export type LinesOfArgumentsOutput = {
  /** This is a sentence that summarizes the main argument. This is a sentence that describes the argumentation strategy and its assessment. */
  thesis: string;
  /** List of phrases describing the strategies. */
  strategies: string[];
  /** List of span ids for sentences that present the central position of the text. */
  sent_ids?: string[];
  /** List of claims that supports the thesis */
  claims: Claim[];
} & Partial<GeneralAssessment>;

/** List of identified logical flow issues (i.e., disruptions). */
export type LogicalFlowOutput = {
  issue: string;
  suggestion: string;
  sent_ids: string[];
  para_ids: string[];
}[];

export type ParagraphClarityOutput = {
  issue: string;
  suggestion: string;
  sent_ids: string[];
  para_id: string;
}[];

export type ProfessionalToneOutput = {
  text: string;
  sent_id: string;
  issue: string;
  suggestion: string;
  tone_type: 'confidence' | 'subjectivity' | 'emotional';
}[];

/** JSON structure for the results of the prominent_topics prompt. */
export type ProminentTopicsOutput = {
  main_idea: string;
  strategies: string[];
  /** A list of span ids for the sentences from the text that are used to state the main idea. */
  sent_ids: string[];
  topics: {
    topic: string;
    techniques: string[];
    topic_sents_ids: string[];
    elaboration_sents_ids: string[];
    suggestion?: string;
    impact?: string;
  }[];
};

export type SourceType = 'supporting' | 'hedged' | 'alternative' | 'neutral';
export type Source = {
  names: string;
  assessment: string;
  sent_ids: string[];
  src_type: SourceType;
};
export type SourcesOutput = {
  sources: Source[];
  issues: {
    issue: string;
    suggestion: string;
    sent_ids: string[];
  }[];
};

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

export interface LinesOfArgumentsData
  extends ReviewData<LinesOfArgumentsOutput> {
  tool: 'lines_of_arguments';
}
export interface LogicalFlowData extends ReviewData<LogicalFlowOutput> {
  tool: 'logical_flow';
}
export interface ParagraphClarityData
  extends ReviewData<ParagraphClarityOutput> {
  tool: 'paragraph_clarity';
}
export interface ProfessionalToneData
  extends ReviewData<ProfessionalToneOutput> {
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

export function isOnTopicReviewData(data: unknown): data is OnTopicReviewData {
  return (
    !!data &&
    typeof data === 'object' &&
    'tool' in data &&
    data.tool === 'ontopic'
  );
}

export type ErrorData = {
  tool: ReviewTool;
  datetime?: Date;
  error: {
    message: string;
    details?: unknown;
  };
};
export function isErrorData(data: unknown): data is ErrorData {
  return !!data && typeof data === 'object' && 'error' in data && !!data.error;
}

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
