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
const SETTINGS_URL = new URL(/* @vite-ignore */'../settings/settings.json', import.meta.url);

// Defines the form of the json settings.
interface Settings {
  brand?: string;

  common_dictionary: string; // needed for impressions
  tagger: string; // needed for impressions

  scribe?: boolean; // global scribe availability
  // scribe features
  notes2prose?: boolean;
  grammar?: boolean;
  copyedit?: boolean;
  assess_expectations?: boolean;
  text2speech?: boolean;
  logical_flow?: boolean;
  topics?: boolean;

  docuscope?: boolean; // global docuscope availability
  // docuscope features
  coherence?: boolean;
  clarity?: boolean;
  impressions?: boolean;
}

// Default json settings, in case of network failure.
const DEFAULT: Settings = {
  brand: 'myProse',
  common_dictionary: 'https://docuscope.eberly.cmu.edu/common_dictionary',
  tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
  scribe: true,
  notes2prose: true,
  assess_expectations: true,
  text2speech: true,
  logical_flow: true,
  topics: true,

  docuscope: true,
  coherence: true,
  clarity: true,
  impressions: true,
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
