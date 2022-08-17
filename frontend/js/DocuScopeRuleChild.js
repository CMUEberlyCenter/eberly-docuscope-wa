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
   * For now the rule manager maintains this object in its raw form. In future versions
   * we will start parsing and processing it.
   */
  getJSONObject () {
    return (this.raw);
  }

  /**
   *
   */
  parse(anObject) {
    //console.log("parse ()");

    this.raw = anObject; // We will need to make sure we can remove this since everything should be wrapped

    this.name = anObject.name;
    this.description = anObject.description;
    this.examples = anObject.examples;

    //console.log (this.raw);
  }
}
