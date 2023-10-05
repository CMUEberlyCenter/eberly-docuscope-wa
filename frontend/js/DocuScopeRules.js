import { deepCopy, isEmpty, listFindDuplucateInList } from "./DataTools";
import DocuScopeRule from "./DocuScopeRule";
import DocuScopeSessionStorage from "./DocuScopeSessionStorage";
import { fixIncoming } from "./DocuScopeTools";
import HashTable from "./HashTable";

/**
 * This needs to be refactored to: DocuScopeRuleManager
 */
export default class DocuScopeRules {
  /**
   *
   */
  constructor() {
    //this.name = "unassigned";

    this.context = "global";

    this.name = "";
    this.overview = "";
    this.original = null; // We use this for reset purposes. It's the unmodified data set as either loaded from disk or from the network
    this.data = null; // The full dataset, not just the rules
    this.rules = []; // Only the rules section of the dataset
    this.clusters = [];
    this.info = null;

    this.ready = false;

    this.sessionStorage = null;

    this.setContext("global");

    this.updateNotice = null;
  }

  /**
   *
   */
  setContext(aContext) {
    console.log("setContext (" + aContext + ")");

    this.context = aContext;
    this.sessionStorage = new DocuScopeSessionStorage("dswa-" + this.context);
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
  getInfo() {
    return this.info;
  }

  /**
   *
   */
  getJSONObject() {
    let constructed = [];

    for (let i = 0; i < this.rules.length; i++) {
      let aRule = this.rules[i];
      constructed.push(aRule.getJSONObject());
    }

    return constructed;
  }

  /**
   *
   */
  getVersion() {
    let version = "?.?.?";

    if (this.ready == false) {
      return version;
    }

    if (!this.data) {
      return version;
    }

    let formatted = this.data.info.name;

    if (formatted.length > 30) {
      formatted = this.data.info.name.substring(0, 30);
    }

    return formatted + ": (" + version + ")";
  }

  /**
   *
   */
  isNewVersion(newInfo, existingInfo) {
    console.log("isNewVersion ()");

    if (typeof existingInfo === "undefined") {
      console.log("Existing info is undefined, returning: true");
      return true;
    }

    if (newInfo.version !== existingInfo.version) {
      return true;
    }

    return false;
  }

  /**
   *
   */
  parseString(aString) {
    this.original = JSON.parse(aString);
    this.parse();
  }

  /**
   *
   */
  reset() {
    console.log("reset ()");

    this.data = deepCopy(this.original);
    this.rules = [];
    this.clusters = [];

    this.parse();

    this.save();

    if (this.updateNotice) {
      this.updateNotice(true);
    }
  }

  /**
   *
   */
  parse(newRules) {
    console.log("parse ()");

    const rulesRaw = this.data.rules;

    console.log(rulesRaw);

    for (let i = 0; i < rulesRaw.length; i++) {
      let ruleObject = rulesRaw[i];
      let newRule = new DocuScopeRule();
      newRule.parse(ruleObject);
      this.rules.push(newRule);
    }

    // We don't have any clusters yet, we'll need to create them from
    // the rules file
    if (newRules == true) {
      this.clusters = [];
      let rawClusters = this.listClusters();
      for (let j = 0; j < rawClusters.length; j++) {
        let clusterObject = {
          name: rawClusters[j],
          custom_topics: [],
        };
        this.clusters.push(clusterObject);
      }
    }

    console.log("parse () done");
  }

  /**
   * When this method is called it is given a fresh JSON object, which represents the template
   * rules as we got them from the server. However, we need to compare that to what the user
   * might have already worked on
   */
  load(incomingData) {
    console.log("load ()");

    // store this information as it is now needed but fixIncoming destroys it. #26
    this.name = incomingData.rules.name;
    this.overview = incomingData.rules.overview;
    incomingData = fixIncoming(incomingData);

    console.log(incomingData);

    if (this.sessionStorage == null) {
      console.log("Info: no context set yet, defaulting to 'global'");
      this.setContext("global");
    }

    this.info = incomingData.info;

    let newRules = true;

    // We have to make a small accomodation for rules coming in as part of a JSON HTTP message
    // This will be smoothed out soon after v1.
    this.original = incomingData;
    this.data = deepCopy(incomingData);
    this.rules = [];
    this.clusters = this.sessionStorage.getJSONObject("clusters");

    //let stored=this.sessionStorage.getJSONObject("rules");
    const stored = this.sessionStorage.getJSONObject("dswa");

    // First time use, we'll make the rules loaded from the server our place to start
    if (stored !== null) {
      if (isEmpty(stored) == false) {
        console.log("We have stored rules, checking version ...");
        if (this.isNewVersion(incomingData.info, stored.info) == true) {
          console.log(
            "The incoming version is newer than the stored version, using newer data"
          );
          this.original = incomingData;
          this.data = deepCopy(incomingData);
          this.rules = [];
          newRules = true;
        } else {
          console.log(
            "The stored version is newer or equal to the incoming version, we'll use the stored data"
          );
          console.log(stored);
          this.original = stored;
          this.data = deepCopy(stored);
          this.rules = [];
          newRules = false;
        }
      } else {
        console.log("Nothing stored yet, defaulting to template version");
      }
    }
    console.log(this.data);
    this.parse(newRules);

    // Make sure we have at least something stored in case this is the first time
    // we load the data from the template. Shouldn't hurt if we overwrite
    if (newRules == true) {
      this.save();
    }

    this.ready = true;

    this.debugRules();
    this.debugClusters();
  }

  /**
   *
   */
  save() {
    console.log("save ()");

    // Re-create the JSON structure
    let raw = this.getJSONObject();

    let saveCopy = deepCopy(this.original);
    saveCopy.rules = raw;

    console.log("Saving: ");
    console.log(saveCopy);

    this.sessionStorage.setJSONObject("dswa", saveCopy);
    this.sessionStorage.setJSONObject("clusters", this.clusters);
  }

  /**
   *
   */
  debugRules() {
    console.log("debugRules ()");

    console.log(this.getJSONObject());
  }

  /**
   *
   */
  debugClusters() {
    console.log("debugClusters ()");
    console.log(this.clusters);
  }

  /**
   *
   */
  getRule(anId) {
    //console.log("getRule (" + anId + ")");

    for (let i = 0; i < this.rules.length; i++) {
      let aRule = this.rules[i];
      if (aRule.id === anId) {
        return aRule;
      }
    }

    return null;
  }

  /**
   *
   */
  getCluster(aRule, aCluster) {
    //console.log ("getCluster ("+ aRule + "," + aCluster + ")");

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      if (rule.id == aRule) {
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
  getClusterByIndex(aRule, aCluster) {
    //console.log ("getClusterByIndex ("+ aRule + "," + aCluster + ")");

    if (aRule == -1 || aCluster == -1) {
      //console.log ("Either rule or cluster is -1");
      return null;
    }

    let rule = this.rules[aRule];

    if (rule != null) {
      if (rule.children) {
        return rule.children[aCluster];
      }
    }

    return null;
  }

  /**
   *
   */
  getClusterTopics(aRule, aCluster) {
    //console.log ("getClusterTopics ()");

    let cluster = this.getClusterByIndex(aRule, aCluster);
    if (cluster == null) {
      console.log("Error, no cluster found!");
      return [];
    }

    let topicList = [];

    let clusterObject = cluster.raw;

    let topics = clusterObject.topics;

    if (topics) {
      if (topics[0].pre_defined_topics) {
        for (let i = 0; i < topics[0].pre_defined_topics.length; i++) {
          topicList.push(topics[0].pre_defined_topics[i]);
        }
      }

      if (topics[0].custom_topics) {
        for (let i = 0; i < topics[0].custom_topics.length; i++) {
          topicList.push(topics[0].custom_topics[i]);
        }
      }
    }

    return topicList;
  }

  /**
   *
   */
  getClusterName(aRule, aCluster) {
    //console.log ("getClusterTopics ()");

    let cluster = this.getClusterByIndex(aRule, aCluster);
    if (cluster == null) {
      console.log("Error, no cluster found!");
      return [];
    }

    let topicList = [];

    let clusterObject = cluster.raw;

    let topics = clusterObject.topics;

    if (topics) {
      /*
      if (topics [0].pre_defined_topics) {
        for (let i=0;i<topics [0].pre_defined_topics.length;i++) {
          topicList.push(topics [0].pre_defined_topics[i]);
        }
      }

      if (topics [0].custom_topics) {        
        for (let i=0;i<topics [0].custom_topics.length;i++) {
          topicList.push(topics [0].custom_topics[i]);
        }        
      }
      */

      return [topics[0].lemma];
    }

    return topicList;
  }

  /**
   *
   */
  getClusterTopicsByClusterIndex(aClusterIndex) {
    console.log("getClusterTopicsByClusterIndex (" + aClusterIndex + ")");

    let topicList = [];
    let index = 0;
    let cluster = null;

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        if (index == aClusterIndex) {
          cluster = rule.children[j];
          break;
        }
        index++;
      }
    }

    if (cluster == null) {
      console.log("Error: unable to find cluster by global cluster index");
      return topicList;
    }

    let clusterObject = cluster.raw;

    console.log("We've got topics to inspect");
    console.log(clusterObject);

    let topics = clusterObject.topics;

    if (topics) {
      if (topics[0].pre_defined_topics) {
        for (let i = 0; i < topics[0].pre_defined_topics.length; i++) {
          topicList.push(topics[0].pre_defined_topics[i]);
        }
      }

      if (topics[0].custom_topics) {
        for (let i = 0; i < topics[0].custom_topics.length; i++) {
          topicList.push(topics[0].custom_topics[i]);
        }
      }
    }

    return topicList;
  }

  /**
   * We should provide an alternative method that doesn't need to traverse the
   * tree to obtain the count but which is given a pointer to the cluster to
   * start with
   */
  getClusterTopicCountPredefined(aRuleIndex, aClusterIndex) {
    //console.log ("getClusterTopicCountPredefined ("+ aRuleIndex + "," + aClusterIndex + ")");

    if (aRuleIndex == -1 || aClusterIndex == -1) {
      //console.log ("No valid rule or cluster provided");
      return 0;
    }

    let rule = this.rules[aRuleIndex];

    if (rule != null) {
      if (rule.children) {
        let aCluster = rule.children[aClusterIndex];

        let clusterObject = aCluster.raw;

        let topics = clusterObject.topics;

        if (topics) {
          if (topics[0].pre_defined_topics) {
            let topicList = topics[0].pre_defined_topics;
            return topicList.length;
          }
        }
      }
    }

    return 0;
  }

  /**
   * We should provide an alternative method that doesn't need to traverse the
   * tree to obtain the count but which is given a pointer to the cluster to
   * start with
   */
  getClusterTopicCountCustom(aRuleIndex, aClusterIndex) {
    //console.log ("getClusterTopicCountCustom ("+ aRuleIndex + "," + aClusterIndex + ")");

    if (aRuleIndex == -1 || aClusterIndex == -1) {
      //console.log ("No valid rule or cluster provided");
      return 0;
    }

    let rule = this.rules[aRuleIndex];

    if (rule != null) {
      if (rule.children) {
        let aCluster = rule.children[aClusterIndex];

        let clusterObject = aCluster.raw;

        let topics = clusterObject.topics;

        if (topics) {
          if (topics[0].custom_topics) {
            let topicList = topics[0].custom_topics;
            return topicList.length;
          }
        }
      }
    }

    return 0;
  }

  /**
   *
   */
  topicSentenceCount(aRuleIndex, aClusterIndex) {
    let aCluster = this.getClusterByIndex(aRuleIndex, aClusterIndex);
    if (aCluster) {
      return aCluster.sentenceCount;
    }

    return 0;
  }

  /**
   * Return the array of custom/pre-defined topics as a single newline separated string
   */
  getClusterTopicTextStatic(aCluster) {
    //console.log ("getClusterTopicTextStatic ()");

    let topicText = "";

    if (aCluster == null) {
      console.log("Warning: cluster is null");
      return topicText;
    }

    let clusterObject = aCluster.raw;

    let topics = clusterObject.topics;

    if (topics) {
      let topicList = topics[0].pre_defined_topics;
      if (topicList) {
        for (let j = 0; j < topicList.length; j++) {
          if (j > 0) {
            topicText += "\n";
          }
          topicText += topicList[j];
        }
      }
    }

    return topicText;
  }

  /**
   * Return the array of custom/pre-defined topics as a single newline separated string
   */
  getClusterTopicText(aCluster) {
    //console.log ("getClusterTopicText ()");

    let topicText = "";

    if (aCluster == null) {
      console.log("Warning: cluster is null");
      return topicText;
    }

    let clusterObject = aCluster.raw;

    let topics = clusterObject.topics;

    if (topics) {
      let topicList = topics[0].custom_topics;
      if (topicList) {
        for (let j = 0; j < topicList.length; j++) {
          if (j > 0) {
            topicText += "\n";
          }
          topicText += topicList[j];
        }
      }
    }

    return topicText;
  }

  /**
   * Get all the custom topics from all the rules and all the clusters. This should be whatever
   * we started with in the rules as edited by the user in the interface
   */
  getAllCustomTopics() {
    console.log("getAllCustomTopics ()");

    let topicText = "";
    let tempList = [];

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        let cluster = rule.children[j];
        let clusterObject = cluster.raw;

        let topics = clusterObject.topics;
        if (topics) {
          if (topics.length > 0) {
            let rawTopicsStatic = topics[0].pre_defined_topics;
            for (let k = 0; k < rawTopicsStatic.length; k++) {
              tempList.push(rawTopicsStatic[k]);
            }

            let rawTopics = topics[0].custom_topics;
            for (let k = 0; k < rawTopics.length; k++) {
              tempList.push(rawTopics[k]);
            }
          }
        }
      }
    }

