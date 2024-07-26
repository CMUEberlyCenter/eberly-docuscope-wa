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

export type OnTopicData = {
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

export const cleanAndRepairSentenceData = (
  data?: { html_sentences?: string[][] } | null
) => {
  if (!data || !data.html_sentences) return null;
  return data.html_sentences.map((paragraph) =>
    paragraph.filter((sentence) => sentence !== "")
  ); // sentence.trim()?
};