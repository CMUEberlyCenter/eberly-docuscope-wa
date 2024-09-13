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

type Lemma = Array<string | boolean | null | number>;
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
// Best guess as to what this is supposed to be.
export type ClarityData = Array<
  | string // for paragraph breaks
  | [
      number, // paragraph index (1-based)
      number, // sentence index (1-based)
      SentenceData,
      ClaritySentenceData,
      boolean, // skip punctuation
    ]
>;

export type OnTopicData = {
  clarity?: ClarityData;
  coherence?: CoherenceData;
  html?: string;
  html_sentences?: string[][];
  local?: LocalData[];
};

export const cleanAndRepairSentenceData = (
  data?: { html_sentences?: string[][] } | null
) => {
  if (!data || !data.html_sentences) return null;
  return data.html_sentences.map((paragraph) =>
    paragraph.filter((sentence) => sentence !== '')
  ); // sentence.trim()?
};
