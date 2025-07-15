/**
 * @fileoverview Global runtime settings service.  This is used
 * to specify site wide settings including availability of features.
 * @see service/scribe.service.ts for per assignment myProse feature settings.
 *
 * Reads the "settings/settings.json" file which can be easily replaced in
 * various environments.
 *
 * If new runtime settings are added, do not forget to modify the
 * Settings interface and DEFAULT settings object.
 */
import { bind } from '@react-rxjs/core';
import { catchError, map, of, shareReplay } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

// URL for settings.json, 'base' gets it to work with webpack.
const SETTINGS_URL = new URL(
  '/public/settings/settings.json',
  /* @vite-ignore */ //'../settings/settings.json',
  import.meta.url
);

/**
 * Defines the form of the json settings.
 * Setting for the global availability of various tools.
 */
interface Settings {
  text2speech?: boolean; // Text to speech widgets
  scribe?: boolean; // global LLM tool availability, false disables all LLM tools
  word_count_limit?: number; // Word Count limit for review tools.
  // Draft Tools
  notes2prose?: boolean; // Notes to Prose LLM tool
  notes2bullets?: boolean; // Notes to List LLM tool
  assess_expectation?: boolean; // Assess Single Expectation LLM tool // to be removed
  // LLM Review Tools
  // overview?: boolean;
  civil_tone?: boolean;
  credibility?: boolean; // Credibility review LLM tool
  // ethos?: boolean;
  expectations?: boolean; // All Expectations review LLM tool
  lines_of_arguments?: boolean; // Lines of Arguments review LLM tool
  logical_flow?: boolean; // Logical Progression review LLM tool
  paragraph_clarity?: boolean;
  // pathos?: boolean; // to be removed
  professional_tone?: boolean;
  prominent_topics?: boolean; // Key Ideas review LLM tool
  sources?: boolean;
  // onTopic Review Tools
  term_matrix?: boolean;
  sentence_density?: boolean;
  // Refine Tool
  flow?: boolean; // Flow LLM tool
  copyedit?: boolean; // CopyEdit LLM tool

  // docuscope features
  docuscope?: boolean; // global docuscope availability, false disables all DocuScope tools
  impressions?: boolean; // DocuScope impressions tool.
  common_dictionary: string; // URL.  Needed for impressions
  tagger: string; // URL. Needed for impressions
}

const WORD_COUNT_LIMIT = 2000; // Default word count limit for review tools
// Default json settings, in case of network failure.
const DEFAULT: Settings = {
  common_dictionary: 'https://docuscope.eberly.cmu.edu/common_dictionary',
  tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
  text2speech: true,
  scribe: true,
  word_count_limit: WORD_COUNT_LIMIT,

  notes2prose: true,
  notes2bullets: true,

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

// useSettings: for use in a component, settings$: the rxjs observable
export const [useSettings, settings$] = bind(
  fromFetch<Settings>(SETTINGS_URL.toString(), {
    selector: (response) => response.json(),
  }).pipe(
    map((data) => ({ ...DEFAULT, ...data })),
    shareReplay(1),
    catchError((err) => {
      console.warn(
        `Failed to load ${SETTINGS_URL.toString()}, using defaults: ${err}`
      );
      return of(DEFAULT);
    })
  ),
  DEFAULT
);
