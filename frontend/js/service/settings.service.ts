/**
 * @fileoverview Runtime settings service.
 *
 * Reads the "assets/settings.json" file which can be easily replaced in
 * various environments.
 *
 * If new runtime settings are added, do not forget to modify the
 * Settings interface and DEFAULT settings object.
 */
import { bind } from '@react-rxjs/core';
import { catchError, map, of, shareReplay } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

// URL for settings.json, 'base' gets it to work with webpack.
const SETTINGS_URL = new URL('../assets/settings.json', import.meta.url);

// Defines the form of the json settings.
interface Settings {
  common_dictionary: string;
  tagger: string;
}

// Default json settings, in case of network failure.
const DEFAULT: Settings = {
  common_dictionary: 'https://docuscope.eberly.cmu.edu/common_dictionary',
  tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
};

// useSettings: for use in a component, settings$: the rxjs observable
export const [useSettings, settings$] = bind(
  fromFetch<Settings>(SETTINGS_URL.toString(), {selector: response => response.json()}).pipe(
    map((data) => ({ ...DEFAULT, ...data })),
    shareReplay(1),
    catchError((err) => {
      console.warn(`Failed to load settings, using defaults: ${err}`);
      return of(DEFAULT);
    })
  )
);
