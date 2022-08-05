import DataTools from "./DataTools";

/**
 * This needs to be refactored to: DocuScopeRuleCluster
 */
export default class DocuScopeRuleChild {
  /**
   *
   */
  constructor() {
    let dTools = new DataTools();

    this.id = dTools.uuidv4();
    this.name = "";
    this.description = "";
    this.examples = "";

    this.raw = {};
  }

  /**
   *
   */
  parse(anObject) {
    //console.log("parse ()");

    this.name = anObject.name;
    this.description = anObject.description;
    this.examples = anObject.examples;

    this.raw = anObject; // We will need to make sure we can remove this since everything should be wrapped
  }
}
