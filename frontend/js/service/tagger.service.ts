/**
 * @fileoverview Service for submitting text for tagging.
 *
 * Initiates tagging when appropriate and handles the SSE's streamed
 * by the tagging service.
 */
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
import { currentTool$ } from './current-tool.service';
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
  if (typeof res === 'number') return false; // number is a percent update
  if (res === null) return false; // non-null
  return (res as TaggerResults).isError !== true; // not an error.
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
  doc_id?: string; // optional id for tracking. Unused in this context.
  status: string; // status content.
}

/**
 * Tag the given text using the specified DocuScope tagger.
 * This is a potentially long processing call.  The service
 * does emit Server Sent Events to update progress.
 * @param tagger_url URL of the tagging service.
 * @param text the string to be tagged.
 * @returns TaggerResults which is the data returned by the tagger or
 * a number which is the percent complete of the tagging process.
 */
export function tag(tagger_url: string, text: string) {
  return new Observable<TaggerResults | number>((subscriber) => {
    subscriber.next(0);
    // abort controller in case tool is destroyed.
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
            // Service error event.
            subscriber.error(new Error(msg.data));
            break;
          case 'processing': {
            // Service progress update event.
            const proc: Message = JSON.parse(msg.data);
            subscriber.next(parseFloat(proc.status));
            break;
          }
          case 'done': {
            // Final results event.
            const payload: TaggerResults = JSON.parse(msg.data);
            subscriber.next(payload);
            break;
          }
          default:
            // Unknown event, should not be reached.
            console.warn(`Unhandled message ${msg}`);
        }
      },
    });
    return () => ctrl.abort();
  });
}

// Observable that tags text when the impressions tool is open,
// settings are loaded, the editor is locked, and there is text.
const tagText = combineLatest({
  state: editorState$,
  text: editorText$,
  settings: settings$,
  tool: currentTool$,
}).pipe(
  filter((c) => c.tool === 'impressions'),
  filter((c) => !!c.settings),
  filter((c) => !c.state),
  filter((c) => c.text.trim().length > 0),
  mergeMap((c) => tag(c.settings.tagger, c.text)),
  catchError((err: Error) =>
    // signal error and put error message in html_content.
    of({ ...EmptyResults, ...{ isError: true, html_content: err.message } })
  )
);

// React hook and observable to be used in impressions tool.
export const [useTaggerResults, taggerResults$] = bind(tagText, null);
