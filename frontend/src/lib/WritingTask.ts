import type { Optional } from '../index.d';

/** Test if the argument is an array of strings. */
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
    Array.isArray(rule.children) &&
    rule.children.every(isRule) &&
    ('topics' in rule
      ? Array.isArray(rule.topics) && rule.topics.every(isTopic)
      : true) &&
    ('examples' in rule ? typeof rule.examples === 'string' : true)
  );
}

/** Depth first generator for extracting leaf rules. */
function* leafRuleGenerator(rule: Rule): Generator<Rule> {
  if (rule.children.length === 0) {
    yield rule;
  } else {
    for (const child of rule.children) {
      yield* leafRuleGenerator(child);
    }
  }
}

/**
 * Extract the expectations from a writing task description.
 * Expectations are defined as leaf rules of a WritingTask.
 * @returns Array of expectations, [] if task is not a WritingTask.
 */
export function getExpectations(task: WritingTask | null) {
  return isWritingTask(task)
    ? task.rules.rules.flatMap((rule) => [...leafRuleGenerator(rule)])
    : [];
}

type ToolConfig = {
  /** Tool identifier */
  tool: string;
  /** Organizational information */
  category?: string;
  /** If tool is enabled for this writing task. */
  enabled: boolean;
};

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
  /** Optional dictionary location. (UNUSED) */
  dict_path?: string;
  /** Optionally specify the input language for LLM templates. (Default configured in server settings) */
  user_lang?: string;
  /** Optinally specify the output language for LLM templates. (Default configured in server settings) */
  target_lang?: string;
  /** Keywords, optionally prefixed with a special tag like "category:" */
  keywords?: string[];
  /** Additional descriptive notes from the author. */
  author_notes?: string;
  /** Per writing task tool configurations. */
  review_tools?: ToolConfig[];
  /** Optionally set the task as private. */
  access?: string;
};

/** Test if the given object is an instance of WritingTaskMetaData. */
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

/** Extract all keywords from an array of writing task definitions. */
export function extractKeywords(tasks: WritingTask[]) {
  return [
    ...new Set(tasks.flatMap((task) => task.info.keywords ?? [])),
  ].toSorted((a, b) => a.localeCompare(b));
}

/** Group keywords by category. */
export function groupByCategory(keywords: string[]) {
  return Object.groupBy(
    keywords,
    (key) => /^(\w+):\s*(.*)/.exec(key)?.at(1) ?? 'keyword'
  );
}

/**
 * Checks if the given task contains an intersection of the keyword types.
 * @param task a writing task definition
 * @param keywords list of keywords to check against
 * @returns true if the tasks keywords has some of each keyword type's keys.
 */
export function hasKeywords(task: WritingTask, keywords: string[]) {
  if (!task.info.keywords) return false;
  if (keywords.length === 0) return false;
  const catKeys = groupByCategory(keywords);
  return Object.entries(catKeys).every(([_, keys]) => {
    if (!keys) return true;
    const kw = new Set(keys);
    return task.info.keywords?.some((key) => kw.has(key));
  }); // Intersection between types of keywords.
}

/**
 * Test if a given tool is available according to the writing task definition.
 * @param task a writing task definition.
 * @param toolId tool identifier, often corresponds to prompt filename.
 * @returns true if the given tool is enabled for the writing task.
 */
export function isEnabled(
  task: Optional<WritingTask>,
  toolId: string
): boolean {
  // patch for #151 to support old WTDs
  if (!task) return false;
  if (!task.info.review_tools) {
    return !['prominent_topics', 'pathos'].includes(toolId);
  }
  return (
    task.info.review_tools?.some(
      ({ tool, enabled }) => tool === toolId && enabled
    ) ?? false
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

/** Container for the list of rules for the writing task and its metadata. */
type Rules = {
  /** Title of the rule set. */
  name: string;
  /** Human readable description of the overall rule set/outline. */
  overview: string;
  /** List of top-level rules. */
  rules: Rule[];
};
export function isRules(rules: unknown): rules is Rules {
  return (
    !!rules &&
    typeof rules === 'object' &&
    'name' in rules &&
    typeof rules.name === 'string' &&
    'overview' in rules &&
    typeof rules.overview === 'string' &&
    'rules' in rules &&
    Array.isArray(rules.rules) &&
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
  /** Extra value information, currently unused but reserved for future use. */
  values?: Record<string, string>;
  /** Metadata about the task. */
  info: WritingTaskMetaData;
  /** Additional information that can be instantiated in the LLM prompts. */
  extra_instructions?: string;
  /** Schema version. */
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

export function equivalentWritingTasks(
  a: WritingTask | null,
  b: WritingTask | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.info.name === b.info.name &&
    a.info.version === b.info.version &&
    a.info.author === b.info.author &&
    a.info.copyright === b.info.copyright &&
    a.info.saved === b.info.saved &&
    JSON.stringify(a.rules) === JSON.stringify(b.rules)
  );
}

// export const WritingTaskSchema = {
//   'rules.name': { isString: { errorMessage: 'Invalid rules.name'}},
//   'rules.info.name': { isString: { errorMessage}}
// }
