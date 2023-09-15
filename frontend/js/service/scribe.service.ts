import { bind } from '@react-rxjs/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilKeyChanged,
  filter,
  mergeMap,
  of,
  switchMap,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

// Showing the A.I. Scribe warning and setting dialog.
const show_scribe_option = new BehaviorSubject<boolean>(true);
export const showScribeOption = (show: boolean) =>
  show_scribe_option.next(show);
export const [useShowScribeOption, showScribeOption$] = bind(
  show_scribe_option,
  true
);

// If scribe is currently enabled. // TODO: possibly set default from previous setting
const scribe = new BehaviorSubject<boolean>(true); // Opt-out
export const enableScribe = (enable: boolean) => scribe.next(enable);
export const [useScribe, scribe$] = bind(scribe, true);

/*** Notes to Prose ***/
/**
 * Use LLM to convert notes to prose using backend relay.
 * @param notes text of selected notes from editor
 * @returns
 */
function requestConvertNotes(notes: string) {
  return fromFetch('/api/v1/scribe/convert_notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  }).pipe(
    switchMap((response) => {
      if (response.ok) {
        return response.json();
      }
      return of({ error: true, message: `Error ${response.status}` });
    }),
    catchError((err) => {
      console.error(err);
      return of({ error: true, message: err.message });
    })
  );
}

export const notes = new BehaviorSubject<string>('');
export const convertedNotes = combineLatest({
  notes: notes,
  scribe: scribe$,
}).pipe(
  filter((c) => c.scribe),
  filter((c) => c.notes.trim().length !== 0),
  distinctUntilKeyChanged('notes'),
  mergeMap((c) => requestConvertNotes(c.notes))
);
export const [useProse, prose$] = bind(convertedNotes);

/*** Fix Grammar ***/

function requestFixGrammar(text: string) {
  return fromFetch('/api/v1/scribe/fix_grammar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).pipe(
    switchMap((response) => {
      if (response.ok) {
        return response.json();
      }
      return of({ error: true, message: `Error ${response.status}` });
    }),
    catchError((err) => {
      console.error(err);
      return of({ error: true, message: err.message });
    })
  );
}

export const grammar = new BehaviorSubject<string>('');
export const fixedGrammar = combineLatest({
  text: grammar,
  scribe: scribe$,
}).pipe(
  filter((c) => c.scribe),
  filter((c) => c.text.trim().length !== 0),
  distinctUntilKeyChanged('text'),
  mergeMap((c) => requestFixGrammar(c.text))
);
export const [useFixedGrammar, fixedGrammar$] = bind(fixedGrammar);

/*** Clarify selected text ***/

function requestClarify(text: string) {
  return fromFetch('/api/v1/scribe/clarify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).pipe(
    switchMap((response) => {
      if (response.ok) {
        return response.json();
      }
      return of({ error: true, message: `Error ${response.status}` });
    }),
    catchError((err) => {
      console.error(err);
      return of({ error: true, message: err.message });
    })
  );
}
export const clarify = new BehaviorSubject<string>('');
export const clarified = combineLatest({ text: clarify, scribe: scribe$ }).pipe(
  filter((c) => c.scribe),
  filter((c) => c.text.trim().length !== 0),
  distinctUntilKeyChanged('text'),
  mergeMap((c) => requestClarify(c.text))
);
export const [useClarified, clarified$] = bind(clarified);
