import { SUSPENSE, bind } from '@react-rxjs/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilKeyChanged,
  filter,
  mergeMap,
  of,
  switchMap,
  distinctUntilChanged,
  map,
  concat,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { courseId } from './lti.service';
import { type ChatCompletion } from 'openai/resources/chat';
import { type Range } from 'slate';

export const ScribeAvailable = true; // For future ability to conditionally make it available.

// Showing the A.I. Scribe warning and setting dialog.
const showAtStartup = sessionStorage.getItem('show_scribe') !== 'false';
const show_scribe_option = new BehaviorSubject<boolean>(showAtStartup);
export const hideScribeOption = () => show_scribe_option.next(false);
export const showScribeOption = () => show_scribe_option.next(true);
export const [useShowScribeOption, showScribeOption$] = bind(
  show_scribe_option.pipe(distinctUntilChanged()),
  showAtStartup
);
show_scribe_option.subscribe(
  (show) => show && sessionStorage.setItem('show_scribe', 'false')
);

// If scribe is currently enabled. // TODO: possibly set default from previous setting
const optIn = sessionStorage.getItem('enable_scribe') === true.toString();
const scribe = new BehaviorSubject<boolean>(optIn); // Opt-out
export const enableScribe = (enable: boolean) => scribe.next(enable);
export const [useScribe, scribe$] = bind(scribe, optIn);
scribe.subscribe((enable) =>
  sessionStorage.setItem('enable_scribe', enable.toString())
);

/*** Notes to Prose ***/
/**
 * Use LLM to convert notes to prose using backend relay.
 * @param notes text of selected notes from editor
 * @returns
 */
function requestConvertNotes(notes: SelectedNotesProse) {
  const course_id = courseId();
  return fromFetch('/api/v1/scribe/convert_notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id, notes: notes.text }),
  })
    .pipe(
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
    )
    .pipe(
      map((data: ChatResponse) => {
        if ('error' in data) {
          console.log(data.message);
          return 'An error occured while converting your notes to prose.';
        }
        if ('choices' in data) {
          logCovertNotes(notes.text, data);
          return data.choices[0].message.content ?? '';
        }
        return '';
      }),
      map((prose) => {
        return { ...notes, prose };
      })
    );
}

const NOTES_TO_PROSE = 'notes2prose';
function logCovertNotes(notes: string, prose: ChatCompletion) {
  const data = JSON.parse(retrieveConvertLog());
  sessionStorage.setItem(
    NOTES_TO_PROSE,
    JSON.stringify([...data, { notes, prose }])
  );
}
export function retrieveConvertLog() {
  return sessionStorage.getItem(NOTES_TO_PROSE) ?? '[]';
}
export function downloadHistory(): void {
  // file object
  const file = new Blob([retrieveConvertLog()], { type: 'application/json' });

  // anchor link
  const element = document.createElement('a');
  element.href = URL.createObjectURL(file);
  element.style.display = 'none';
  element.download = `AIScribeHistory-${courseId()}-${Date.now()}.json`;

  // simulate link click
  document.body.appendChild(element); // Required for this to work in FireFox
  element.click();
  // remove element?
}

type ChatResponse = { error: boolean; message: string } | ChatCompletion;
export interface SelectedNotesProse {
  text: string;
  range?: Range;
  prose?: string;
}
export const notes = new BehaviorSubject<SelectedNotesProse>({ text: '' });
export const [useNotes, notes$] = bind(notes, undefined);
export const convertedNotes = combineLatest({
  notes: notes,
  scribe: scribe$,
}).pipe(
  filter((c) => c.scribe),
  filter((c) => c.notes.text.trim().length !== 0),
  distinctUntilKeyChanged('notes', (a, b) => a.text === b.text),
  switchMap((c) =>
    concat<[SUSPENSE, SelectedNotesProse]>(
      of(SUSPENSE),
      requestConvertNotes(c.notes)
    )
  )
);
export const [useProse, prose$] = bind<SUSPENSE | SelectedNotesProse>(
  convertedNotes,
  SUSPENSE
);

notes.subscribe(
  (notes) => notes !== undefined && console.log(`TODO log notes: ${notes.text}`)
);
prose$.subscribe(
  (prose) =>
    typeof prose === 'string' && console.log(`TODO log prose: ${prose}`)
);

/*** Fix Grammar ***/

function requestFixGrammar(text: string) {
  const course_id = courseId();
  return fromFetch('/api/v1/scribe/fix_grammar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id, text }),
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
  const course_id = courseId();
  return fromFetch('/api/v1/scribe/clarify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id, text }),
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
