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


export type ConfigurationInformation = {
  name: string;
  version: string;
  author: string;
  copyright: string;
  saved: string; // DateTime
  filename: string;
  dict_path?: string;
  multi_lang?: boolean;
};

export const ERROR_INFORMATION: ConfigurationInformation = {
  name: 'NOT SET ERROR',
  version: 'ERROR',
  author: '',
  copyright: 'NONE',
  saved: 'UNKNOWN',
  filename: ''
};

/** Configuration file json data. */
export type ConfigurationData = {
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
  info: ConfigurationInformation;
  extra_instructions?: string;
  wtd_version?: string;
};

export type Configuration = ConfigurationData & { id: string };

/** Prompt data for formulating OpenAI requests. */
export type Prompt = {
  prompt: string;
  role?: string;
  temperature?: number | string;
};

type PromptType = "notes_to_prose" | "logical_flow" | "grammar" | "copyedit" | "expectation" | "topics"

/** Prompt templates file json data. */
export type PromptData = {
  templates: Record<PromptType, Prompt>;
  info: {
    saved_at: string; // DateTime
  }
}

