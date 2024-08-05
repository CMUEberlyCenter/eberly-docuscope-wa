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
  claim: string;
  support: string;
  sentences: string[];
  suggestions: string[];
};
export type ArgumentsResponse = {
  main_argument: string;
  arguments: Claim[];
  counter_examples: Claim[];
  rebuttals: Claim[];
};

export type KeyPointsResponse = {
  points: {
    point: string;
    elaborations: { elaboration_strategy: string; explanation: string }[];
    sentences: string[];
    suggestions: string[];
  }[];
};

export type AllExpectationsResponse = {
  sentences: string[];
  suggestions: string[];
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
}
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
