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

/** Prompt data for formulating OpenAI requests. */
export type Prompt = {
  prompt: string;
  role?: string;
  temperature?: number | string;
};

export type ConfigurationInformation = {
  name: string;
  version: string;
  author: string;
  copyright: string;
  saved: string;
  filename: string;
};

export type ConfigurationFile = {
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
  prompt_templates: Record<string, Prompt>;
};

export type Configuration = ConfigurationFile & { id: string };
