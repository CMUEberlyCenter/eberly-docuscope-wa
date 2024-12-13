import { OnTopicData } from './OnTopicData';

export type ReviewTool =
  | 'global_coherence'
  | 'all_expectations'
  | 'arguments'
  | 'key_points'
  | 'ontopic'
  | 'docuscope';

export type Suggestion = {
  text: string; // reference
  explanation: string; // evaluation
  suggestions: string;
};
export type GlobalCoherenceResponse = {
  'Given New Contract Violation': Suggestion[];
  'Sudden Shift in Topic': Suggestion[];
  'Illogical Order': Suggestion[];
  'Redundant Information': Suggestion[];
  'Inconsistent Information': Suggestion[];
};

export type Claim = {
  /** Summary of the claim written in a single sentence. */
  claim: string;
  /** An explanation for the evidence supporting the claim. */
  support: string;
  /** List of span ids for sentences that support the claim. */
  claim_sentences: string[];
  /** A List where the first entry is a suggestion and the second is an explanation of the suggestion. */
  suggestions: string[];
  /** A list of span ids for sentences that provide evidence to support the claim. */
  evidence_sentences: string[];
};

/** JSON structure for the results of the arguments prompt. */
export type ArgumentsResponse = {
  /** This is a sentence that summarizes the main argument. This is a setnence that describes the argumentation strategy and its assessment. */
  thesis: string;
  /** List of span ids for sentences that present the central position of the text. */
  thesis_sentences: string[];
  arguments: Claim[];
  counter_arguments: Claim[];
  rebuttals: Claim[];
};

/** JSON structure for the results of the key_points prompt. */
export type KeyPointsResponse = {
  /** This is a sentence that summarizes the main argument. This is a sentence that describes the exposition strategy, along with its assessment. */
  central_idea: string;
  /** A list of span ids for the sentences that describe the central idea of this text.  */
  central_idea_sentences: string[];
  ideas: {
    /** A point or key idea of the text summarized in a single sentence. */
    idea: string;
    elaborations: {
      /** A brief but clear and actionable description of the suggestion. */
      elaboration_strategy: string;
      /** An explanation of how implementing the suggested change would strengthen the development of the central idea. */
      explanation: string;
    }[];
    /** A list of span ids for the sentences from the text that are used to state the claim. */
    idea_sentences: string[];
    /** List of suggestions. */
    suggestions: string[];
    /** A list of span ids for the sentences from the text that provide the evidence used to support the claim. */
    elaboration_sentences: string[];
  }[];
};

export type AllExpectationsResponse = {
  /** List of span ids */
  sentences: string[];
  /** An acknowledgment of how the text addresses the expectation followed by a brief summary of suggestions for better meeting the expectations. */
  suggestions: string;
};

export type ReviewResponse =
  | GlobalCoherenceResponse
  | KeyPointsResponse
  | AllExpectationsResponse
  | ArgumentsResponse
  | OnTopicData;

interface ReviewData<T extends ReviewResponse> {
  tool: ReviewTool;
  datetime?: Date;
  response: T;
}
export interface GlobalCoherenceData
  extends ReviewData<GlobalCoherenceResponse> {
  tool: 'global_coherence';
}
export interface KeyPointsData extends ReviewData<KeyPointsResponse> {
  tool: 'key_points';
}
export interface AllExpectationsData
  extends ReviewData<AllExpectationsResponse> {
  tool: 'all_expectations';
  expectation: string;
}
export const isAllExpectationsData = (
  data: AllExpectationsData | unknown
): data is AllExpectationsData =>
  !!data &&
  typeof data === 'object' &&
  'tool' in data &&
  data.tool === 'all_expectations';

export interface ArgumentsData extends ReviewData<ArgumentsResponse> {
  tool: 'arguments';
}
export interface OnTopicReviewData extends ReviewData<OnTopicData> {
  tool: 'ontopic';
}
export type Analysis =
  | GlobalCoherenceData
  | KeyPointsData
  | AllExpectationsData
  | ArgumentsData
  | OnTopicReviewData;
