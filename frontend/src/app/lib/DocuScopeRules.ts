import { assignmentId } from '../service/lti.service';
import { Configuration, ConfigurationInformation, Rule } from '../../lib/Configuration';
import DocuScopeRule from './DocuScopeRule';
import { DocuScopeRuleCluster } from './DocuScopeRuleCluster';

export interface Duplicate {
  ruleIndex: number,
  clusterIndex: number,
  lemma: string,
  topic: string,
  type: number,
}

/**
 * We need to switch to using the immutable package. That way we
 * avoid really expensive deep copies through bad tricks like the
 * one below.
 * @param {any} anObject
 */
function deepCopy<T>(anObject: T): T {
  return JSON.parse(JSON.stringify(anObject));
}

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
 * How much can this be optimized?
 * Reduced from O(n^2) to O(n) or O(n lg n) depending on the Set implementation.
 * @param {string[]} aListSource
 * @param {string[]} aListTarget
 */
function listFindDuplucateInList(aListSource: string[], aListTarget: string[]) {
  const targets = new Set(aListTarget.map((t) => t.toLowerCase()));
  return aListSource.find((a) => targets.has(a.toLowerCase())) ?? null;
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
  constructor() { }

  saveConfig() {
    const raw = this.getJSONRules();

    const saveCopy = deepCopy(this.original);
    if (saveCopy) {
      saveCopy.rules.rules = raw;
      sessionStorage.setItem(configKey(), JSON.stringify(saveCopy));
    } else {
      sessionStorage.removeItem(configKey());
    }
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
  getJSONRules(): Rule[] {
    return this.rules.map((rule) => rule.getJSONObject());
  }

  /**
   *
   */
  // getVersion() {
  //   if (this.info) {
  //     const { name, version } = this.info;
  //     return `${name.substring(0, Math.min(30, name.length))}: (${version})`;
  //   }
  //   return '';
  // }

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

    // console.log(incomingData);

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
        this.original = stored;
        this.data = deepCopy(stored);
        this.rules = [];
        newRules = false;
      }
    } else {
      console.log('Nothing stored yet, defaulting to template version');
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
   */
  getRule(anId: string) {
    return this.rules.find((rule) => rule.id === anId);
  }

  /**
   *
   * @param {string} aRule rule identifier
   * @param {string} aCluster cluster identifier
   */
  getCluster(aRule: string, aCluster: string) {
    return this.getRule(aRule)?.children.find(
      (cluster) => cluster.id === aCluster
    );
  }

  /**
   *
   * @param {number} aRule rule index
   * @param {number} aCluster cluster index
   */
  getClusterByIndex(aRule: number, aCluster: number) {
    if (aRule === -1 || aCluster === -1) {
      return undefined;
    }
    return this.rules.at(aRule)?.children.at(aCluster);
  }

  /**
   * Retrieves list of topics for cluster in rule
   * @param {number} aRule rule index
   * @param {number} aCluster cluster index
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
    if (aRuleIndex < 0 || aClusterIndex < 0) {
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

    if (aRuleIndex < 0 || aClusterIndex < 0) {
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
    return this.rules
      .flatMap(rule => rule.children)
      .map(cluster => cluster.raw?.topics?.at(0))
      .filter(topic => !!topic)
      .flatMap(topic =>
        [...topic?.pre_defined_topics ?? [], ...topic?.custom_topics ?? []])
      .map(topic => topic.trim()).join(';');
  }

  /**
   *
   */
  getAllCustomTopicsStructured() {
    return this.rules.flatMap(rule => rule.children).map(cluster => cluster.raw?.topics?.at(0))
      .filter(topic => !!topic)
      .map(topic => ({
        lemma: topic?.lemma,
        topics: [...topic?.pre_defined_topics ?? [], ...topic?.custom_topics ?? []].map(s => s.trim())
      }))
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
  // cleanCoherenceData(aCoherenceData: CoherenceData | ErrorData): CoherenceData | ErrorData {
  //   if ('error' in aCoherenceData) {
  //     console.error('Coherence generation error: %s', aCoherenceData.error);
  //     return {...aCoherenceData}; // shallow copy ok for error
  //   }
  //   const cleanedData: CoherenceData = deepCopy(aCoherenceData);

  //   // https://stackoverflow.com/questions/767486/how-do-i-check-if-a-variable-is-an-array-in-javascript

  //   //if ((typeof aCoherenceData === "object" && aCoherenceData !== null) == true) {
  //   //if (aCoherenceData.constructor != Array) {
  //   //  console.log ("Variable is indeed of type object and is therefore not eligible data");
  //   //  return (cleanedData);
  //   //}

  //   for (const topicObject of cleanedData.data) {
  //     topicObject.topic = topicObject.topic.map((s) => s.replaceAll('_', ' '));
  //   }
  //   return cleanedData;
  // }

  /**
   *
   */
  // cleanLocalCoherenceData(aCoherenceLocalData: LocalData[]) {
  //   const cleanedData = [...aCoherenceLocalData];

  //   for (const td of cleanedData) {
  //     if (td && typeof td === 'object' && 'data' in td) {
  //       td.data.forEach(
  //         (top) => (top.topic = top.topic.map((s) => s.replaceAll('_', ' ')))
  //       );
  //     }
  //   }
  //   return cleanedData;
  // }

  /**
   *
   */
  checkDuplicates(
    aTopicList: string[]
  ): Duplicate | null {
    if (!aTopicList.length) {
      return null;
    }

    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      for (let j = 0; j < rule.children.length; j++) {
        const topics = rule.children[j].raw?.topics;
        if (topics?.length) {
          const rawTopicsStatic = topics[0].pre_defined_topics ?? [];
          const rawTopics = topics[0].custom_topics ?? [];
          const duplicate = listFindDuplucateInList(
            aTopicList,
            [...rawTopicsStatic, ...rawTopics]
          );
          if (duplicate) {
            return {
              ruleIndex: i,
              clusterIndex: j,
              lemma: topics[0].lemma,
              topic: duplicate,
              type: 0,
            };
          }
        }
      }
    }

    return null;
  }
}