    // Slow? Sure. Always a short enough list? Also sure
    for (let l = 0; l < tempList.length; l++) {
      if (l > 0) {
        topicText += ";";
      }

      topicText += tempList[l].trim();
    }

    return topicText;
  }

  /**
   *
   */
  getAllCustomTopicsStructured() {
    console.log("getAllCustomTopicsStructured ()");

    let structuredTopics = [];

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        let cluster = rule.children[j];
        let clusterObject = cluster.raw;

        let topics = clusterObject.topics;
        if (topics) {
          if (topics.length > 0) {
            let topicObject = {
              lemma: topics[0].lemma,
              topics: [],
            };

            let rawTopicsStatic = topics[0].pre_defined_topics;
            for (let k = 0; k < rawTopicsStatic.length; k++) {
              topicObject.topics.push(rawTopicsStatic[k].trim());
            }

            let rawTopics = topics[0].custom_topics;
            for (let k = 0; k < rawTopics.length; k++) {
              topicObject.topics.push(rawTopics[k].trim());
            }

            structuredTopics.push(topicObject);
          }
        }
      }
    }

    return structuredTopics;
  }

  /**
   * aCustomTopicSet needs to be an array if terms: ["Topic 1","Topic 2"]
   */
  setClusterCustomTopics(aRule, aCluster, aCustomTopicSet) {
    console.log("setClusterCustomTopics (" + aRule + ", " + aCluster + ")");
    //console.log (aCustomTopicSet);

    // This retrieves one of our own objects, not a raw JSON object
    let cluster = this.getClusterByIndex(aRule, aCluster);
    if (cluster == null) {
      return false;
    }

    // Let's change in place for now
    let clusterObject = cluster.raw;

    let topics = clusterObject.topics;
    if (topics) {
      if (topics.length > 0) {
        let defaulTopicObject = topics[0];

        if (defaulTopicObject.custom_topics) {
          defaulTopicObject.custom_topics = aCustomTopicSet;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }

    this.save();

    if (this.updateNotice) {
      this.updateNotice(false);
    }

    return true;
  }

  /**
   *
   */
  updateLemmaCounts(aCountList) {
    console.log("updateLemmaCounts ()");

    for (let t = 0; t < this.rules.length; t++) {
      let rule = this.rules[t];
      for (let j = 0; j < rule.children.length; j++) {
        let cluster = rule.children[j];
        // Reset the count, we can do that because the count list has everything coming in from the back-end
        cluster.sentenceCount = 0;
      }
    }

    for (let i = 0; i < aCountList.length; i++) {
      // let aLemmaCount = aCountList[i];

      //console.log ("Updating lemma: " + aCountList [i].lemma + ", with count: " + aCountList [i].count);

      for (let t = 0; t < this.rules.length; t++) {
        let rule = this.rules[t];
        for (let j = 0; j < rule.children.length; j++) {
          let cluster = rule.children[j];

          let clusterObject = cluster.raw;

          let topics = clusterObject.topics;

          if (topics) {
            if (topics.length > 0) {
              let targetTopic = topics[0];
              //console.log ("Comparing " + targetTopic.lemma + " to: " + aCountList [i].lemma);
              if (targetTopic.lemma == aCountList[i].lemma) {
                cluster.sentenceCount = aCountList[i].count;
              }
            }
          }

          /*
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
                    if (compareLemmas (aCountObject.lemma,topic)==true) {
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
                    if (compareLemmas (aCountObject.lemma,topic)==true) {
                      debit+=aCountObject.count;
                    }
                  }                  
                }
              }              

              // Do the accounting

              cluster.sentenceCount=debit;
            }
          }
          */
        }
      }
    }

    console.log(this.rules);

    if (this.updateNotice) {
      this.updateNotice(false);
    }
  }

  /**
   *
   */
  listClusters() {
    console.log("listClusters ()");

    let hashTable = new HashTable();
    let clusterList = [];

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        let cluster = rule.children[j];
        let clusterObject = cluster.raw;

        let topics = clusterObject.topics;
        if (topics) {
          if (topics.length > 0) {
            hashTable.setItem(topics[0].lemma, topics[0].lemma);
          }
        }
      }
    }

    let items = hashTable.keys();

    //console.log (JSON.stringify (items));

    for (let k = 0; k < items.length; k++) {
      clusterList.push(items[k]);
    }

    return clusterList;
  }

  /**
   *
   */
  listClustersForRule(aRuleIndex, aClusterIndex) {
    //console.log ("listClustersForRule (" + aRuleIndex + "," + aClusterIndex + ")");

    let clusterList = [];

    let rule = this.rules[aRuleIndex];
    let cluster = rule.children[aClusterIndex];
    let clusterObject = cluster.raw;

    let topics = clusterObject.topics;
    if (topics) {
      if (topics.length > 0) {
        clusterList.push(topics[0].lemma);
      }
    }

    return clusterList;
  }

  /**
   * If there really is a very small amount of data, like a one word phrase, then you might get this exclusively:
   *
   *  {error: "ncols is 0"}
   *
   * Let's handle that in cleanCoherenceData so that the rest of the code goes through its
   * usual paces instead of creating a global exception
   */
  cleanCoherenceData(aCoherenceData) {
    console.log("cleanCoherenceData ()");

    console.log(aCoherenceData);

    let cleanedData = deepCopy(aCoherenceData);

    if (aCoherenceData.error) {
      console.log("Coherence generation error: " + aCoherenceData.error);
      return cleanedData;
    }

    // https://stackoverflow.com/questions/767486/how-do-i-check-if-a-variable-is-an-array-in-javascript

    //if ((typeof aCoherenceData === "object" && aCoherenceData !== null) == true) {
    //if (aCoherenceData.constructor != Array) {
    //  console.log ("Variable is indeed of type object and is therefore not eligible data");
    //  return (cleanedData);
    //}

    let data = cleanedData.data;

    let replacedCount = 0;

    for (let i = 0; i < data.length; i++) {
      let topicObject = data[i];
      let topic = topicObject.topic;
      for (let j = 0; j < topic.length; j++) {
        if (topic[j].indexOf("_") != -1) {
          topic[j] = topic[j].replaceAll("_", " ");
          replacedCount++;
        }
      }
    }

    console.log("Cleaned " + replacedCount + " multiword topics (global)");

    return cleanedData;
  }

  /**
   *
   */
  cleanLocalCoherenceData(aCoherenceLocalData) {
    console.log("cleanLocalCoherenceData ()");

    let cleanedData = deepCopy(aCoherenceLocalData);

    let replacedCount = 0;

    for (let i = 0; i < cleanedData.length; i++) {
      let topicObject = cleanedData[i];
      if (Object.prototype.hasOwnProperty.call(topicObject, "data") === true) {
        let topicData = topicObject.data;
        for (let k = 0; k < topicData.length; k++) {
          let topic = topicData[k].topic;
          for (let j = 0; j < topic.length; j++) {
            if (topic[j].indexOf("_") != -1) {
              topic[j] = topic[j].replaceAll("_", " ");
              replacedCount++;
            }
          }
        }
      }
    }

    console.log("Cleaned " + replacedCount + " multiword topics (local)");

    return cleanedData;
  }

  /**
   *
   */
  checkDuplicates(aRuleIndex, aClusterIndex, aTopicList) {
    console.log("checkDuplicates ()");
    console.log(aTopicList);

    if (aTopicList.length == null) {
      return null;
    }

    let duplicateObject = null;

    for (let i = 0; i < this.rules.length; i++) {
      // if (i != aRuleIndex) {
      // }

      let rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        // if (j != aClusterIndex) {
        // }

        let cluster = rule.children[j];
        let clusterObject = cluster.raw;

        let topics = clusterObject.topics;
        if (topics) {
          if (topics.length > 0) {
            let rawTopicsStatic = topics[0].pre_defined_topics;
            for (let k = 0; k < rawTopicsStatic.length; k++) {
              let duplicate = listFindDuplucateInList(
                aTopicList,
                rawTopicsStatic
              );
              if (duplicate != null) {
                duplicateObject = {
                  ruleIndex: i,
                  clusterIndex: j,
                  lemma: topics[0].lemma,
                  topic: duplicate,
                  type: 0,
                };

                return duplicateObject;
              }
            }

            const rawTopics = topics[0].custom_topics;
            for (let k = 0; k < rawTopics.length; k++) {
              let duplicate = listFindDuplucateInList(aTopicList, rawTopics);
              if (duplicate != null) {
                duplicateObject = {
                  ruleIndex: i,
                  clusterIndex: j,
                  lemma: topics[0].lemma,
                  topic: duplicate,
                  type: 1,
                };

                return duplicateObject;
              }
            }
          }
        }
      }
    }

    return duplicateObject;
  }
}
