import DataTools from "./DataTools";
import DocuScopeRule from "./DocuScopeRule";

/**
 * This needs to be refactored to: DocuScopeRuleManager
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
    this.version = "1.0.0?";

    this.dataTools=new DataTools ();
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
  getVersion () {
    if (this.ready==false) {
      return ("No rules loaded yet")
    }

    return (this.name + ": (" + this.version + ")");
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
  /* 
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
  */

  /**
   * 
   */
  getCluster (aRule, aCluster) {
    console.log ("getCluster ("+ aRule + "," + aCluster + ")");

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      if (rule.id==aRule) {
        for (let j = 0; j < rule.children.length; j++) {
          let cluster = rule.children[j];
          if (cluster.id == aCluster) {
            return aCluster;
          }
        }
      }
    }

    console.log ("No cluster found");

    return null;
  }

  /**
   * 
   */
  getClusterByIndex (aRule, aCluster) {
    //console.log ("getClusterByIndex ("+ aRule + "," + aCluster + ")");

    if ((aRule==-1) || (aCluster==-1)) { 
      //console.log ("Either rule or cluster is -1");
      return (null);      
    }

    let rule = this.rules[aRule];

    if (rule!=null) {
      if (rule.children) {
        return (rule.children [aCluster]);
      }
    }

    return null;
  }  

  /**
   * 
   */
  getClusterTopicText (aCluster) {
    //console.log ("getClusterTopicText ()");
    //console.log (aCluster);

    let topicText="";

    if (aCluster==null) {
      console.log ("Warning: cluster is null");
      return (topicText);
    }

    let clusterObject=aCluster.raw;

    //console.log (clusterObject);

    let topics=clusterObject.topics;
    if (topics) {
      for (let i=0;i<topics.length;i++) {
        let topicList=topics [i].pre_defined_topics;
        for (let j=0;j<topicList.length;j++) {
          topicText=topicText+(topicList [j]+"\n");
        }
      }
    }

    return (topicText);
  }

  /**
   * Get all the custom topics from all the rules and all the clusters. This should be whatever
   * we started with in the rules as edited by the user in the interface
   */
  getAllCustomTopics () {
    let topicText="";
    let tempList=[];

    for (let i=0;i<this.rules.length;i++) {
      let rule=this.rules [i];
      for (let j=0;j<rule.children.length;j++) {
        let cluster=rule.children [j];
        let clusterObject=cluster.raw;

        let topics=clusterObject.topics;
        if (topics) {
          if (topics.length>0) {
            //return (topics [0].pre_defined_topics);
            let rawTopics=topics [0].pre_defined_topics;
            for (let k=0;k<rawTopics.length;k++) {
              //topicText+=(";"+rawTopics [k]);
              tempList.push(rawTopics [k]);
            }
          }
        }
      }
    }

    // Slow? Sure. Always a short enough list? Also sure
    for (let l=0;l<tempList.length;l++) {
      if (l>0) {
        topicText+=";";
      }

      topicText+=tempList [l].trim();
    }

    return (topicText);
  }

  /**
   * 
   */
  setClusterCustomTopics (aRule, aCluster, aCustomTopicSet) {
    let cluster=this.getClusterByIndex (aRule,aCluster);
    if (cluster==null) {
      return (false);
    }

    let clusterObject=this.dataTools.deepCopy (cluster.raw);

    let topics=clusterObject.topics;
    if (topics) {
      if (topics.length>0) {
        let defaulTopicObject=topics [0];
        if (defaultTopicObject.pre_defined_topics) {
          defaultTopicObject.pre_defined_topics=this.dataTools.textToOnTopicList (aCustomTopicSet);
          cluster.raw=clusterObject;
        }
      }
    }

    return (true);
  }
}
