function isStringArray(arr: unknown): arr is string[] {
  return arr instanceof Array && arr.every((item) => typeof item === 'string');
}

export type Topic = {
  lemma: string;
  /** True if topic is user generated. */
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
  /** Rule name, used for rule lookup. */
  name: string;
  /** Human readable description of the rule. */
  description: string;
  topics?: Topic[];
  examples?: string;
  type: string;
  is_group: boolean;
  children: Rule[];
  cv_description?: string;
  /**
   * Parent rule name.
   *
   * @TJS-type ["string", "null"]
   */
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

function* leafRuleGenerator(rule: Rule): Generator<Rule> {
  if (rule.children.length === 0) {
    yield rule;
  } else {
    for (const child of rule.children) {
      yield* leafRuleGenerator(child);
    }
  }
}
export function getExpectations(task: WritingTask | null) {
  return task === null
    ? []
    : task.rules.rules.flatMap((rule) => [...leafRuleGenerator(rule)]);
}

export type WritingTaskMetaData = {
  /** Title of the Writing Task/Outline */
  name: string;
  /** String used to identify the version of the outline, expected to be a SemTag */
  version: string;
  /** Author of the outline. */
  author: string;
  /** Copyright information. */
  copyright: string;
  /** Last modified date, expected to be ISO 8601 format. */
  saved: string; // DateTime
  /** OS filename */
  filename: string;
  dict_path?: string;
  /** Optionally specify the input language for LLM templates. (Default configured in server settings) */
  user_lang?: string;
  /** Optinally specify the output language for LLM templates. (Default configured in server settings) */
  target_lang?: string;
  /** Keywords, optionally prefixed with a special tag like "category:" */
  keywords?: string[];
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

function extractKeywords(tasks: WritingTask[]) {
  return tasks.flatMap((task) => task.info.keywords ?? []);
}
/**
 * Given a set of writing tasks, generate a mapping of categories
 * to co-occuring keywords.
 * @param tasks A list of writing task specifications.
 * @returns An object that maps "category:..." keywords to an array
 * of keywords that cooccur with that category.
 */
export function keywordsByCategory(tasks: WritingTask[]): {
  [k: string]: string[];
} {
  const acc = tasks.reduce(
    (acc, task) => {
      const { category, keyword } = categoryKeywords([task]);
      const keywords = new Set(keyword);
      category?.forEach((cat: string) => {
        acc[cat] = cat in acc ? acc[cat].union(keywords) : new Set(keyword);
      });
      acc.ALL = acc.ALL.union(keywords);
      return acc;
    },
    { ALL: new Set() } as Record<string, Set<string>>
  );
  return Object.fromEntries(
    Object.entries(acc).map(([key, val]) => [key, [...val].toSorted()])
  );
}
export function categoryKeywords(tasks: WritingTask[]) {
  return Object.groupBy(
    extractKeywords(tasks),
    (key) => /^(\w+):\s*(.*)/.exec(key)?.at(1) ?? 'keyword'
  );
}
export function hasKeywords(task: WritingTask, keywords: string[]) {
  if (!task.info.keywords) return false;
  if (keywords.length === 0) return false;
  const keys = new Set(task.info.keywords);
  return keywords.some((key) => keys.has(key));
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
  /** Title of the rule set. */
  name: string;
  /** Human readable description of the overall rule set/outline. */
  overview: string;
  /** List of top-level rules. */
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

/**
 * Schema for a myProse writing tasks specification json file.
 *
 * @$id writing-task
 * @$comment JSON schema file should not be modified as it is generated from the typescript definition using 'npx typescript-json-schema'.
 * @additionalProperties false
 */
export type WritingTask = {
  /** Outline rules. */
  rules: Rules;
  /** Extra information for Impressions tool. */
  impressions: Impressions;
  values: unknown;
  /** Metadata about the task. */
  info: WritingTaskMetaData;
  /** Additional information that can be instantiated in the LLM prompts. */
  extra_instructions?: string;
  wtd_version?: string;
  /** True if the task is listed in publicly available listings.  This is normally set by the server. */
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
