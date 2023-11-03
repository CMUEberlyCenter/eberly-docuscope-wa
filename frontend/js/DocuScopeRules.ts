import { deepCopy, isEmpty, listFindDuplucateInList } from './DataTools';
import DocuScopeRule from './DocuScopeRule';
import { DocuScopeRuleCluster, Rule } from './DocuScopeRuleCluster';
import { assignmentId } from './service/lti.service';

interface ConfigurationInformation {
  name: string;
  version: string;
  author: string;
  copyright: string;
  saved: string;
  filename: string;
}
interface Configuration {
  id: string; // unique identifier
  rules: {
    name: string;
    overview: string;
    rules: Rule[];
  };
  impressions: {
    common_clusters: string[];
    rare_clusters: string[];
  };
  values: unknown;
  info: ConfigurationInformation;
  prompt_templates: Map<
    string,
    { prompt: string; temperature?: string | number; role?: string }
  >;
}

type TopicData = { data: { topic: string[] }[] };
type CoherenceData = { error: string } | { data: { topic: string[] }[] };

function sessionKey(key: string) {
  return `edu.cmu.eberly.docuscope-scribe_${assignmentId()}_${key}`;
}
function configKey() {
  return sessionKey('config');
}
function clustersKey() {
  return sessionKey('clusters');
}
/**
 * This needs to be refactored to: DocuScopeRuleManager
 */
export default class DocuScopeRules {
  original?: Configuration; // We use this for reset purposes. It's the unmodified data set as either loaded from disk or from the network
  data?: Configuration; // The full dataset, not just the rules
  rules: DocuScopeRule[] = []; // Only the rules section of the dataset
  clusters: { name: string; custom_topics: string[] }[] = [];
  ready = false;
  updateNotice?: (b: boolean) => void;

  get info() {
    return this.data?.info;
  }
  get name() {
    return this.data?.rules.name ?? '';
  }
  get overview() {
    return this.data?.rules.overview ?? '';
  }
  /**
   *
   */
  constructor() {}

  saveConfig() {
    const raw = this.getJSONRules();

    const saveCopy = deepCopy(this.original);
    saveCopy.rules.rules = raw;
    sessionStorage.setItem(configKey(), JSON.stringify(saveCopy));
  }
  getSessionConfig() {
    const stored = sessionStorage.getItem(configKey());
    if (stored) {
      try {
        return JSON.parse(stored) as Configuration;
      } catch (err) {
        console.error(err);
        return undefined;
      }
    }
    return undefined;
  }
  saveClusters() {
    sessionStorage.setItem(clustersKey(), JSON.stringify(this.clusters));
  }
  restoreClusters() {
    this.clusters = [];
    const stored = sessionStorage.getItem(clustersKey());
    if (stored) {
      try {
        this.clusters = JSON.parse(stored);
      } catch (err) {
        console.error(err);
      }
    }
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
    return this.data?.info;
  }

  /**
   *
   */
  getJSONRules() {
    return this.rules.map((rule) => rule.getJSONObject());
  }

  /**
   *
   */
  getVersion() {
    if (this.info) {
      const { name, version } = this.info;
      return `${name.substring(0, Math.min(30, name.length))}: (${version})`;
    }
    return '';
  }

  /**
   *
   */
  isNewVersion(
    newInfo: ConfigurationInformation,
    existingInfo?: ConfigurationInformation
  ) {
    if (!existingInfo) {
      console.log('Existing info is undefined, returning: true');
      return true;
    }

    if (newInfo.version !== existingInfo.version) {
      return true;
    }
    if (newInfo.saved !== existingInfo.saved) {
      return true;
    }
    if (newInfo.name !== existingInfo.name) {
      return true;
    }
    if (newInfo.filename !== existingInfo.filename) {
      return true;
    }
    if (newInfo.filename) return false;
  }

  /**
   *
   */
  parseString(aString: string) {
    this.original = JSON.parse(aString);
    this.parse();
  }

