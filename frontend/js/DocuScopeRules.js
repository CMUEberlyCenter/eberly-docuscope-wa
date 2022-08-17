
import DataTools from "./DataTools";
import DocuScopeRule from "./DocuScopeRule";
import DocuScopeSessionStorage from "./DocuScopeSessionStorage";

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
    this.sessionStorage=new DocuScopeSessionStorage ("dswa");
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
    this.original=JSON.parse (aString);
    this.parse();
  }

  /**
   * 
   */
  parse () {
    console.log ("parse ()");

    // Does this even make sense?
    //this.name = this.original.name;

    for (let i = 0; i < this.original.length; i++) {
      let ruleObject = this.original [i];
      let newRule = new DocuScopeRule();
      newRule.parse(ruleObject);
      this.rules.push(newRule);
    }
  }

  /**
   * 
   */
  getJSONObject () {
    let constructed=[];

    for (let i=0;i<this.rules.length;i++) {
      let aRule=this.rules [i];
      constructed.push (aRule.getJSONObject ());  
    }

    return (constructed);
  }

  /**
   * When this method is called it is given a fresh JSON object, which represents the template
   * rules as we got them from the server. However, we need to compare that to what the user
   * might have already worked on
   */
  load(anObject) {
    console.log ("load ()");
    
    let newRules=true;

    // We have to make a small accomodation for rules coming in as part of a JSON HTTP message
    // This will be smoothed out soon after v1.
    this.original = anObject.rules;

    let stored=this.sessionStorage.getJSONObject("rules");

    // First time use, we'll make the rules loaded from the server our place to start
    if (stored!=null) {
      if (this.dataTools.isEmpty (stored)==false) {
        console.log ("Using stored rules");
        this.original = stored;
        newRules=false;
      } else {
        console.log ("Nothing stored yet, defaulting to template version");
      }
    }

    this.parse ();

    // Make sure we have at least something stored in case this is the first time
    // we load the data from the template. Shouldn't hurt if we overwrite
    if (newRules==true) {
      this.save ();
    }

    this.ready = true;

    this.debugRules();
  }

  /**
   *
   */
  save () {
    console.log ("save ()");

    // Re-create the JSON structure
    let raw=this.getJSONObject ();

    console.log ("Saving: ");
    console.log (raw);

    this.sessionStorage.setJSONObject("rules",raw);
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
   * Return the array of custom/pre-defined topics as a single newline separated string
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
    
    let topics=clusterObject.topics;

    /*
    if (topics) {
      for (let i=0;i<topics.length;i++) {
        let topicList=topics [i].pre_defined_topics;
        if (i>0) {
          topicText+="\n";
        }
        for (let j=0;j<topicList.length;j++) {
          topicText+="\n";
          topicText+=topicList[j];
        }
      }
    }
    */

    if (topics) {
      let topicList=topics [0].pre_defined_topics;
      if (topicList) {
        for (let j=0;j<topicList.length;j++) {
          if (j>0) {
            topicText+="\n";
          }
          topicText+=topicList[j];
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
            let rawTopics=topics [0].pre_defined_topics;
            for (let k=0;k<rawTopics.length;k++) {
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
   * aCustomTopicSet needs to be an array if terms: ["Topic 1","Topic 2"]
   */
  setClusterCustomTopics (aRule, aCluster, aCustomTopicSet) {
    console.log ("setClusterCustomTopics ("+aRule + ", " + aCluster +")");

    // This retrieves one of our own objects, not a raw JSON object
    let cluster=this.getClusterByIndex (aRule,aCluster);
    if (cluster==null) {
      return (false);
    }

    // Let's change in place for now
    let clusterObject=cluster.raw;

    let topics=clusterObject.topics;
    if (topics) {
      if (topics.length>0) {
        let defaulTopicObject=topics [0];
        if (defaulTopicObject.pre_defined_topics) {
          defaulTopicObject.pre_defined_topics=aCustomTopicSet;
        }
      } else {
        return (false);
      }
    } else {
      return (false);
    }

    this.save();

    return (true);
  }
}
