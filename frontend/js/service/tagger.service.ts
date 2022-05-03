import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind } from '@react-rxjs/core';
import {
  catchError,
  combineLatest,
  filter,
  mergeMap,
  Observable,
  of,
} from 'rxjs';
import { editorState$, editorText$ } from './editor-state.service';
import { settings$ } from './settings.service';

/** JSON structure of patterns. */
interface PatternData {
  pattern: string;
  count: number;
}
/** JSON structure of patterns for a category */
interface PatternCategoryData {
  category: string;
  patterns: PatternData[];
}
/** JSON structure of tagger results data */
export interface TaggerResults {
  doc_id: string;
  word_count: number;
  html_content: string;
  tagging_time: number;
  patterns: PatternCategoryData[];
  isError?: boolean;
}
const EmptyResults: TaggerResults = {
  doc_id: '',
  word_count: 0,
  html_content: '',
  tagging_time: 0,
  patterns: [],
};

/** Predicate for testing if a value is a TaggerResult */
export function isTaggerResult(
  res: TaggerResults | number | null
): res is TaggerResults {
  if (typeof res === 'number') return false;
  if (res === null) return false;
  return (res as TaggerResults).isError !== true;
}

/**
 * Generate the mapping of category ids to their list of patterns.
 * Useful for fast lookup of of patterns.
 * @param res the results of tagging.
 * @returns a Map of category id to its list of patterns.
 */
export function gen_patterns_map(
  res: TaggerResults
): Map<string, PatternData[]> {
  return new Map<string, PatternData[]>(
    res.patterns.map((d) => [d.category, d.patterns ?? []])
  );
}

/** JSON structure for non-TaggerResult messages from the tagger. */
interface Message {
  doc_id?: string;
  status: string;
}

/**
 * Tag the given text using the specified DocuScope tagger.
 * @param tagger_url URL of the tagging service.
 * @param text the string to be tagged.
 * @returns TaggerResults which is the data returned by the tagger or
 * a number which is the percent complete of the tagging process.
 */
export function tag(tagger_url: string, text: string) {
  return new Observable<TaggerResults | number>((subscriber) => {
    subscriber.next(0);
    const ctrl = new AbortController();
    fetchEventSource(tagger_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text }),
      signal: ctrl.signal,
      // TODO: possibly add better error handling.
      /*async onopen(response) {
        console.log(response.ok, response.status, response.statusText);
        if (response.ok) {
          return; // everything's good
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          // client-side errors are usually non-retriable:
          throw new Error(response.statusText);
        } else {
          throw new Error(response.statusText);
        }
      },*/
      onerror(err) {
        subscriber.error(new Error('Tagger service is down.'));
        throw err;
      },
      onmessage(msg) {
        switch (msg.event) {
          case 'error':
            subscriber.error(new Error(msg.data));
            break;
          case 'processing': {
            const proc: Message = JSON.parse(msg.data);
            subscriber.next(parseFloat(proc.status));
            break;
          }
          case 'done': {
            const payload: TaggerResults = JSON.parse(msg.data);
            subscriber.next(payload);
            break;
          }
          default:
            console.warn(`Unhandled message ${msg}`);
        }
      },
    });
    return () => ctrl.abort();
  });
}

const tagText = combineLatest({
  state: editorState$,
  text: editorText$,
  settings: settings$,
}).pipe(
  filter((c) => !!c.settings),
  filter((c) => !c.state),
  filter((c) => c.text.trim().length > 0),
  mergeMap((c) => tag(c.settings.tagger, c.text)),
  catchError((err: Error) =>
    of({ ...EmptyResults, ...{ isError: true, html_content: err.message } })
  )
);

export const [useTaggerResults, taggerResults$] = bind(tagText, null);