  /**
   *
   */
  reset() {
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
  parse(newRules?: boolean) {
    const rulesRaw = this.data?.rules.rules;

    console.log(rulesRaw);

    this.rules =
      rulesRaw
        ?.filter((r: Rule | undefined): r is Rule => !!r)
        .map((rule: Rule) => new DocuScopeRule(rule)) ?? [];

    // We don't have any clusters yet, we'll need to create them from
    // the rules file
    if (newRules) {
      this.clusters = this.listClusters().map((name) => ({
        name,
        custom_topics: [],
      }));
    }
  }

  /**
   * When this method is called it is given a fresh JSON object, which represents the template
   * rules as we got them from the server. However, we need to compare that to what the user
   * might have already worked on
   */
  load(incomingData: Configuration) {
    // store this information as it is now needed but fixIncoming destroys it. #26
    // incomingData = fixIncoming(incomingData);

    console.log(incomingData);

    let newRules = true;

    // We have to make a small accomodation for rules coming in as part of a JSON HTTP message
    // This will be smoothed out soon after v1.
    this.original = incomingData;
    this.data = deepCopy(incomingData);
    this.rules = [];
    this.restoreClusters();

    const stored = this.getSessionConfig();
    //let stored=this.sessionStorage.getJSONObject("rules");
    // const stored = this.sessionStorage.getJSONObject("dswa");

    // First time use, we'll make the rules loaded from the server our place to start
    if (stored) {
      if (!isEmpty(stored)) {
        console.log('We have stored rules, checking version ...');
        if (incomingData.id !== stored.id) {
          console.log(
            'The incoming is different than the stored version, using newer data'
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
        console.log('Nothing stored yet, defaulting to template version');
      }
    }
    this.parse(newRules);

    // Make sure we have at least something stored in case this is the first time
    // we load the data from the template. Shouldn't hurt if we overwrite
    if (newRules) {
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
    // Re-create the JSON structure
    this.saveConfig();
    this.saveClusters();
  }

  /**
   *
   */
  debugRules() {
    console.log('debugRules ()');
    console.log(this.getJSONRules());
  }

  /**
   *
   */
  debugClusters() {
    console.log('debugClusters ()');
    console.log(this.clusters);
  }

  /**
   *
   * @param {string} anId
   * @returns {DocuScopeRule | undefined}
   */
  getRule(anId: string) {
    return this.rules.find((rule) => rule.id === anId);
  }

  /**
   *
   * @param {string} aRule
   * @param {string} aCluster
   * @returns {DocuScopeRuleCluster | undefined}
   */
  getCluster(aRule: string, aCluster: string) {
    return this.getRule(aRule)?.children.find(
      (cluster) => cluster.id === aCluster
    );
  }

  /**
   *
   * @param {number} aRule
   * @param {number} aCluster
   * @returns {DocuScopeRuleCluster | undefined}
   */
  getClusterByIndex(aRule: number, aCluster: number) {
    if (aRule === -1 || aCluster === -1) {
      return undefined;
    }
    return this.rules.at(aRule)?.children.at(aCluster);
  }

  /**
   *
   * @param {number} aRule
   * @param {number} aCluster
   */
  getClusterTopics(aRule: number, aCluster: number) {
    const cluster = this.getClusterByIndex(aRule, aCluster);
    if (!cluster) {
      console.log('Error, no cluster found!');
      return [];
    }

    const topicList = [];
    const topic = cluster.raw?.topics?.at(0);

    if (topic?.pre_defined_topics) {
      topicList.push(...topic.pre_defined_topics);
    }
    if (topic?.custom_topics) {
      topicList.push(...topic.custom_topics);
    }

    return topicList;
  }

  /**
   *
   * @param {number} aRule
   * @param {number} aCluster
   * @returns {string[]}
   */
  getClusterName(aRule: number, aCluster: number): string[] {
    const cluster = this.getClusterByIndex(aRule, aCluster);
    if (!cluster) {
      console.log('Error, no cluster found!');
      return [];
    }

    const lemma = cluster.raw?.topics?.at(0)?.lemma;
    return lemma ? [lemma] : [];
  }

  /**
   *
   * @param {number} aClusterIndex
   * @returns {string[]}
   */
  getClusterTopicsByClusterIndex(aClusterIndex: number): string[] {
    console.log('getClusterTopicsByClusterIndex (' + aClusterIndex + ')');

    const topicList: string[] = [];
    let cluster = null;

    for (const rule of this.rules) {
      if (aClusterIndex > rule.children.length) {
        aClusterIndex -= rule.children.length;
      } else {
        cluster = rule.children.at(aClusterIndex);
        break;
      }
    }

    if (!cluster) {
      console.log('Error: unable to find cluster by global cluster index');
      return [];
    }

    const topic = cluster.raw?.topics?.at(0);

    if (topic?.pre_defined_topics) {
      topicList.push(...topic.pre_defined_topics);
    }
    if (topic?.custom_topics) {
      topicList.push(...topic.custom_topics);
    }
    return topicList;
  }

  /**
   * We should provide an alternative method that doesn't need to traverse the
   * tree to obtain the count but which is given a pointer to the cluster to
   * start with
   */
  getClusterTopicCountPredefined(aRuleIndex: number, aClusterIndex: number) {
    //console.log ("getClusterTopicCountPredefined ("+ aRuleIndex + "," + aClusterIndex + ")");

    if (aRuleIndex === -1 || aClusterIndex === -1) {
      //console.log ("No valid rule or cluster provided");
      return 0;
    }

    return (
      this.rules.at(aRuleIndex)?.children.at(aClusterIndex)?.raw?.topics?.at(0)
        ?.pre_defined_topics?.length ?? 0
    );
  }

  /**
   * We should provide an alternative method that doesn't need to traverse the
   * tree to obtain the count but which is given a pointer to the cluster to
   * start with
   */
  getClusterTopicCountCustom(aRuleIndex: number, aClusterIndex: number) {
    //console.log ("getClusterTopicCountCustom ("+ aRuleIndex + "," + aClusterIndex + ")");

    if (aRuleIndex === -1 || aClusterIndex === -1) {
      //console.log ("No valid rule or cluster provided");
      return 0;
    }
    return (
      this.rules.at(aRuleIndex)?.children.at(aClusterIndex)?.raw?.topics?.at(0)
        ?.custom_topics?.length ?? 0
    );
  }

  /**
   *
   */
  topicSentenceCount(aRuleIndex: number, aClusterIndex: number) {
    return (
      this.getClusterByIndex(aRuleIndex, aClusterIndex)?.sentenceCount ?? 0
    );
  }

  /**
   * Return the array of custom/pre-defined topics as a single newline separated string
   */
  getClusterTopicTextStatic(aCluster?: DocuScopeRuleCluster) {
    if (!aCluster) {
      console.log('Warning: cluster is null');
      return '';
    }
    return aCluster.raw?.topics?.at(0)?.pre_defined_topics?.join('\n') ?? '';
  }

  /**
   * Return the array of custom/pre-defined topics as a single newline separated string
   */
  getClusterTopicText(aCluster?: DocuScopeRuleCluster): string {
    if (!aCluster) {
      console.log('Warning: cluster is null');
      return '';
    }
    return aCluster.raw?.topics?.at(0)?.custom_topics?.join('\n') ?? '';
  }

  /**
   * Get all the custom topics from all the rules and all the clusters. This should be whatever
   * we started with in the rules as edited by the user in the interface
   */
  getAllCustomTopics() {
    const tempList = [];
    for (const rule of this.rules) {
      for (const cluster of rule.children) {
        const topic = cluster.raw?.topics?.at(0);
        if (topic) {
          const rawTopicsStatic = topic.pre_defined_topics ?? [];
          tempList.push(...rawTopicsStatic);
          const rawTopics = topic.custom_topics ?? [];
          tempList.push(...rawTopics);
        }
      }
    }
    return tempList.map((s) => s.trim()).join(';');
  }

  /**
   *
   */
  getAllCustomTopicsStructured() {
    const structuredTopics = [];

    for (const rule of this.rules) {
      for (const cluster of rule.children) {
        const topic = cluster.raw?.topics?.at(0);
        if (topic) {
          const pre = topic.pre_defined_topics ?? [];
          const custom = topic.custom_topics ?? [];
          structuredTopics.push({
            lemma: topic.lemma,
            topics: [...pre, ...custom].map((s) => s.trim()),
          });
        }
      }
    }

    return structuredTopics;
  }

  /**
   * aCustomTopicSet needs to be an array if terms: ["Topic 1","Topic 2"]
   */
  setClusterCustomTopics(
    aRule: number,
    aCluster: number,
    aCustomTopicSet: string[]
  ) {
    // This retrieves one of our own objects, not a raw JSON object
    const cluster = this.getClusterByIndex(aRule, aCluster);
    if (!cluster) {
      return false;
    }

    // Let's change in place for now
    const topic = cluster.raw?.topics?.at(0);
    if (topic) {
      topic.custom_topics = aCustomTopicSet;
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
  updateLemmaCounts(aCountList: { lemma: string; count: number }[]) {
    for (const rule of this.rules) {
      for (const cluster of rule.children) {
        // Reset the count, we can do that because the count list has everything coming in from the back-end
        cluster.sentenceCount = 0;
      }
    }

    for (const { lemma, count } of aCountList) {
      // let aLemmaCount = aCountList[i];

      //console.log ("Updating lemma: " + aCountList [i].lemma + ", with count: " + aCountList [i].count);

      for (const rule of this.rules) {
        for (const cluster of rule.children) {
          const topic = cluster.raw?.topics?.at(0);
          if (topic?.lemma === lemma) {
            cluster.sentenceCount = count;
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

    if (this.updateNotice) {
      this.updateNotice(false);
    }
  }

  /**
   *
   */
  listClusters() {
    const lemmas = new Set<string>();

    for (const rule of this.rules) {
      for (const cluster of rule.children) {
        const topic = cluster.raw?.topics?.at(0);
        if (topic) {
          lemmas.add(topic.lemma);
        }
      }
    }

    return [...lemmas];
  }

  /**
   *
   */
  listClustersForRule(aRuleIndex: number, aClusterIndex: number) {
    const lemma = this.rules
      .at(aRuleIndex)
      ?.children.at(aClusterIndex)
      ?.raw?.topics?.at(0)?.lemma;
    return lemma ? [lemma] : [];
  }

  /**
   * If there really is a very small amount of data, like a one word phrase, then you might get this exclusively:
   *
   *  {error: "ncols is 0"}
   *
   * Let's handle that in cleanCoherenceData so that the rest of the code goes through its
   * usual paces instead of creating a global exception
   */
  cleanCoherenceData(aCoherenceData: CoherenceData): CoherenceData {
    const cleanedData: CoherenceData = deepCopy(aCoherenceData);

    if ('error' in cleanedData) {
      console.error('Coherence generation error: ' + cleanedData.error);
      return cleanedData;
    }

    // https://stackoverflow.com/questions/767486/how-do-i-check-if-a-variable-is-an-array-in-javascript

    //if ((typeof aCoherenceData === "object" && aCoherenceData !== null) == true) {
    //if (aCoherenceData.constructor != Array) {
    //  console.log ("Variable is indeed of type object and is therefore not eligible data");
    //  return (cleanedData);
    //}

    for (const topicObject of cleanedData.data) {
      topicObject.topic = topicObject.topic.map((s) => s.replaceAll('_', ' '));
    }
    return cleanedData;
  }

  /**
   *
   */
  cleanLocalCoherenceData(aCoherenceLocalData: (TopicData | unknown)[]) {
    const cleanedData = [...aCoherenceLocalData];

    for (const td of cleanedData) {
      if (td && typeof td === 'object' && 'data' in td) {
        (td as TopicData).data.forEach(
          (top) => (top.topic = top.topic.map((s) => s.replaceAll('_', ' ')))
        );
      }
    }
    return cleanedData;
  }

  /**
   *
   */
  checkDuplicates(
    aRuleIndex: number,
    aClusterIndex: number,
    aTopicList: string[]
  ) {
    if (aTopicList.length === null) {
      return null;
    }

    let duplicateObject = null;

    for (let i = 0; i < this.rules.length; i++) {
      // if (i != aRuleIndex) {
      // }

      const rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        // if (j != aClusterIndex) {
        // }

        const cluster = rule.children[j];

        const topics = cluster.raw?.topics;
        if (topics) {
          if (topics.length > 0) {
            const rawTopicsStatic = topics[0].pre_defined_topics ?? [];
            for (let k = 0; k < rawTopicsStatic.length; k++) {
              const duplicate = listFindDuplucateInList(
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

            const rawTopics = topics[0].custom_topics ?? [];
            for (let k = 0; k < rawTopics.length; k++) {
              const duplicate = listFindDuplucateInList(aTopicList, rawTopics);
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
