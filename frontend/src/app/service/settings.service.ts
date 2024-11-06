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

// Defines the form of the json settings.
interface Settings {
  text2speech?: boolean;
  scribe?: boolean; // global scribe availability
  // scribe features
  // Draft
  notes2prose?: boolean;
  notes2bullets?: boolean;
  assess_expectation?: boolean;
  assess_expectations?: boolean;
  // Review
  lines_of_arguments?: boolean;
  key_ideas?: boolean;
  logical_progression?: boolean;
  term_matrix?: boolean;
  sentence_density?: boolean;
  // Refine
  flow?: boolean;
  copyedit?: boolean;

  // docuscope features
  docuscope?: boolean; // global docuscope availability
  impressions?: boolean;
  common_dictionary: string; // URL.  Needed for impressions
  tagger: string; // URL. Needed for impressions
}

// Default json settings, in case of network failure.
const DEFAULT: Settings = {
  common_dictionary: 'https://docuscope.eberly.cmu.edu/common_dictionary',
  tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
  text2speech: true,
  scribe: true, // global scribe availability
  // scribe features
  // Draft
  notes2prose: true,
  notes2bullets: true,
  assess_expectation: false,
  assess_expectations: false,
  // Review
  lines_of_arguments: true,
  key_ideas: true,
  logical_progression: false,
  term_matrix: true,
  sentence_density: true,
  // Refine
  flow: true,
  copyedit: true,

  // docuscope features
  docuscope: false, // global docuscope availability
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
    map((settings) => !!settings.scribe && !!settings.assess_expectation)
  ),
  false
);

export const [useGlobalFeatureCopyedit, globalFeatureCopyedit$] = bind(
  settings$.pipe(map((settings) => !!settings.copyedit)),
  false
);

export const [useGlobalFeatureFlow, globalFeatureFlow$] = bind(
  settings$.pipe(map((settings) => !!settings.flow)),
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
  settings$.pipe(map((settings) => !!settings.lines_of_arguments)),
  false
);
export const [useGlobalFeatureKeyIdeas, globalFeatureKeyIdeas$] = bind(
  settings$.pipe(map((settings) => !!settings.key_ideas)),
  false
);
export const [
  useGlobalFeatureLogicalProgression,
  globalFeatureLogicalProgression$,
] = bind(
  settings$.pipe(map((settings) => !!settings.logical_progression)),
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
