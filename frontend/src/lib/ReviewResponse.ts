import { OnTopicData } from './OnTopicData';

export type ReviewPrompt =
  | 'civil_tone'
  | 'ethos'
  | 'expectations'
  | 'key_ideas'
  | 'lines_of_arguments'
  | 'logical_flow'
  | 'pathos'
  | 'professional_tone'
  | 'sources';

type ReviewTool = ReviewPrompt | 'ontopic' | 'docuscope';

export const ReviewTools: ReviewTool[] = [
  'civil_tone',
  'ethos',
  'expectations',
  'key_ideas',
  'lines_of_arguments',
  'logical_flow',
  'pathos',
  'professional_tone',
  'sources',
  'ontopic',
  'docuscope',
];

type Assessment = {
  assessment: {
    /** A brief comment on the strenghts. */
    strengths: string;
    /** A brief comment on the weaknesses. */
    weaknesses: string;
  };
};

export type SentenceToneIssue = {
  sentence: string;
  sentence_id: string;
  assessment: string;
  suggestion: string;
};
export type CivilToneOutput = {
  issues: SentenceToneIssue[];
} & Assessment;

export type SentenceAssessment = {
  sentence_ids: string[];
  assessment: string;
  suggestion: string;
};
export type EthosOutput = {
  expertise_ethos: SentenceAssessment[];
  analytical_ethos: SentenceAssessment[];
  balanced_ethos: SentenceAssessment[];
} & Assessment;

export type ExpectationsOutput = {
  /** List of span ids */
  sentences: string[];
  /** An acknowledgment of how the text addresses the expectation followed by a brief summary of suggestions for better meeting the expectations. */
  suggestions: string;
};
export function isExpectationsOutput(
  data: unknown
): data is ExpectationsOutput {
  return (
    !!data &&
    typeof data === 'object' &&
    'sentences' in data &&
    Array.isArray(data.sentences) &&
    'suggestions' in data &&
    typeof data.suggestions === 'string'
  );
}

/** JSON structure for the results of the key_points prompt. */
export type KeyIdeasOutput = {
  topics: {
    /** A point or key idea of the text summarized in a single sentence. */
    topic: string;
    elaborations: {
      /** A brief but clear and actionable description of the suggestion. */
      elaboration_strategy: string;
      /** An explanation of how implementing the suggested change would strengthen the development of the central idea. */
      explanation: string;
    }[];
    /** A list of span ids for the sentences from the text that are used to state the claim. */
    topic_sentences: string[];
    /** List of suggestions. */
    suggestions: string[];
    /** A list of span ids for the sentences from the text that provide the evidence used to support the claim. */
    elaboration_sentences: string[];
  }[];
} & Assessment;

export type Claim = {
  /** Summary of the claim written in a single sentence. */
  claim: string;
  /** An explanation for the evidence supporting the claim. */
  support: string;
  /** List of span ids for sentences that support the claim. */
  claim_sentences?: string[];
  /** A List where the first entry is a suggestion and the second is an explanation of the suggestion. */
  suggestions?: string[];
  /** A list of span ids for sentences that provide evidence to support the claim. */
  evidence_sentences?: string[];
};

/** JSON structure for the results of the arguments prompt. */
export type LinesOfArgumentsOutput = {
  /** This is a sentence that summarizes the main argument. This is a sentence that describes the argumentation strategy and its assessment. */
  thesis: string;
  /** List of span ids for sentences that present the central position of the text. */
  thesis_sentences: string[];
  /** List of claims that supports the thesis */
  arguments: Claim[];
  /** List of claims that challenge an aspect of the thesis or a supporting claim. */
  counter_arguments: Claim[];
  /** List of claims that address their corresponding counterargument. */
  rebuttals: Claim[];
} & Assessment;

export type LogicalFlowOutput = {
  disruptions: {
    explanation: string;
    suggestions: string;
    sentences: string[];
    paragraphs: string[];
  }[];
} & Assessment;

export type PathosOutput = {
  situation_pathos: SentenceAssessment[];
  temporal_pathos: SentenceAssessment[];
  immersive_pathos: SentenceAssessment[];
  structural_pathos: SentenceAssessment[];
} & Assessment;

export type ProfessionalToneOutput = {
  sentiment: SentenceToneIssue[];
  confidence: SentenceToneIssue[];
  subjectivity: SentenceToneIssue[];
} & Assessment;

export type Citation = {
  /** Name(s) of the sources. */
  names: string;
  /** A brief assessment sentence. */
  assessment: string;
  /** List of span ids. */
  sentences: string[];
};
export type SourcesOutput = {
  supportive_citation: Citation[];
  hedged_citation: Citation[];
  alternative_citation: Citation[];
  neutral_citation: Citation[];
  citation_issues: {
    description: string;
    suggestion: string;
    sentences: string[];
  }[];
} & Assessment;

export type ReviewResponse =
  | CivilToneOutput
  | EthosOutput
  | ExpectationsOutput
  | KeyIdeasOutput
  | LinesOfArgumentsOutput
  | LogicalFlowOutput
  | PathosOutput
  | ProfessionalToneOutput
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
export interface EthosData extends ReviewData<EthosOutput> {
  tool: 'ethos';
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

export interface KeyIdeasData extends ReviewData<KeyIdeasOutput> {
  tool: 'key_ideas';
}

export interface LinesOfArgumentsData
  extends ReviewData<LinesOfArgumentsOutput> {
  tool: 'lines_of_arguments';
}
export interface LogicalFlowData extends ReviewData<LogicalFlowOutput> {
  tool: 'logical_flow';
}
export interface PathosData extends ReviewData<PathosOutput> {
  tool: 'pathos';
}
export interface ProfessionalToneData
  extends ReviewData<ProfessionalToneOutput> {
  tool: 'professional_tone';
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
  | EthosData
  | ExpectationsData
  | KeyIdeasData
  | LinesOfArgumentsData
  | LogicalFlowData
  | PathosData
  | ProfessionalToneData
  | SourcesData
  | OnTopicReviewData
  | ErrorData;
