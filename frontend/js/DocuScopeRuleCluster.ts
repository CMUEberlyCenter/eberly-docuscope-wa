import { v4 as uuidv4 } from 'uuid';
import { Rule } from '../src/lib/Configuration';

/**
 *
 */
export class DocuScopeRuleCluster {
  id = uuidv4();
  name = '';
  description = '';
  examples?: string = '';
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
