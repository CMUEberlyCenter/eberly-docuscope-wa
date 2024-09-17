import { bind } from '@react-rxjs/core';
import { type ChatCompletion } from 'openai/resources/chat/completions';
import {
  BehaviorSubject,
  distinctUntilChanged,
  map
} from 'rxjs';
import {
  AssessExpectationRequest,
  NotesRequest,
  TextRequest,
} from '../../lib/Requests';
import { Rule, WritingTask } from '../../lib/WritingTask';
import {
  CopyEditResponse,
  ExpectationData,
  LocalCoherenceResponse,
  SelectedText
} from '../lib/ToolResults';
import { settings$ } from './settings.service';

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

export async function postConvertNotes(
  { text }: SelectedText,
  output: 'prose' | 'bullets' = 'prose',
  writing_task?: WritingTask | null
) {
  const endpoint =
    output === 'bullets' ? 'convert_to_bullets' : 'convert_to_prose';
  const { user_lang, target_lang } = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notes: text,
      user_lang,
      target_lang,
    } as NotesRequest),
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
  console.error(data);
  return '';
}


/*** Fix Grammar ***/
export const [useScribeFeatureGrammar, grammarFeature$] = bind(
  settings$.pipe(map((settings) => settings.grammar)),
  false
);


/*** Clarify selected text ***/

async function postText<
  T extends { explanation: string } | { general_assessment: string },
>(
  endpoint: string,
  errorData: T,
  { text }: SelectedText,
  writing_task?: WritingTask | null
): Promise<T> {
  const { user_lang, target_lang } = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, user_lang, target_lang } as TextRequest),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error(err);
    return { ...errorData, explanation: err };
  }
  const data: ChatResponse = await response.json();
  if ('error' in data) {
    console.error(data.message);
    return { ...errorData, explanation: data.message };
  }
  if ('choices' in data) {
    const content = data.choices.at(0)?.message.content;
    if (content) {
      try {
        return JSON.parse(content) as T;
      } catch (err) {
        console.log(content);
        console.error(err);
        if (err instanceof Error) {
          return { ...errorData, explanation: err.message };
        }
      }
    }
  }
  console.error(data);
  return { ...errorData, explanation: 'Invalid response from service.' };
}
export const postClarifyText = (
  selected: SelectedText,
  writing_task?: WritingTask | null
) =>
  postText<CopyEditResponse>(
    'copyedit',
    {
      revision: '',
      clean_revision: '',
      explanation: '',
    },
    selected,
    writing_task
  );

export const [useScribeFeatureClarify, clarifyFeature$] = bind(
  settings$.pipe(map((settings) => settings.grammar)),
  false
);


/*** Assess Expectations ***/
export const [useAssessFeature, assessFeature$] = bind(
  settings$.pipe(map((settings) => settings.assess_expectations)),
  false
);

const errorExpectationData: ExpectationData = {
  rating: 0.0,
  general_assessment: '',
  issues: [],
};

export async function postExpectation(
  text: string,
  { name, description }: Rule,
  writing_task?: WritingTask | null
): Promise<ExpectationData> {
  const { user_lang, target_lang } = writing_task?.info ?? {};
  const response = await fetch('/api/v2/scribe/assess_expectation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      user_lang,
      target_lang,
      expectation: name,
      description,
    } as AssessExpectationRequest),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error(err);
    // return { ...errorData, explanation: err };
    return { ...errorExpectationData, general_assessment: err };
  }
  const data: ChatResponse = await response.json();
  if ('error' in data) {
    console.error(data.message);
    // return {
    //   ...errorData,
    //   explanation: data.message,
    // };
    return {
      ...errorExpectationData,
      general_assessment: data.message,
    };
  }
  if ('choices' in data) {
    const content = data.choices.at(0)?.message.content;
    if (content) {
      // return JSON.parse(content) as AssessmentData;
      return JSON.parse(content) as ExpectationData;
    }
  }
  console.error(data);
  // return { ...errorData, explanation: 'Invalid respose from service.' };
  return {
    ...errorExpectationData,
    general_assessment: 'Invalid respose from service.',
  };
}

/****** Logical Flow Audit ******/

export const postFlowText = (
  selected: SelectedText,
  writing_task?: WritingTask | null
) =>
  postText<LocalCoherenceResponse>(
    'local_coherence',
    {
      rating: 0,
      general_assessment: '',
      issues: [],
    },
    selected,
    writing_task
  );

export const [useScribeFeatureLogicalFlow, featureLogicalFlow] = bind(
  settings$.pipe(map((settings) => !!settings.logical_flow)),
  false
);


/***** Topics *****/
export const [useScribeFeatureTopics, featureTopics$] = bind(
  settings$.pipe(map((settings) => !!settings.topics)),
  false
);
