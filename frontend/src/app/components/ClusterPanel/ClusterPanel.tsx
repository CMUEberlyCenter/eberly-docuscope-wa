import { useEffect, useState } from "react";
import { Button, Tab, Tabs } from "react-bootstrap";

import { useRules } from "../../service/rules.service";
import "./ClusterPanel.scss";
import "./ClusterTopics.scss";

import clusterIcon from "../../../../css/icons/topic_cluster_icon.png";
import { DocuScopeRuleCluster } from "../../../../js/DocuScopeRuleCluster";
import { type Duplicate } from "../../../../js/DocuScopeRules";
import { setEditorState } from "../../service/editor-state.service";
import { rules$ } from "../../service/onTopic.service";

// function clusterListToSentence(aList: string[]) {
//   if (aList.length > 2) return "";
//   return aList.slice(0,2).join(" and ");
// }

/**
  "topics": [
    {
        "lemma": "Data Descriptors",
        "user_defined": true,
        "pre_defined_topics": [
            "IQR",
            "bimodal",
            "inter-quartile range",
            "max",
            "maximum",
            "meadian ",
            "mean",
            "min ",
            "minimum",
            "mode ",
            "quartile",
            "sample",
            "sample size",
            "small sample",
            "spread",
            "standard deviation",
            "unimodal ",
            "variability",
            "variation ",
            "varied ",
            "vary"
        ],
        "custom_topics": [],
        "no_lexical_overlap": false
    }
  ]
 */

type ClusterPanelProps = {
  currentRule: number;
  currentCluster: number;
  disableTreeSelect: (doDisable: boolean) => void;
  enableTopicEditing?: boolean;
};

const ClusterPanel = ({
  currentRule,
  currentCluster,
  disableTreeSelect,
  enableTopicEditing,
}: ClusterPanelProps) => {
  const rules = useRules();
  const [cluster, setCluster] = useState<DocuScopeRuleCluster | null>(null);
  const [clusterSentences, setClusterSentences] = useState("");
  const [topicTextStatic, setTopicTextStatic] = useState("");
  const [topicText, setTopicText] = useState("");
  const [topicTextOriginal, setTopicTextOriginal] = useState("");
  const [about, setAbout] = useState("");
  const [examples, setExamples] = useState("");
  useEffect(() => {
    if (currentRule < 0) {
      setCluster(null);
      setAbout("");
      setExamples("");
      return;
    }
    if (!rules?.rules) {
      setCluster(null);
      setAbout("Internal error: no rule definitions available!");
      setExamples("Internal error: nor rule definitions available.");
      return;
    }
    const rule = rules.rules.at(currentRule);
    if (!rule) {
      setCluster(null);
      setAbout("Internal error: invalid rule provided.");
      setExamples("Internal error: invalid rule provided");
      return;
    }
    if (currentCluster >= 0) {
      const cluster = rule.children.at(currentCluster);
      setCluster(cluster ?? null);
      setAbout(cluster?.description ?? " ");
      setExamples(
        cluster?.examples ?? "Internal error: invalid cluster provided."
      );
      return;
    }
    setCluster(null);
    setAbout(rule.description);
    setExamples(
      `<p class="alert alert-warning m-2">Examples only available for clusters.</p>`
    );
  }, [rules, currentCluster, currentRule]);

  useEffect(() => {
    setClusterSentences(cluster?.raw?.topics?.at(0)?.lemma ?? "");
    const topics = cluster?.raw?.topics?.at(0)?.custom_topics?.join("\n") ?? "";
    setTopicText(topics);
    setTopicTextOriginal(topics);
    setTopicTextStatic(
      cluster?.raw?.topics?.at(0)?.pre_defined_topics?.join("\n") ?? ""
    );
  }, [cluster]);

  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  useEffect(() => {
    const topics = topicText.trim().split("\n");
    const duplicate = rules?.checkDuplicates(topics) ?? null;
    console.log("checking duplicates", duplicate);
    setDuplicate(duplicate);
  }, [topicText, rules]);

  const [enableEditor, setEnableEditor] = useState(false);
  useEffect(() => {
    setEnableEditor(currentCluster < 0);
  }, [currentCluster]);

  function onCustomTopicUpdate() {
    setEditorState(false);
    if (duplicate) {
      return;
    }
    const topics = topicText.trim().split("\n");
    const success = rules?.setClusterCustomTopics(
      currentRule,
      currentCluster,
      topics
    );
    if (!success) {
      console.warn(
        "Show an error dialog to the user about failed topic insertion."
      );
    } else {
      rules$.next(rules);
    }
    disableTreeSelect(false);
  }
  return (
    <div className="cluster-container">
      {enableTopicEditing === false ? undefined : (
        <>
          <div className="cluster-title">
            <img src={clusterIcon} className="cluster-icon" />
            <div className="card-title h5">Topic Cluster</div>
          </div>
          <div className="cluster-content">
            <div
              className="cluster-content-left"
              dangerouslySetInnerHTML={{ __html: clusterSentences }}
            ></div>
            <div className="cluster-topic-editor">
              <div>Pre-defined Topics:</div>
              <textarea
                readOnly={true}
                className={`cluster-topic-input ${enableEditor ? "cluster-textarea-disabled" : ""}`}
                defaultValue={topicTextStatic}
              ></textarea>
              <div>Custom Topics:</div>
              <textarea
                tabIndex={1}
                readOnly={enableEditor}
                className={`cluster-topic-input ${enableEditor ? "cluster-textarea-disabled" : ""} ${duplicate ? "cluster-duplicate" : ""}`}
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                onFocus={() => disableTreeSelect(true)}
                onBlur={() => {
                  if (
                    topicText.trim() === "" ||
                    topicText === topicTextOriginal
                  ) {
                    disableTreeSelect(false);
                  }
                }}
              ></textarea>
              <div className="cluster-topic-controls">
                {duplicate ? (
                  <div className="cluster-warning">
                    Warning: duplicate topic &lsquo;{duplicate.topic}&rsquo;
                    found in {duplicate.lemma}
                  </div>
                ) : undefined}
                <Button
                  onClick={() => onCustomTopicUpdate()}
                  disabled={enableEditor}
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      <Tabs className="mt-1 px-2">
        <Tab eventKey={"expectationabout"} title="About this Expectation">
          <div
            className="cluster-text-padder"
            dangerouslySetInnerHTML={{ __html: about }}
          ></div>
        </Tab>
        {enableTopicEditing === false ? undefined : (
          <Tab eventKey={"examples"} title="Sample Sentences">
            <div
              className="cluster-examples"
              dangerouslySetInnerHTML={{ __html: examples }}
            ></div>
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

export default ClusterPanel;
