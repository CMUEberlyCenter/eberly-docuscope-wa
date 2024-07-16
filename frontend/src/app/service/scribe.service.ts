import { SUSPENSE, bind } from '@react-rxjs/core';
import { type ChatCompletion } from 'openai/resources/chat/completions';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  of,
  switchMap,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { Descendant, type Range } from 'slate';
import { DocuScopeRuleCluster } from '../lib/DocuScopeRuleCluster';
import { settings$ } from './settings.service';
import { Rule, WritingTask } from '../../lib/WritingTask';

// TODO: per assignment feature settings.

export const [useScribeAvailable, ScribeAvailable$] = bind(
  settings$.pipe(map((settings) => settings.scribe)),
  true
);

// Show the myScribe warning and setting dialog.
const showAtStartup =
  sessionStorage.getItem('show_scribe') !== false.toString();
const show_scribe_option = new BehaviorSubject<boolean>(showAtStartup);
export const hideScribeOption = () => show_scribe_option.next(false);
export const showScribeOption = () => show_scribe_option.next(true);
export const [useShowScribeOption, showScribeOption$] = bind(
  show_scribe_option.pipe(distinctUntilChanged()),
  showAtStartup
);
show_scribe_option.subscribe((save) =>
  sessionStorage.setItem('show_scribe', save.toString())
);

// If scribe is currently enabled by user.
const optIn = true; // sessionStorage.getItem('enable_scribe') === true.toString();
const scribe = new BehaviorSubject<boolean>(optIn); // Opt-out
export const enableScribe = (enable: boolean) => scribe.next(enable);
export const [useScribe, scribe$] = bind(scribe, optIn);
scribe.subscribe((enable) =>
  sessionStorage.setItem('enable_scribe', enable.toString())
);

/*** Notes to Prose ***/
export const [useScribeFeatureNotes2Prose, featureNotes2Prose$] = bind(
  settings$.pipe(map((settings) => settings.notes2prose)),
  false
);

/**
 * Use LLM to convert notes to prose using backend relay.
 * @param notes text of selected notes from editor
 * @returns
 */
function requestConvertNotes(notes: SelectedNotesProse) {
  return fromFetch('/api/v2/scribe/convert_to_prose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: notes.text }),
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
          console.error(data.message);
          return;
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
  element.download = `myScribeHistory-${Date.now()}.json`;

  // simulate link click
  document.body.appendChild(element); // Required for this to work in FireFox
  element.click();
  // remove element?
}

type ChatResponse = { error: boolean; message: string } | ChatCompletion;

interface SelectedText {
  text: string;
  fragment?: Descendant[];
  range?: Range;
  html?: string;
}
export interface SelectedNotesProse extends SelectedText {
  prose?: string;
}

export async function postConvertNotes({text}: SelectedText, output: 'prose'|'bullets' = 'prose', writing_task?: WritingTask|null) {
  const endpoint = output === 'bullets' ? 'convert_to_bullets' : 'convert_to_prose';
  const {user_lang, target_lang} = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/${endpoint}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: text, user_lang, target_lang })
    });
  if (!response.ok) {
    const err = await response.text();
    //throw new Error(`${response.status}: ${err}`);
    // TODO improve error reporting.
    return err;
  }
  const data: ChatResponse = await response.json();
  if ('error' in data) {
    console.error(data.message);
    return data.message;
  }
  if ('choices' in data) {
    logCovertNotes(text, data);
    return data.choices[0].message.content ?? '';
  }
  return '';
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
  (notes) => notes !== undefined && console.log(`logging notes: ${notes.text}`)
);
prose$.subscribe(
  (prose) => typeof prose === 'string' && console.log(`logging prose: ${prose}`)
);

/*** Fix Grammar ***/
export const [useScribeFeatureGrammar, grammarFeature$] = bind(
  settings$.pipe(map((settings) => settings.grammar)),
  false
);

function requestFixGrammar(selection: SelectedNotesProse) {
  return fromFetch('/api/v2/scribe/proofread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: selection.text }),
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
          console.error(data.message);
          return 'An Error occured while proofreading you text.';
        }
        if ('choices' in data) {
          return data.choices[0].message.content ?? '';
        }
        return '';
      }),
      map((prose) => ({ ...selection, prose }))
    );
}

