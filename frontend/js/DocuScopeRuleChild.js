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
    this.name = "unassigned";
    this.description = "unassigned";
  }

  /**
   *
   */
  parse(anObject) {
    //console.log("parse ()");

    this.name = anObject.name;
    this.description = anObject.description;
  }
}
