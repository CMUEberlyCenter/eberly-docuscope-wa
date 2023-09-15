/* Contents of the Expectations tab of the tools widget. */
import { Subscribe } from "@react-rxjs/core";
import React, { useEffect, useState } from "react";
import { Alert, Card } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import TabTitle from "../TabTitle/TabTitle";

import "./Expectations.scss";

import clusterUpIcon from "../../../css/icons/active_arrow_icon.png";
import clusterActiveIcon from "../../../css/icons/active_icon.png";
import clusterEditedIcon from "../../../css/icons/edited_icon.png";
import clusterWarningIcon from "../../../css/icons/topic_cluster_warning_icon.png";

import TopicHighlighter from "../../TopicHighlighter";
import ClusterPanel from "../ClusterPanel/ClusterPanel";

import { bind } from "@react-rxjs/core";
import { combineLatest, filter, map } from "rxjs";

import { currentTool$ } from "../../service/current-tool.service";
import { lockedEditorText$ } from "../../service/editor-state.service";

import DocuScopeRules from "../../DocuScopeRules";

/*
interface RuleProps {
  rule: ExpectationRule;
}
*/

/* A Rule instance. 
   MvV: I'll probably put this back after v1. For now I'm going to take in the old code I wrote
   because it lines up better with the current desktop interface
*/
/*
const Rule = (props: RuleProps) => {
  const ref = useId();
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <span
        className="cursor-pointer expectations-rule"
        onClick={() => setExpanded(!expanded)}
      >
        {props.rule.name}
      </span>
      <Collapse in={expanded}>
        <Card onClick={() => setExpanded(false)}>
          <Card.Body>
            <Card.Text
              dangerouslySetInnerHTML={{ __html: props.rule.description }}
            />
          </Card.Body>
        </Card>
      </Collapse>
      {props.rule.children.length > 0 ? (
        <ol>
          {props.rule.children.map((child: ExpectationRule, i) => (
            <Rule key={`${ref}-${i}`} rule={child} />
          ))}
        </ol>
      ) : (
        ""
      )}
    </li>
  );
};
*/

// Using react-rxjs to get observable to act like hooks.
// On locking text with some text present and the tool is clarity
// emit the text.
const [useCoherenceText /*coherenceText$*/] = bind(
  combineLatest({ text: lockedEditorText$, tool: currentTool$ }).pipe(
    filter((data) => data.tool === "expectations"),
    map((data) => data.text)
  ),
  ""
);

/** Component specific error message. */
const ErrorFallback = (props: { error?: Error }) => (
  <Alert variant="danger">
    <p>Error loading expectations:</p>
    <pre>{props.error?.message}</pre>
  </Alert>
);

/**
 *
 */