export const grammar = new BehaviorSubject<SelectedNotesProse>({ text: '' });
export const [useGrammar, grammar$] = bind(grammar, undefined);
const fixedGrammar = combineLatest({
  selection: grammar,
  scribe: scribe$,
}).pipe(
  filter((c) => c.scribe),
  filter((c) => c.selection.text.trim().length !== 0),
  distinctUntilKeyChanged('selection'),
  switchMap((c) =>
    concat<[SUSPENSE, SelectedNotesProse]>(
      of(SUSPENSE),
      requestFixGrammar(c.selection)
    )
  )
);
export const [useFixedGrammar, fixedGrammar$] = bind<
  SUSPENSE | SelectedNotesProse
>(fixedGrammar, SUSPENSE);

/*** Clarify selected text ***/
export async function postClarifyText({text}: SelectedText, writing_task?: WritingTask|null) {
  const {user_lang, target_lang} = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/copyedit`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, user_lang, target_lang}),
  })
  if (!response.ok) {
    const err = await response.text();
    return err;
  }
  const data: ChatResponse = await response.json();
  if ('error' in data) {
    console.error(data.message);
    return data.message;
  }
  if ('choices' in data) {
    return data.choices[0].message.content ?? '';
  }
  return '';
}

export const [useScribeFeatureClarify, clarifyFeature$] = bind(
  settings$.pipe(map((settings) => settings.grammar)),
  false
);

function requestClarify(selection: SelectedNotesProse) {
  return fromFetch('/api/v2/scribe/copyedit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: selection.text }),
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
          console.error(data.message);
          return 'An error occured while converting your notes to prose.';
        }
        if ('choices' in data) {
          return data.choices[0].message.content ?? '';
        }
        return '';
      }),
      map((prose) => ({ ...selection, prose }))
    );
}
export const clarify = new BehaviorSubject<SelectedNotesProse>({ text: '' });
export const [useClarify, clarify$] = bind(clarify, undefined);
const clarified = combineLatest({
  selection: clarify,
  scribe: scribe$,
}).pipe(
  filter((c) => c.scribe),
  filter((c) => c.selection.text.trim().length !== 0),
  distinctUntilKeyChanged('selection'),
  switchMap((c) =>
    concat<[SUSPENSE, SelectedNotesProse]>(
      of(SUSPENSE),
      requestClarify(c.selection)
    )
  )
);
export const [useClarified, clarified$] = bind<SUSPENSE | SelectedNotesProse>(
  clarified,
  SUSPENSE
);

/*** Assess Expectations ***/
export const [useAssessFeature, assessFeature$] = bind(
  settings$.pipe(map((settings) => settings.assess_expectations)),
  false
);
interface AssessmentData {
  rating: number;
  first_sentence: string;
  explanation: string;
}

export async function postExpectation(text: string, {name, description}: Rule, writing_task?: WritingTask | null) {
  const {user_lang, target_lang} = writing_task?.info ?? {};
  const response = await fetch('/api/v2/scribe/assess_expectation', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, user_lang, target_lang, expectation: name, description})
  });
  if (!response.ok) {
    const err = await response.text();
    return err;
  }
  const data: ChatResponse = await response.json();
  if ('error' in data) {
    console.error(data.message);
    return data.message;
  }
  if ('choices' in data) {
    return data.choices[0].message.content ?? '';
  }
  return '';
}
/**
 * Fetch expectation audit results from backend.
 * @param text Selected essay text.
 * @param expectation expectation text.
 * @param description expectation description.
 * @returns Results of llm processing with the expectation's
 *  associated prompt and the given text.
 */
function requestAssess(text: string, expectation: string, description: string) {
  return fromFetch('/api/v2/scribe/assess_expectation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      expectation,
      description,
    }),
  })
    .pipe(
      switchMap((respose) => {
        if (respose.ok) {
          return respose.json();
        }
        return of({ error: true, message: `Error ${respose.status}` });
      }),
      catchError((err) => {
        console.error(err);
        return of({ error: true, message: err.message });
      })
    )
    .pipe(
      map((data: ChatResponse): AssessmentData => {
        const errorData: AssessmentData = {
          rating: 0.0,
          first_sentence: '',
          explanation: '',
        };
        if ('error' in data) {
          console.error(data.message);
          return {
            ...errorData,
            explanation:
              'An error occured while assessing the selected expectation for the selected text.',
          };
        }
        // if it is the expected format for results:
        if ('choices' in data) {
          const content = data.choices.at(0)?.message.content;
          if (content) {
            return JSON.parse(content) as AssessmentData;
          }
        }
        return { ...errorData, explanation: 'Invalid response from myScribe.' };
      })
    );
  // Post processing
}
// Text to assess for expectations
export const assess = new BehaviorSubject<string>('');
// Currently selected expectation
export const expectation = new BehaviorSubject<
  DocuScopeRuleCluster | null | undefined
>(null);
export const [useExpectation, expectation$] = bind(expectation, null);
// emit when true when there is text and an expectation to process.
export const [useAssessAvailable, assessAvailable$] = bind(
  combineLatest({ text: assess, question: expectation }).pipe(
    map(({ text, question }) => text.trim() !== '' && !!question?.name)
  ),
  false
);
// bind to use assess in react components.
export const [useAssess, assess$] = bind(assess, undefined);
// if scribe is available and have new text and expectation,
// then fetch results while emiting SUSPENSE while waiting
// for the results.
const assessed = combineLatest({
  text: assess,
  scribe: scribe$,
  expectation: expectation,
}).pipe(
  filter(({ scribe }) => scribe),
  filter(({ text }) => text.trim().length > 0),
  filter(({ expectation }) => !!expectation && 'name' in expectation),
  distinctUntilChanged(
    (a, b) => a.text === b.text && a.expectation?.name === b.expectation?.name
  ),
  switchMap(({ text, expectation }) =>
    concat<[SUSPENSE, AssessmentData]>(
      of(SUSPENSE),
      // TODO use straight expectation.  need to filter on is_group === false
      requestAssess(
        text,
        expectation?.raw.name ?? '',
        expectation?.raw.description ?? ''
      )
    )
  )
);
export const [useAssessment, assessment$] = bind(assessed, SUSPENSE);

/****** Logical Flow Audit ******/
export const [useScribeFeatureLogicalFlow, featureLogicalFlow] = bind(
  settings$.pipe(map((settings) => !!settings.logical_flow)),
  false
);

type TextAudit = {
  text: string;
  comment: AuditData | string;
};
type AuditData = {
  rating: number;
  explanation: string;
};

function requestAudit<T>(
  text: string,
  endpoint: 'logical_flow' | 'topics',
  feedback: string = 'An error occurred.'
) {
  return fromFetch(`/api/v2/scribe/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).pipe(
    switchMap((response) => {
      if (!response.ok) {
        return of({ error: true, message: `Error ${response.status}` });
      }
      return response.json();
    }),
    catchError((err) => {
      console.error(err);
      return of({ error: true, message: err.message });
    }),
    map((data: ChatResponse) => {
      if ('error' in data) {
        console.error(data.message);
        return feedback;
      }
      if ('choices' in data) {
        const content = data.choices.at(0)?.message.content;
        if (typeof content === 'string') {
          try {
            // attempt to parse as json
            return JSON.parse(content);
          } catch {
            // assume that parsing failed therefor it should be a string
            return content;
          }
        }
      }
      return '';
    }),
    map((comment) => ({ text, comment }) as T)
  );
}

