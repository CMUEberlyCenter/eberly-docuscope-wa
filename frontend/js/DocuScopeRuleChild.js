
import DataTools from "./DataTools";

/**
 * This needs to be refactored to: DocuScopeRuleCluster
 */
export default class DocuScopeRuleChild {
  /**
   *
   */
  constructor() {
    let dataTools = new DataTools();

    this.id = dataTools.uuidv4();
    this.name = "";
    this.description = "";
    this.examples = "";
    this.sentenceCount = 0;

    this.raw = {};
  }

  /**
   * For now the rule manager maintains this object in its raw form. In future versions
   * we will start parsing and processing it.
   */
  getJSONObject () {
    return (this.raw);
  }

  /**
   * Here we make sure that we have a custom_topics field
   */
  parse(anObject) {
    //console.log("parse ()");

    this.raw = anObject; // We will need to make sure we can remove this since everything should be wrapped

    this.name = anObject.name;
    this.description = anObject.description;
    this.examples = anObject.examples;

    if (anObject.sentenceCount) {
      this.sentenceCount=anObject.sentenceCount;
    }

    let topics=anObject.topics;

    if (topics) {
      if (topics.length>0) {
        if (!topics [0].pre_defined_topics) {
          topics [0].pre_defined_topics=[];
        }

        if (!topics [0].custom_topics) {
          topics [0].custom_topics=[];
        }
      }
    }     

    //console.log (this.raw);
  }
}
