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
  /* @vite-ignore */ '../settings/settings.json',
  import.meta.url
);

/**
 * Defines the form of the json settings.
 * Setting for the global availability of various tools.
 */
interface Settings {
  text2speech?: boolean; // Text to speech widgets
  scribe?: boolean; // global LLM tool availability, false disables all LLM tools
  // Draft Tools
  notes2prose?: boolean; // Notes to Prose LLM tool
  notes2bullets?: boolean; // Notes to List LLM tool
  assess_expectation?: boolean; // Assess Single Expectation LLM tool
  // LLM Review Tools
  assess_expectations?: boolean; // All Expectations review LLM tool
  lines_of_arguments?: boolean; // Lines of Arguments review LLM tool
  key_ideas?: boolean; // Key Ideas review LLM tool
  logical_progression?: boolean; // Logical Progression review LLM tool
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

// Default json settings, in case of network failure.
const DEFAULT: Settings = {
  common_dictionary: 'https://docuscope.eberly.cmu.edu/common_dictionary',
  tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
  text2speech: true,
  scribe: true,

  notes2prose: true,
  notes2bullets: true,
  assess_expectation: false,

  assess_expectations: true,
  lines_of_arguments: true,
  key_ideas: true,
  logical_progression: false,
  term_matrix: true,
  sentence_density: true,

  flow: true,
  copyedit: true,

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

export const [useGlobalFeatureTextToSpeech, globalFeatureTextToSpeech$] = bind(
  settings$.pipe(map((settings) => !!settings.text2speech)),
  false
);

export const [useGlobalScribeAvailable, globalScribeAvailable$] = bind(
  settings$.pipe(map((settings) => !!settings.scribe)),
  true
);

export const [useGlobalFeatureNotes2Prose, globalFeatureNotes2Prose$] = bind(
  settings$.pipe(
    map((settings) => !!settings.scribe && !!settings.notes2prose)
  ),
  false
);
export const [useGlobalFeatureNotes2Bullets, globalFeatureNotes2Bullets$] =
  bind(
    settings$.pipe(
      map((settings) => !!settings.scribe && !!settings.notes2bullets)
    ),
    false
  );

export const [useGlobalFeatureExpectation, globalFeatureExpectation$] = bind(
  settings$.pipe(
    map((settings) => !!settings.scribe && !!settings.assess_expectation)
  ),
  false
);
export const [useGlobalFeatureExpectations, globalFeatureExpectations$] = bind(
  settings$.pipe(
    map((settings) => !!settings.scribe && !!settings.assess_expectations)
  ),
  false
);

export const [useGlobalFeatureCopyedit, globalFeatureCopyedit$] = bind(
  settings$.pipe(map((settings) => !!settings.scribe && !!settings.copyedit)),
  false
);

export const [useGlobalFeatureFlow, globalFeatureFlow$] = bind(
  settings$.pipe(map((settings) => !!settings.scribe && !!settings.flow)),
  false
);

export const [useGlobalFeatureReview, globalFeatureReview$] = bind(
  settings$.pipe(
    map(
      (settings) =>
        !!settings.lines_of_arguments ||
        !!settings.key_ideas ||
        !!settings.logical_progression ||
        !!settings.term_matrix ||
        !!settings.sentence_density
    )
  ),
  false
);

export const [useGlobalFeatureArguments, globalFeatureArguments$] = bind(
  settings$.pipe(
    map((settings) => !!settings.scribe && !!settings.lines_of_arguments)
  ),
  false
);
export const [useGlobalFeatureKeyIdeas, globalFeatureKeyIdeas$] = bind(
  settings$.pipe(map((settings) => !!settings.scribe && !!settings.key_ideas)),
  false
);
export const [
  useGlobalFeatureLogicalProgression,
  globalFeatureLogicalProgression$,
] = bind(
  settings$.pipe(
    map((settings) => !!settings.scribe && !!settings.logical_progression)
  ),
  false
);
export const [useGlobalFeatureTermMatrix, globalFeatureTermMatrix$] = bind(
  settings$.pipe(map((settings) => !!settings.term_matrix)),
  false
);
export const [useGlobalFeatureSentenceDensity, globalFeatureSentenceDensity$] =
  bind(settings$.pipe(map((settings) => !!settings.sentence_density)), false);

export const [useGlobalFeatureImpressions, globalFeatureImpressions$] = bind(
  settings$.pipe(
    map((settings) => !!settings.docuscope && !!settings.impressions)
  ),
  false
);
