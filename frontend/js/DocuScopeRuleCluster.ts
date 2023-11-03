import { v4 as uuidv4 } from 'uuid';

export interface Topic {
  lemma: string;
  user_defined: boolean;
  pre_defined_topics?: string[];
  custom_topics?: string[];
  no_lexical_overlap: boolean;
}
export interface Rule {
  name: string;
  description: string;
  topics: Topic[];
  examples: string;
  type: string;
  is_group: boolean;
  children: Rule[];
  cv_description: string;
  parent: string;
  sentenceCount?: number;
}
/**
 *
 */
export class DocuScopeRuleCluster {
  id = uuidv4();
  name = '';
  description = '';
  examples = '';
  sentenceCount = 0;

  raw: Rule;

  /**
   *
   */
  constructor(raw: Rule) {
    this.raw = raw;
    this.parse(raw);
  }

  /**
   * For now the rule manager maintains this object in its raw form. In future versions
   * we will start parsing and processing it.
   */
  getJSONObject() {
    return this.raw;
  }

  /**
   * Here we make sure that we have a custom_topics field
   */
  parse(anObject: Rule) {
    this.raw = anObject; // We will need to make sure we can remove this since everything should be wrapped

    this.name = anObject.name;
    this.description = anObject.description;
    this.examples = anObject.examples;

    if (anObject.sentenceCount) {
      this.sentenceCount = anObject.sentenceCount;
    }

    const topics = anObject.topics;

    if (topics) {
      if (topics.length > 0) {
        if (!topics[0].pre_defined_topics) {
          topics[0].pre_defined_topics = [];
        }

        if (!topics[0].custom_topics) {
          topics[0].custom_topics = [];
        }
      }
    }
  }
}
