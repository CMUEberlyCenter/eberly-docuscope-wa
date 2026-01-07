import type { Optional } from '..';

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

// type Lemma = Array<string | boolean | null | number>;
type Lemma = [
  POS: string, // 0
  WORD: string, // 1
  LEMMA: string, // 2
  ISLEFT: boolean, // 3
  DEP: string, // 4
  STEM: string, // 5
  LINKS: Optional<number>, // 6
  QUOTE: boolean, // 7
  WORD_POS: number, // 8
  DS_DATA: Optional<Map<string, unknown>>, // 9
  // PARA_POS: number, // 10
  // SENT_POS: number, // 11
  // NEW: boolean, // 12
  // GIVEN: boolean, // 13
  // IS_SKIP: boolean, // 14
  // IS_TOPIC: boolean, // 15
];
type SentenceData = {
  NOUNS: number; // total # of nouns
  HNOUNS: number; // total # of head nouns
  L_HNOUNS: number; // head nouns on the left
  R_HNOUNS: number; // head nouns on the right
  L_NOUNS: Lemma[]; // nouns on the left
  R_NOUNS: Lemma[]; // nouns on the right
  MV_LINKS: number; // total # of links fron the root verb
  MV_L_LINKS: number; // total # of left links from the root veb
  MV_R_LINKS: number; // total # of right links from the root verb
  V_LINKS: number; // total # of links from all the non-root verbs
  V_L_LINKS: number; // total # of left links from all the non-root verbs
  V_R_LINKS: number; // total # of right links fromn all the non-root verbs
  NR_VERBS: number; // total # of non-root verbs
  NPS: string[];
  NUM_NPS: number; // # total # of NPs
  L_NPS: number;
  R_NPS: number;
  BE_VERB: boolean;
  NOUN_CHUNKS: { text: string; start: number; end: number }[];
  TOKENS: { text: string; is_root: boolean }[];
  MOD_CL: null | [number, number, string, number]; // [start, end, mod_cl, last_np]
};
type ClaritySentenceData = {
  text: string;
  text_w_info: Lemma[];
  sent_analysis: SentenceData;
  lemmas: Lemma[];
  accum_lemmas: Lemma[];
  given_lemmas: Lemma[];
  new_lemmas: Lemma[];
  given_accum_lemmas: Lemma[];
  new_accum_lemmas: Lemma[];
};
const isClaritySentenceData = (data: unknown): data is ClaritySentenceData =>
  !!data &&
  typeof data === 'object' &&
  'text' in data &&
  'text_w_info' in data &&
  Array.isArray(data.text_w_info) &&
  'sent_analysis' in data &&
  'lemmas' in data &&
  Array.isArray(data.lemmas) &&
  'accum_lemmas' in data &&
  Array.isArray(data.accum_lemmas) &&
  'given_lemmas' in data &&
  Array.isArray(data.given_lemmas) &&
  'new_lemmas' in data &&
  Array.isArray(data.new_lemmas) &&
  'given_accum_lemmas' in data &&
  Array.isArray(data.given_accum_lemmas) &&
  'new_accum_lemmas' in data &&
  Array.isArray(data.new_accum_lemmas);
// Best guess as to what this is supposed to be.
export type ClarityData = Array<
  | string // for paragraph breaks
  | [
      number, // paragraph index (1-based)
      number, // sentence index (1-based)
      ClaritySentenceData,
      boolean, // skip punctuation
    ]
>;
/** Type guard for ClarityData */
const isClarityData = (data: unknown): data is ClarityData =>
  Array.isArray(data) &&
  data.every(
    (item) =>
      typeof item === 'string' ||
      (Array.isArray(item) &&
        item.length === 4 &&
        typeof item[0] === 'number' &&
        typeof item[1] === 'number' &&
        isClaritySentenceData(item[2]) &&
        typeof item[3] === 'boolean')
  );

export type OnTopicData = {
  clarity?: ClarityData;
  coherence?: CoherenceData;
  html?: string;
  html_sentences?: string[][];
  local?: LocalData[];
};
/** Type guard for OnTopicData */
export const isOnTopicData = (data: unknown): data is OnTopicData => {
  return (
    !!data &&
    typeof data === 'object' &&
    ('clarity' in data ? isClarityData(data.clarity) : true) &&
    ('coherence' in data ? data.coherence !== undefined : true) &&
    ('html' in data ? typeof data.html === 'string' : true) &&
    ('html_sentences' in data
      ? Array.isArray(data.html_sentences) &&
        data.html_sentences.every(
          (para: unknown) =>
            Array.isArray(para) &&
            para.every((sent) => typeof sent === 'string')
        )
      : true) &&
    ('local' in data ? Array.isArray(data.local) : true)
  );
};

/** Removes empty sentences from the html_sentences data. */
export const cleanAndRepairSentenceData = (data?: OnTopicData | null) => {
  return (
    data?.html_sentences?.map((paragraph) =>
      paragraph.filter((sentence) => sentence.trim() !== '')
    ) ?? null
  );
};