export const logicalFlowText = new BehaviorSubject<string>('');
export const [useLogicalFlow, logicalFlow$] = bind(logicalFlowText, '');
const logicalFlowAnalysis = combineLatest({
  text: logicalFlowText,
  scribe: scribe$,
}).pipe(
  filter((c) => c.scribe),
  filter((c) => c.text.trim().length > 0),
  distinctUntilKeyChanged('text'),
  switchMap((c) =>
    concat<[SUSPENSE, TextAudit]>(
      of(SUSPENSE),
      requestAudit<TextAudit>(
        c.text,
        'logical_flow',
        'An error occurred while auditing your text.'
      )
    )
  )
);
export const [useLogicalFlowAudit, logicalFlowAudit$] = bind<
  SUSPENSE | TextAudit
>(logicalFlowAnalysis, SUSPENSE);

/***** Topics *****/
export const [useScribeFeatureTopics, featureTopics$] = bind(
  settings$.pipe(map((settings) => !!settings.topics)),
  false
);

type TextList = {
  text: string;
  comment: string;
};
export const topicsAuditText = new BehaviorSubject<string>('');
export const [useTopicsAuditText, topicsAuditText$] = bind(topicsAuditText, '');
export const [useTopicsAudit, topicsAudit$] = bind<SUSPENSE | TextList>(
  combineLatest({
    text: topicsAuditText,
    scribe: scribe$,
  }).pipe(
    filter((c) => c.scribe),
    filter((c) => c.text.trim().length > 0),
    distinctUntilKeyChanged('text'),
    switchMap((c) =>
      concat<[SUSPENSE, TextList]>(
        of(SUSPENSE),
        requestAudit<TextList>(
          c.text,
          'topics',
          'An error occurred while scanning for topics.'
        )
      )
    )
  ),
  SUSPENSE
);
