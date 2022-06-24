/* Contents of the Expectations tab of the tools widget. */
import { Subscribe } from "@react-rxjs/core";
import React, { useId, useState } from "react";
import { Alert, Card, Collapse } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { ExpectationRule } from "../../service/expectations.service";
import TabTitle from "../TabTitle/TabTitle";

import "./Expectations.scss";

import optionalRuleIcon from "../../../css/icons/optional_icon.png";
import clusterActiveIcon from "../../../css/icons/active_icon.png";
import clusterWarningIcon from "../../../css/icons/topic_cluster_warning_icon.png";

import ClusterPanel from '../ClusterPanel/ClusterPanel';

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
const Expectations = (props: { 
    api: apiCall,
    ruleManager: any
  }) => {

  // MvV: We should load this from disk through the node service since this will
  // be both authorable and different per course/context. So we shouldn't hardcode it
  // into the webpack bundle
  //const expectations = useExpectations();

  const ref = useId();

  const [ruleDescription, setRuleDescroption] = useState("");

  /**
   * 
   */
  const onClusterClick = (e:any, rule: number, cluster: number) => {
    console.log ("onClusterClick ("+rule+","+cluster+")");    
    e.preventDefault ();
  }

  /**
   * 
   */
  const onRuleClick = (e:any, ruleIndex: number) => {
    //console.log ("onRuleClick ("+ruleIndex+")");
    e.preventDefault ();
    let aRule:any=props.ruleManager.rules [ruleIndex];

    setRuleDescroption (aRule.description);
  }

  /**
   * 
   */
  const createRuleTree = (ruleManager: any) => {
    let listElements=[];

    for (let i=0;i<ruleManager.rules.length;i++) {
      let aRule:any=ruleManager.rules [i];
      let clusterList=[];

      for (let j=0;j<aRule.children.length;j++) {
        let aCluster=aRule.children [j];
        let id="rule-"+i+"-"+j;
        clusterList.push (<li className="expectations-cluster" key={"cluster-"+i+"-"+j} id={id} onClick={(e) => onClusterClick (e,i,j)}>
          <div className="cluster-line">
            <div className="cluster-line-label">{aCluster.name}</div>
            <div className="cluster-line-icon"><img className="cluster-mini-icon" src={clusterWarningIcon}/></div>
            <div className="cluster-line-icon"><img className="cluster-mini-icon" src={clusterActiveIcon}/></div>
            <div className="cluster-mini-label">Expected</div>
            <div className="cluster-line-icon"><img className="cluster-mini-icon" src={clusterActiveIcon}/></div>            
            <div className="cluster-mini-label">0</div>
          </div>
        </li>);
      }

      let subRules=<ol type="a" className="expectations-clusters">{clusterList}</ol>
      listElements.push (<li className="expectations-rule" key={"rule"+i} id={"rule-"+i} onClick={(e) => onRuleClick (e,i)}>{aRule.name}{subRules}</li>)    
    }

    return (<ol type="1" className="expectations-list">{listElements}</ol>);
  }

  const ruleTree = createRuleTree (props.ruleManager);

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Meet Readers&apos; Expectations</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <Subscribe>
          <Card.Title>{props.ruleManager.name}</Card.Title>
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
        <ClusterPanel ruleDescription={ruleDescription}/>
      </Card.Body>
    </Card>
  );
};
export default Expectations;
