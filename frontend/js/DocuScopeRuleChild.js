import DataTools from "./DataTools";

/**
 *
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
  }

  /**
   *
   */
  parse(anObject) {
    //console.log("parse ()");

    this.name = anObject.name;
    this.description = anObject.description;
    this.examples = anObject.examples;
  }
}