const Expectations = ({
  api,
  ruleManager,
  editorValue,
}: {
  api: apiCall;
  ruleManager: DocuScopeRules;
  editorValue: string;
}) => {
  const text = useCoherenceText();

  //>---------------------------------------------

  const [disabled, setDisabled] = useState(false);

  const disableTreeSelect = (doDisable: boolean) => {
    console.log("disableTreeSelect (" + doDisable + ")");

    setDisabled(doDisable);
  };

  //>---------------------------------------------

  useEffect(() => {
    //console.log ("useEffect ()");

    if (text !== "") {
      //setStatus("Retrieving results...");

      const customTopics = ruleManager.getAllCustomTopics();
      const customTopicsStructured = ruleManager.getAllCustomTopicsStructured();

      //const escaped = encodeURIComponent(text);
      //const encoded = window.btoa(escaped);

      const encoded = encodeURIComponent(text);

      api(
        "ontopic",
        {
          custom: customTopics,
          customStructured: customTopicsStructured,
          base: encoded,
        },
        "POST"
      );
      // .then((incoming: any) => {
      //   const coherence = incoming.coherence;
      //   const local = incoming.local;

      //   //setCoherenceData(coherence);
      //   //setLocalCoherenceData(local);
      // });
    }
  }, [text, api, ruleManager]);

  // const ref = useId();

  const [ruleState, setCurrentRuleState] = useState({
    currentRule: -1,
    currentCluster: -1,
  });

  /**
   *
   */
  const onRuleClick = (
    e: React.MouseEvent<HTMLLIElement, MouseEvent>,
    ruleIndex: number
  ) => {
    console.log("onRuleClick (" + ruleIndex + ")");

    e.preventDefault();
    e.stopPropagation();

    if (disabled == true) {
      console.log("Disabled!");
      return;
    }

    //disableEditor ();

    setCurrentRuleState({ currentRule: ruleIndex, currentCluster: -1 });
  };

  /**
   *
   */
  const onClusterClick = (
    e: React.MouseEvent<HTMLLIElement, MouseEvent>,
    ruleIndex: number,
    clusterIndex: number
  ) => {
    console.log("onClusterClick (" + ruleIndex + "," + clusterIndex + ")");

    e.preventDefault();
    e.stopPropagation();

    if (disabled == true) {
      console.log("Disabled!");
      return;
    }

    //disableEditor ();

    //let topicList=props.ruleManager.getClusterTopics (ruleIndex, clusterIndex);

    const topicList = ruleManager.getClusterName(ruleIndex, clusterIndex);

    /*
    // Don't change context if we've found a duplicate in the current edit window
    if (props.ruleManager.checkDuplicates (ruleIndex,clusterIndex,topicList)!=null) {
      console.log ('Error: duplicate(s) found');
      return;
    }
    */

    setCurrentRuleState({
      currentRule: ruleIndex,
      currentCluster: clusterIndex,
    });

    const highlighter = new TopicHighlighter();

    highlighter.highlightTopic(-1, -1, topicList);
  };

  /**
   *
   * Right now, each expectation has 2 states:
   *
   *   topic cluster associated with it is empty (Warning Icon)
   *   topic cluster associated with it has at least one topic (word or phrase) in it. (No Icon)
   *
   * In the new online version, I would like to visually differentiate the following 3 states per expectation:
   *
   *   topic cluster associated with it is empty (zero pre-defined topics) —> Warning Icon
   *   topic cluster associated with it has at least one pre-defined topic in it; and there are no user-defined topics. —> (No Icon)
   *   topic cluster associated with it has art least one user-defined topic in it. There may be zero or more pre-defined topics —> (New Icon)
   *
   * From the user’s perspective:
   *
   *   If an expectation is in state #1, the user must enter some topics to the topic cluster.
   *   If an expectation is in state #2, the user may enter user-defined topics, but it is not required (thus no Icon).
   *   If an expectation is in state #3, the user is reminded that the expectation’s topic cluster has been customized by them.
   *
   */
  const createRuleTree = (
    ruleManager: DocuScopeRules,
    currentRule: number,
    currentCluster: number
  ) => {
    const listElements = [];

    for (let i = 0; i < ruleManager.rules.length; i++) {
      const aRule: any = ruleManager.rules[i];
      const clusterList = [];

      for (let j = 0; j < aRule.children.length; j++) {
        let clustercount = (
          <img className="cluster-mini-icon" src={clusterWarningIcon} />
        );
        const aCluster = aRule.children[j];
        const id = "rule-" + i + "-" + j;

        let clusterClass = "cluster-line";

        if (i == currentRule && j == currentCluster) {
          clusterClass = "cluster-line cluster-selected";
        }

        const predefCount = ruleManager.getClusterTopicCountPredefined(i, j);
        const customCount = ruleManager.getClusterTopicCountCustom(i, j);

        if (predefCount > 0) {
          clustercount = <div className="cluster-mini-icon" />;
        }

        if (customCount > 0) {
          clustercount = (
            <img className="cluster-mini-icon" src={clusterEditedIcon} />
          );
        }

        let upDog = <img className="cluster-up-arrow" src={clusterUpIcon} />;

        const count = ruleManager.topicSentenceCount(i, j);
        const topicsentencecount = ("0" + count).slice(-2); // Format 2 digits so that the vertical alignment always works out

        if (count > 0) {
          upDog = (
            <img
              className="cluster-up-arrow"
              style={{ visibility: "hidden" }}
              src={clusterUpIcon}
            />
          );
          // } else {
        }

        clusterList.push(
          <li
            className="expectations-cluster"
            key={"cluster-" + i + "-" + j}
            id={id}
            onClick={(e) => onClusterClick(e, i, j)}
          >
            <div className={clusterClass}>
              <div className="cluster-line-label">{aCluster.name}</div>
              <div
                className="cluster-line-icon"
                title="Custom topics not defined here"
              >
                {clustercount}
              </div>
              <div
                className="cluster-line-icon"
                title="Current expectation value"
              >
                <img className="cluster-mini-icon" src={clusterActiveIcon} />
              </div>
              <div className="cluster-mini-label">Expected</div>
              <div className="cluster-line-icon">{upDog}</div>
              <div
                className="cluster-mini-label"
                title="Nr. sentences matching topics"
              >
                {topicsentencecount}
              </div>
            </div>
          </li>
        );
      }

      const subRules = (
        <ol type="1" className="expectations-clusters">
          {clusterList}
        </ol>
      );

      listElements.push(
        <li
          className="expectations-rule"
          key={"rule" + i}
          id={"rule-" + i}
          onClick={(e) => onRuleClick(e, i)}
        >
          <div className="expectations-rule-selected">{aRule.name}</div>
          {subRules}
        </li>
      );
    }

    return (
      <ol type="a" className="expectations-list">
        {listElements}
      </ol>
    );
  };

  const ruleTree = createRuleTree(
    ruleManager,
    ruleState.currentRule,
    ruleState.currentCluster
  );

  const clusterpanel = (
    <ClusterPanel
      api={api}
      ruleManager={ruleManager}
      currentRule={ruleState.currentRule}
      currentCluster={ruleState.currentCluster}
      editorValue={editorValue}
      disableTreeSelect={disableTreeSelect}
    />
  );

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Meet Readers&apos; Expectations</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <Subscribe>
          {/* <Card.Title>{ruleManager.name}</Card.Title> name is undefined */}
          <Card.Text>
            Respond to the following questions to meet the readers&apos;
            expectations. The sentences that you write to respond to each
            question include a unique topic cluster that consists of a set of
            words and phrases. DocuScope will automatically highlight sentences
            in your draft that most likely match these expectations.
          </Card.Text>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {ruleTree}
          </ErrorBoundary>
        </Subscribe>
        {clusterpanel}
      </Card.Body>
    </Card>
  );
};

export default Expectations;
