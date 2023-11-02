import { v4 as uuidv4 } from 'uuid';
import { DocuScopeRuleCluster, Rule } from "./DocuScopeRuleCluster";

/**
 *
 */
export default class DocuScopeRule {
  id = uuidv4();
  name = "unassigned";
  description = "unassigned";
  type = "unassigned";
  is_group = false;
  cv_description = "unassigned";
  children: DocuScopeRuleCluster[] = [];

  raw?: Rule;
  /**
     *
     */
  constructor(rule?: Rule) {
    if (rule) {
      this.parse(rule);
    }
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
  parse(anObject: Rule) {
    this.raw = anObject; // We will need to make sure we can remove this since everything should be wrapped

    this.name = anObject.name;
    this.description = anObject.description;
    this.type = anObject.type;
    this.is_group = anObject.is_group;
    this.cv_description = anObject.cv_description;

    this.children = anObject.children.map(child =>
      new DocuScopeRuleCluster(child));
  }
}
