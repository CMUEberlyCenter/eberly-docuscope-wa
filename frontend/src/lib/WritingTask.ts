export type Topic = {
  lemma: string;
  user_defined: boolean;
  pre_defined_topics?: string[];
  custom_topics?: string[];
  no_lexical_overlap: boolean;
};

export type Rule = {
  name: string;
  description: string;
  topics?: Topic[];
  examples?: string;
  type: string;
  is_group: boolean;
  children: Rule[];
  cv_description?: string;
  parent?: string | null;
  sentenceCount?: number;
};

export type WritingTaskMetaData = {
  name: string;
  version: string;
  author: string;
  copyright: string;
  saved: string; // DateTime
  filename: string;
  dict_path?: string;
  multi_lang?: boolean;
};

export const ERROR_INFORMATION: WritingTaskMetaData = {
  name: 'NOT SET ERROR',
  version: 'ERROR',
  author: '',
  copyright: 'NONE',
  saved: 'UNKNOWN',
  filename: '',
};

/** Configuration file json data. */
export type WritingTask = {
  rules: {
    name: string;
    overview: string;
    rules: Rule[];
  };
  impressions: {
    common_clusters: string[];
    rare_clusters: string[];
  };
  values: unknown;
  info: WritingTaskMetaData;
  extra_instructions?: string;
  wtd_version?: string;
  public?: boolean;
};
