import { bind } from "@react-rxjs/core";
import { catchError, of } from "rxjs";
import { ajax } from "rxjs/ajax";

const SETTINGS_URL = new URL('../assets/settings.json', import.meta.url);

interface Settings {
  tagger: string;
}

const DEFAULT: Settings = {
  tagger: 'http://docuscope.eberly.cmu.edu:8088/tag'
}

export const [useSettings, settings$] = bind(
  ajax.getJSON<Settings>(SETTINGS_URL.toString()).pipe(catchError((err) => {
    console.warn(`Failed to load settings: ${err}`);
    return of(DEFAULT);
  }))
);
