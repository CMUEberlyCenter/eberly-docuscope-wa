import { bind } from '@react-rxjs/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import DocuScopeRules from '../lib/DocuScopeRules';
import { currentTool$ } from './current-tool.service';
import { lockedEditorText$ } from './editor-state.service';

// type ErrorData = { error: string }

type CoherenceParagraph = {
  first_left_sent_id: number;
  is_left: boolean;
  is_topic_sent: boolean;
  para_pos: number;
} | null;

type CoherenceDatum = {
  is_non_local?: boolean;
  is_topic_cluster?: boolean;
  paragraphs: CoherenceParagraph[];
  sent_count?: number;
  topic: string[];
};

type CoherenceData = {
  error?: string;
  data: CoherenceDatum[];
  num_paras: number;
  num_topics: number;
};

type LocalData = {
  error?: string;
  data: {
    is_global: boolean;
    is_non_local?: boolean;
    is_topic_cluster?: boolean;
    num_sents: number;
    sentences: ({
      is_left: boolean;
      is_topic_sent: boolean;
      para_pos: number;
      sent_pos: number;
    } | null)[];
    topic: string[];
  }[];
  num_topics: number;
};

// Best guess as to what this is supposed to be.
type ClarityData = [number, number, Record<string, unknown>, string][];

type OnTopicData = {
  clarity?: ClarityData;
  //   clarity?: (string | (number | {
  //     BE_VERB: boolean
  //     HNOUNS: number
  //     L_HNOUNS: number
  //     L_NOUNS: [string, string, string, boolean, string, string, null, boolean, number, null][]
  //   })[])[]
  coherence?: CoherenceData;
  html?: string;
  html_sentences?: string[][];
  local?: LocalData[];
};

// Shape of json sent to onTopic.
type onTopicRequest = {
  custom: string;
  customStructured: { lemma: string; topics: string[] }[];
  base: string;
};

const onTopicUrl = '/api/v2/ontopic'; // This should be in settings.

// Tools that use onTopic data.
const OnTopicTools = ['expectations', 'coherence', 'clarity'];

const onTopicToolText = combineLatest({
  text: lockedEditorText$,
  tool: currentTool$,
}).pipe(
  filter((c) => c.tool !== null && OnTopicTools.includes(c.tool)),
  map((c) => c.text),
  distinctUntilChanged()
);

export const [useOnTopicText, onTopicToolText$] = bind(onTopicToolText, null);

// TODO: initialize and store rules$ from local storage.
export const rules$ = new BehaviorSubject<DocuScopeRules | null>(null);
export const [useOnTopic, onTopic$] = bind(
  combineLatest({
    text: onTopicToolText,
    rules: rules$,
  }).pipe(
    filter((c) => !!c.rules && !!c.text), // only if there are rules and text to process.
    switchMap((c) =>
      fromFetch(onTopicUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'request',
          data: {
            base: encodeURIComponent(c.text),
            custom: c.rules?.getAllCustomTopics(),
            customStructured: c.rules?.getAllCustomTopicsStructured(),
          } as onTopicRequest,
        }),
      })
    ),
    switchMap(async (response) => {
      if (!response.ok) {
        throw new Error(`Bad server status ${response.statusText}`);
      }
      const raw = await response.json();
      // TODO: update rules.topicSentenceCount
      return raw as OnTopicData;
    }),
    catchError((err: Error) => {
      console.error(err);
      throw err;
    })
  ),
  null
);
