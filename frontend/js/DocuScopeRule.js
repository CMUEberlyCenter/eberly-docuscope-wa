import { v4 as uuidv4 } from 'uuid';
import DocuScopeRuleChild from "./DocuScopeRuleChild";

/**
 *
 */
export default class DocuScopeRule {
  /**
   *
   */
  constructor() {
    this.id = uuidv4();
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
  getJSONObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      is_group: this.is_group,
      cv_description: this.cv_description,
      children: this.children.map((topic) => topic.getJSONObject()),
    };
  }

  /**
   *
   */
  parse(anObject) {
    console.log("parse ()");

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
