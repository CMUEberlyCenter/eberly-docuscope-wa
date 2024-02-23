/* Contents of the Expectations tab of the tools widget. */
import { Subscribe } from "@react-rxjs/core";
import React, { useEffect, useState } from "react";
import { Alert, Button, Card, ListGroup } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import TabTitle from "../TabTitle/TabTitle";

import "./Expectations.scss";

import clusterUpIcon from "../../assets/icons/active_arrow_icon.png";
import clusterActiveIcon from "../../assets/icons/active_icon.png";
import clusterEditedIcon from "../../assets/icons/edited_icon.png";
import clusterWarningIcon from "../../assets/icons/topic_cluster_warning_icon.png";

import { highlightTopic } from "../../service/topic.service";
import ClusterPanel from "../ClusterPanel/ClusterPanel";

import { useConfiguration, useRules } from "../../service/rules.service";
import { expectation } from "../../service/scribe.service";

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

/** Component specific error message. */
const ErrorFallback = (props: { error?: Error }) => (
  <Alert variant="danger">
    <p>Error loading expectations:</p>
    <pre>{props.error?.message}</pre>
  </Alert>
);

interface ExpectationProps {
  enableTopicEditing?: boolean;
}
/**
 *
 */
const Expectations = ({ enableTopicEditing }: ExpectationProps) => {
  const [disabled, setDisabled] = useState(false);
  const ruleManager = useRules();
  const { data: configuration } = useConfiguration();

  const [ruleState, setCurrentRuleState] = useState({
    currentRule: -1,
    currentCluster: -1,
  });

  useEffect(() => {
    const cluster = ruleManager?.getClusterByIndex(
      ruleState.currentRule,
      ruleState.currentCluster
    );
    expectation.next(cluster);
  }, [ruleManager, ruleState]);

  /**
   *
   */
  const onRuleClick = (
    e: React.MouseEvent<HTMLElement, MouseEvent>,
    ruleIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      return;
    }

    setCurrentRuleState({ currentRule: ruleIndex, currentCluster: -1 });
    return false;
  };

  /**
   *
   */
  const onClusterClick = (
    e: React.MouseEvent<Element, MouseEvent>,
    ruleIndex: number,
    clusterIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      return;
    }

    const topicList =
      ruleManager?.getClusterName(ruleIndex, clusterIndex) ?? [];

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

    highlightTopic(-1, -1, topicList);
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

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Meet Readers&apos; Expectations</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <Subscribe>
          <Card.Title>{configuration?.rules.name}</Card.Title>
          <Card.Text className="overflow-auto" style={{ maxHeight: "5em" }}>
            {configuration?.rules.overview ?? (
              <>
                Respond to the following questions to meet the readers&apos;
                expectations. The sentences that you write to respond to each
                question include a unique topic cluster that consists of a set
                of words and phrases. DocuScope will automatically highlight
                sentences in your draft that most likely match these
                expectations.
              </>
            )}
          </Card.Text>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="overflow-auto expectations" style={{ maxHeight: "50vh", fontSize: '75%' }}>
              <ListGroup>
                {ruleManager?.rules.map((rule, i) => (
                  <ListGroup.Item action as="div" key={rule.id + i} aria-expanded="true" active={ruleState.currentRule === i && ruleState.currentCluster < 0}>
                    <div className="d-flex">
                    <Button size="sm" variant="none" className="expand-toggle" onClick={e => {
                      const p = e.currentTarget.closest('[aria-expanded]');
                      p?.setAttribute('aria-expanded', p.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
                    }}>
                      <i className="fa-solid fa-caret-down flex-shrink-0"></i>
                    </Button>
                    <div className="fw-bold flex-grow-1 pointer" onClick={e => onRuleClick(e, i)}>{rule.name}</div>
                    </div>
                    <div className="expanded" id={rule.id}>
                      <ListGroup>
                        {rule.children.map((cluster, j) => {
                          const predefCount = ruleManager.getClusterTopicCountPredefined(
                            i,
                            j
                          );
                          const customCount = ruleManager.getClusterTopicCountCustom(i, j);
                          let clustercount = (
                            <img className="cluster-mini-icon" src={clusterWarningIcon} />
                          );
                          if (predefCount > 0) {
                            clustercount = <div className="cluster-mini-icon" />;
                          }

                          if (customCount > 0) {
                            clustercount = (
                              <img className="cluster-mini-icon" src={clusterEditedIcon} />
                            );
                          }

                          const count = ruleManager.topicSentenceCount(i, j);
                          return (
                            <ListGroup.Item action key={cluster.id} onClick={e => onClusterClick(e, i, j)} active={ruleState.currentRule === i && ruleState.currentCluster === j} className="d-flex flex-row pointer">
                              <div className="flex-grow-1">{cluster.name}</div>
                              <div className="cluster-line-icon" title="Custom topics not defined here">
                                {clustercount}
                              </div>
                              <div className="cluster-line-icon" title="Current expectation value">
                                <img className="cluster-mini-icon" src={clusterActiveIcon} />
                              </div>
                              <div className="cluster-mini-label">Expected</div>
                              <div className="cluster-line-icon">
                                <img className={`cluster-up-arrow ${count > 0 ? "invisible" : "visible"}`}
                                  style={{ visibility: "hidden" }}
                                  src={clusterUpIcon}
                                />
                              </div>
                              <div className="cluster-mini-label" title="Number of sentences matchin topics">
                                {count.toString().padStart(2, "0")}
                              </div>
                            </ListGroup.Item>)
                        })}
                      </ListGroup>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          </ErrorBoundary>
        </Subscribe>
        <ClusterPanel
          currentRule={ruleState.currentRule}
          currentCluster={ruleState.currentCluster}
          disableTreeSelect={(val: boolean) => setDisabled(val)}
          enableTopicEditing={enableTopicEditing}
        />
      </Card.Body>
    </Card>
  );
};

export default Expectations;
