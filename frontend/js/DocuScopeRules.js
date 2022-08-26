
import DataTools from "./DataTools";
import DocuScopeTools from "./DocuScopeTools";
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

    this.dataTools = new DataTools ();
    this.docuscopeTools = new DocuScopeTools ();
    this.sessionStorage = new DocuScopeSessionStorage ("dswa");

    this.updateNotice = null;
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

    //console.log ("Saving: ");
    //console.log (raw);

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
    //console.log("getRule (" + anId + ")");

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
    //console.log ("getCluster ("+ aRule + "," + aCluster + ")");

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

    //console.log ("No cluster found");

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
   * We should provide an alternative method that doesn't need to traverse the
   * tree to obtain the count but which is given a pointer to the cluster to
   * start with
   */
  getClusterTopicCount (aRuleIndex, aClusterIndex) {
    //console.log ("getClusterTopicCount ("+ aRuleIndex + "," + aClusterIndex + ")");

    if ((aRuleIndex==-1) || (aClusterIndex==-1)) { 
      //console.log ("No valid rule or cluster provided");
      return (0);
    }

    let rule = this.rules[aRuleIndex];

    if (rule!=null) {
      if (rule.children) {
        let aCluster=rule.children [aClusterIndex];
        
        let clusterObject=aCluster.raw;
        
        let topics=clusterObject.topics;

        if (topics) {
          if (topics [0].custom_topics) {
            let topicList=topics [0].custom_topics;
            return (topicList.length);
          }
        }         
      }
    }

    return 0;
  }  

  /**
   * 
   */
  topicSentenceCount (aRuleIndex, aClusterIndex) {
    let aCluster=this.getClusterByIndex (aRuleIndex, aClusterIndex);
    if (aCluster) {
      return (aCluster.sentenceCount);
    }

    return(0);
  }

  /**
   * Return the array of custom/pre-defined topics as a single newline separated string
   */
  getClusterTopicTextStatic (aCluster) {
    //console.log ("getClusterTopicTextStatic ()");
    
    let topicText="";

    if (aCluster==null) {
      console.log ("Warning: cluster is null");
      return (topicText);
    }

    let clusterObject=aCluster.raw;
    
    let topics=clusterObject.topics;

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
   * Return the array of custom/pre-defined topics as a single newline separated string
   */
  getClusterTopicText (aCluster) {
    //console.log ("getClusterTopicText ()");
    
    let topicText="";

    if (aCluster==null) {
      console.log ("Warning: cluster is null");
      return (topicText);
    }

    let clusterObject=aCluster.raw;
    
    let topics=clusterObject.topics;

    if (topics) {
      let topicList=topics [0].custom_topics;
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

            let rawTopicsStatic=topics [0].pre_defined_topics;
            for (let k=0;k<rawTopicsStatic.length;k++) {
              tempList.push(rawTopicsStatic [k]);
            }

            let rawTopics=topics [0].custom_topics;
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
    console.log (aCustomTopicSet);

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
        /*
        if (defaulTopicObject.pre_defined_topics) {
          defaulTopicObject.pre_defined_topics=aCustomTopicSet;
        }
        */
        if (defaulTopicObject.custom_topics) {
          defaulTopicObject.custom_topics=aCustomTopicSet;
        }        
      } else {
        return (false);
      }
    } else {
      return (false);
    }

    this.save();

    if (this.updateNotice) {
      this.updateNotice ();
    }

    return (true);
  }

  /**
   * 
   */
  updateLemmaCounts (aCountList) {
    console.log ("updateLemmaCounts ()");

    for (let i=0;i<aCountList.length;i++) {
      let aLemmaCount=aCountList [i];

      for (let i=0;i<this.rules.length;i++) {
        let rule=this.rules [i];
        for (let j=0;j<rule.children.length;j++) {
          let cluster=rule.children [j];
          // Reset the count, we can do that because the count list has everything coming in from the back-end
          cluster.sentenceCount=0; 
          let clusterObject=cluster.raw;
          let topics=clusterObject.topics;

          if (topics) {
            if (topics.length>0) {
              let targetTopic=topics [0];
              let debit=0;

              // Match pre-defined toptics first
              
              if (targetTopic.pre_defined_topics) {
                for (let k=0;k<targetTopic.pre_defined_topics.length;k++) {
                  let topic=targetTopic.pre_defined_topics [k];
                  for (let l=0;l<aCountList.length;l++) {
                    let aCountObject=aCountList [l];
                    if (this.docuscopeTools.compareLemmas (aCountObject.lemma,topic)==true) {
                      debit+=aCountObject.count;
                    }
                  }                  
                }
              }

              // Then match custom-defined topics
              console.log ("Matching custom topics ...");

              if (targetTopic.custom_topics) {
                for (let k=0;k<targetTopic.custom_topics.length;k++) {
                  let topic=targetTopic.custom_topics [k];
                  for (let l=0;l<aCountList.length;l++) {
                    let aCountObject=aCountList [l];
                    if (this.docuscopeTools.compareLemmas (aCountObject.lemma,topic)==true) {
                      debit+=aCountObject.count;
                    }
                  }                  
                }
              }              

              // Do the accounting

              cluster.sentenceCount=debit;
            }
          }
        }
      }
    }

    if (this.updateNotice) {
      this.updateNotice ();
    }    
  }
}
