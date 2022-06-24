import DocuScopeRule from "./DocuScopeRule";

/**
 *
 */
export default class DocuScopeRules {
  /**
   *
   */
  constructor() {
    this.name = "unassigned";
    this.rules = [];
    this.ready = false;
    this.original = null;
  }

  /**
   *
   */
  getReady() {
    return this.ready;
  }

  /**
   *
   */
  parseString(aString) {
    this.parse(JSON.parse(aString));
  }

  /**
   *
   */
  parse(anObject) {
    console.log ("parse ()");
    
    this.original = anObject;
    this.name = anObject.name;

    for (let i = 0; i < anObject.rules.length; i++) {
      let ruleObject = anObject.rules[i];
      let newRule = new DocuScopeRule();
      newRule.parse(ruleObject);
      this.rules.push(newRule);
    }

    this.ready = true;

    this.debugRules();
  }

  /**
   *
   */
  debugRules() {
    console.log("debugRules ()");

    console.log (this.original);

    /*
    console.log("+ Name: " + this.name);
    console.log("+ Rules ");

    for (let i = 0; i < this.rules.length; i++) {
      let aRule = this.rules[i];
      console.log("+-- " + aRule.name);
      console.log("  +-- " + aRule.description);
      console.log("  +-- " + aRule.type);
    }
    */
  }

  /**
   *
   */
  getRule(anId) {
    console.log("getRule (" + anId + ")");

    for (let i = 0; i < this.rules.length; i++) {
      let aRule = this.rules[i];
      if (aRule.id == anId) {
        return aRule;
      }
    }

    return null;
  }

  /**
   *
   */
  getRuleChild(anId) {
    console.log("getRule (" + anId + ")");

    for (let i = 0; i < this.rules.length; i++) {
      let aRule = this.rules[i];

      for (let j = 0; j < aRule.children.length; j++) {
        let aRuleChild = aRule.children[j];
        if (aRuleChild.id == anId) {
          return aRuleChild;
        }
      }
    }

    return null;
  }
}
