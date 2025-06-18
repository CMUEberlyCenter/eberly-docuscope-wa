/**
 * Defines the form of the json settings.
 * Setting for the global availability of various tools.
 */

export interface Settings {
  text2speech: boolean; // Text to speech widgets
  scribe: boolean; // global LLM tool availability, false disables all LLM tools
  word_count_limit: number; // Word Count limit for review tools.

  // Draft Tools
  notes2prose: boolean; // Notes to Prose LLM tool
  notes2bullets: boolean; // Notes to List LLM tool
  assess_expectation: boolean; // Assess Single Expectation LLM tool // to be removed

  // LLM Review Tools
  // overview?: boolean;
  civil_tone: boolean;
  credibility: boolean; // Credibility review LLM tool

  // ethos?: boolean;
  expectations: boolean; // All Expectations review LLM tool
  lines_of_arguments: boolean; // Lines of Arguments review LLM tool
  logical_flow: boolean; // Logical Progression review LLM tool
  paragraph_clarity: boolean;
  // pathos?: boolean; // to be removed
  professional_tone: boolean;
  prominent_topics: boolean; // Key Ideas review LLM tool
  sources: boolean;
  // onTopic Review Tools
  term_matrix: boolean;
  sentence_density: boolean;
  // Refine Tool
  flow: boolean; // Flow LLM tool
  copyedit: boolean; // CopyEdit LLM tool

  // docuscope features
  docuscope?: boolean; // global docuscope availability, false disables all DocuScope tools
  impressions?: boolean; // DocuScope impressions tool.
  common_dictionary: string; // URL.  Needed for impressions
  tagger: string; // URL. Needed for impressions
}

export const WORD_COUNT_LIMIT = 2000; // Default word count limit for review tools
// Default json settings, in case of network failure.
export const DEFAULT: Settings = {
  common_dictionary: 'https://docuscope.eberly.cmu.edu/common_dictionary',
  tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
  text2speech: true,
  scribe: true,
  word_count_limit: WORD_COUNT_LIMIT,

  notes2prose: true,
  notes2bullets: true,
  assess_expectation: false,

  civil_tone: true,
  credibility: true,
  expectations: true,
  lines_of_arguments: true,
  logical_flow: true,
  paragraph_clarity: true,
  professional_tone: true,
  prominent_topics: true,
  sentence_density: true,
  sources: true,
  term_matrix: true,

  flow: false,
  copyedit: false,

  docuscope: false,
  impressions: false,
};
