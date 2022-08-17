import DocuScopeRuleChild from "./DocuScopeRuleChild";
import DataTools from "./DataTools";

/**
 *
 */
export default class DocuScopeRule {
  /**
   *
   */
  constructor() {
    let dTools = new DataTools();

    this.id = dTools.uuidv4();
    this.name = "unassigned";
    this.description = "unassigned";
    this.type = "unassigned";
    this.is_group = false;
    this.cv_description = "unassigned";
    this.children = [];
  }

  /**
   *
   */
  getJSONObject () {
    let aRule={};

    aRule.id = this.id;
    aRule.name = this.name;
    aRule.description = this.description;
    aRule.type = this.type;
    aRule.is_group = this.is_group;
    aRule.cv_description = this.cv_description;

    aRule.children = [];

    for (let i=0;i<this.children.length;i++) {
      let aClusterObject=this.children [i];
      let aTopicCluster=aClusterObject.getJSONObject ();
      aRule.children.push (aTopicCluster);
    }

    return (aRule);
  }

  /**
   *
   */
  parse(anObject) {
    //console.log ("parse ()");

    this.raw = anObject; // We will need to make sure we can remove this since everything should be wrapped    

    this.name = anObject.name;
    this.description = anObject.description;
    this.type = anObject.type;
    this.is_group = anObject.is_group;
    this.cv_description = anObject.cv_description;

    for (let i = 0; i < anObject.children.length; i++) {
      let childObject = anObject.children[i];
      let newChild = new DocuScopeRuleChild();
      newChild.parse(childObject);
      this.children.push(newChild);
    }
  }
}
