function isStringArray(arr: unknown): arr is string[] {
  return arr instanceof Array && arr.every((item) => typeof item === 'string');
}

export type Topic = {
  lemma: string;
  user_defined: boolean;
  pre_defined_topics?: string[];
  custom_topics?: string[];
  no_lexical_overlap: boolean;
};

function isTopic(topic: Topic | unknown): topic is Topic {
  return (
    !!topic &&
    typeof topic === 'object' &&
    'lemma' in topic &&
    typeof topic.lemma === 'string' &&
    'user_defined' in topic &&
    typeof topic.user_defined === 'boolean' &&
    'no_lexical_overlap' in topic &&
    typeof topic.no_lexical_overlap === 'boolean' &&
    ('pre_defined_topics' in topic
      ? isStringArray(topic.pre_defined_topics)
      : true) &&
    ('custom_topics' in topic ? isStringArray(topic.custom_topics) : true)
  );
}

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

function isRule(rule: Rule | unknown): rule is Rule {
  return (
    !!rule &&
    typeof rule === 'object' &&
    'name' in rule &&
    typeof rule.name === 'string' &&
    'description' in rule &&
    typeof rule.description === 'string' &&
    'type' in rule &&
    typeof rule.type === 'string' &&
    'is_group' in rule &&
    typeof rule.is_group === 'boolean' &&
    'children' in rule &&
    rule.children instanceof Array &&
    rule.children.every(isRule) &&
    ('topics' in rule
      ? rule.topics instanceof Array && rule.topics.every(isTopic)
      : true) &&
    ('examples' in rule ? typeof rule.examples === 'string' : true)
  );
}

export type WritingTaskMetaData = {
  name: string;
  version: string;
  author: string;
  copyright: string;
  saved: string; // DateTime
  filename: string;
  dict_path?: string;
  user_lang?: string;
  target_lang?: string;
};
function isWritingTaskMetaData(
  info: WritingTaskMetaData | unknown
): info is WritingTaskMetaData {
  return (
    !!info &&
    typeof info === 'object' &&
    'name' in info &&
    typeof info.name === 'string' &&
    'version' in info &&
    typeof info.version === 'string' &&
    'author' in info &&
    typeof info.author === 'string' &&
    'copyright' in info &&
    typeof info.copyright === 'string' &&
    'saved' in info &&
    typeof info.saved === 'string' &&
    'filename' in info &&
    typeof info.filename === 'string'
  );
}

export const ERROR_INFORMATION: WritingTaskMetaData = {
  name: 'NOT SET ERROR',
  version: 'ERROR',
  author: '',
  copyright: 'NONE',
  saved: 'UNKNOWN',
  filename: '',
};

type Rules = {
  name: string;
  overview: string;
  rules: Rule[];
};
function isRules(rules: unknown): rules is Rules {
  return (
    !!rules &&
    typeof rules === 'object' &&
    'name' in rules &&
    typeof rules.name === 'string' &&
    'overview' in rules &&
    typeof rules.overview === 'string' &&
    'rules' in rules &&
    rules.rules instanceof Array &&
    rules.rules.every(isRule)
  );
}

type Impressions = {
  common_clusters: string[];
  rare_clusters: string[];
};
function isImpressions(imp: unknown): imp is Impressions {
  return (
    !!imp &&
    typeof imp === 'object' &&
    'common_clusters' in imp &&
    isStringArray(imp.common_clusters) &&
    'rare_clusters' in imp &&
    isStringArray(imp.rare_clusters)
  );
}

/** Configuration file json data. */
export type WritingTask = {
  rules: Rules;
  impressions: Impressions;
  values: unknown;
  info: WritingTaskMetaData;
  extra_instructions?: string;
  wtd_version?: string;
  public?: boolean;
};

export function isWritingTask(
  task: WritingTask | unknown
): task is WritingTask {
  return (
    !!task &&
    typeof task === 'object' &&
    'rules' in task &&
    isRules(task.rules) &&
    'impressions' in task &&
    isImpressions(task.impressions) &&
    'info' in task &&
    isWritingTaskMetaData(task.info)
  );
}

// export const WritingTaskSchema = {
//   'rules.name': { isString: { errorMessage: 'Invalid rules.name'}},
//   'rules.info.name': { isString: { errorMessage}}
// }
