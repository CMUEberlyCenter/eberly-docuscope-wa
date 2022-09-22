/* Contents of the Expectations tab of the tools widget. */
import { Subscribe } from "@react-rxjs/core";
import React, { useId, useState, Component, useRef, useEffect } from "react";
import { Alert, Card, Collapse } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { ExpectationRule } from "../../service/expectations.service";
import TabTitle from "../TabTitle/TabTitle";

import "./Expectations.scss";

import optionalRuleIcon from "../../../css/icons/optional_icon.png";
import clusterActiveIcon from "../../../css/icons/active_icon.png";
import clusterWarningIcon from "../../../css/icons/topic_cluster_warning_icon.png";
import clusterUpIcon from "../../../css/icons/active_arrow_icon.png";

import ClusterPanel from '../ClusterPanel/ClusterPanel';
import TopicHighlighter from "../../TopicHighlighter";

import { upfrontValues } from "../../data/values";

import { combineLatest, filter, map } from "rxjs";
import { bind } from "@react-rxjs/core";

import { currentTool$ } from "../../service/current-tool.service";
import { lockedEditorText$ } from "../../service/editor-state.service";
import { useLockedEditorText } from "../../service/editor-state.service";

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
const Expectations = (props: { 
    api: apiCall,
    ruleManager: any,
    editorValue: string
  }) => {

  const text = useCoherenceText();

  //>---------------------------------------------

  const [disabled, setDisabled] = useState(false);

  const disableTreeSelect = (doDisable:boolean) => {
    console.log ("disableTreeSelect ("+doDisable+")");

    setDisabled(doDisable);
  }  

  //>---------------------------------------------

  useEffect(() => {
    //console.log ("useEffect ()");

    if (text !== "") {
      //setStatus("Retrieving results...");

      let customTopics=props.ruleManager.getAllCustomTopics ();
      let customTopicsStructured=props.ruleManager.getAllCustomTopicsStructured ();

      const escaped = encodeURIComponent(text);

      const encoded = window.btoa(escaped);

      props.api("ontopic", { custom: customTopics, customStructured: customTopicsStructured, base: encoded }, "POST").then((incoming : any) => {        
        let coherence=incoming.coherence;
        let local=incoming.local;

        //setCoherenceData(coherence);
        //setLocalCoherenceData(local);        
      });
    }
  }, [text, props.api]);

  const ref = useId();

  const [ruleState, setCurrentRuleState] = useState({currentRule: -1, currentCluster: -1});

  /**
   * 
   */
  const onRuleClick = (e:any, ruleIndex: number) => {
    console.log ("onRuleClick ("+ruleIndex+")");

    e.preventDefault ();
    e.stopPropagation ();
   
    if (disabled==true) {
      console.log ("Disabled!");
      return;
    }

    setCurrentRuleState ({currentRule: ruleIndex, currentCluster: -1});
  }

  /**
   * 
   */
  const onClusterClick = (e:any, ruleIndex: number, clusterIndex: number) => {
    console.log ("onClusterClick ("+ruleIndex+","+clusterIndex+")");    

    e.preventDefault ();
    e.stopPropagation ();

    if (disabled==true) {
      console.log ("Disabled!");
      return;
    }    

    //let topicList=props.ruleManager.getClusterTopics (ruleIndex, clusterIndex);

    let topicList=props.ruleManager.getClusterName (ruleIndex, clusterIndex);

    /*
    // Don't change context if we've found a duplicate in the current edit window
    if (props.ruleManager.checkDuplicates (ruleIndex,clusterIndex,topicList)!=null) {
      console.log ('Error: duplicate(s) found');
      return;
    }
    */

    setCurrentRuleState ({
      currentRule: ruleIndex, 
      currentCluster: clusterIndex
    });
 
    let highlighter=new TopicHighlighter ();

    highlighter.highlightTopic (-1,-1,topicList);
  }  

  /**
   * 
   */
  const createRuleTree = (ruleManager: any, currentRule: number, currentCluster: number) => {
    let listElements=[];

    for (let i=0;i<ruleManager.rules.length;i++) {
      let aRule:any=ruleManager.rules [i];
      let clusterList=[];
          
      for (let j=0;j<aRule.children.length;j++) {
        let clustercount=<img className="cluster-mini-icon" src={clusterWarningIcon}/>;
        let aCluster=aRule.children [j];
        let id="rule-"+i+"-"+j;

        let clusterClass="cluster-line";

        if ((i==currentRule) && (j==currentCluster)) {
          clusterClass="cluster-line cluster-selected";
        }

        let topicCount=ruleManager.getClusterTopicCount (i,j);
        if (topicCount>0) {
          clustercount=<div className="cluster-mini-icon" />;
        }

        let upDog=<img className="cluster-up-arrow" src={clusterUpIcon}/>;

        let count=ruleManager.topicSentenceCount (i,j);
        let topicsentencecount=("0" + count).slice(-2); // Format 2 digits so that the vertical alignment always works out

        if (count>0) {
          upDog=<img className="cluster-up-arrow" style={{visibility: "hidden"}} src={clusterUpIcon}/>;          
        }

        clusterList.push (<li className="expectations-cluster" key={"cluster-"+i+"-"+j} id={id} onClick={(e) => onClusterClick (e,i,j)}>
          <div className={clusterClass}>
            <div className="cluster-line-label">{aCluster.name}</div>
            <div className="cluster-line-icon" title="Custom topics not defined here">{clustercount}</div>
            <div className="cluster-line-icon" title="Current expectation value"><img className="cluster-mini-icon" src={clusterActiveIcon}/></div>
            <div className="cluster-mini-label">Expected</div>
            <div className="cluster-line-icon">{upDog}</div>
            <div className="cluster-mini-label" title="Nr. sentences matching topics">{topicsentencecount}</div>
          </div>
        </li>);
      }

      let subRules=<ol type="1" className="expectations-clusters">{clusterList}</ol>

      listElements.push (<li className="expectations-rule" key={"rule"+i} id={"rule-"+i} onClick={(e) => onRuleClick (e,i)}><div className="expectations-rule-selected">{aRule.name}</div>{subRules}</li>)    
    }

    return (<ol type="a" className="expectations-list">{listElements}</ol>);
  }

  const ruleTree = createRuleTree (props.ruleManager, ruleState.currentRule, ruleState.currentCluster);

  const clusterpanel = <ClusterPanel api={props.api} ruleManager={props.ruleManager} currentRule={ruleState.currentRule} currentCluster={ruleState.currentCluster} editorValue={props.editorValue} disableTreeSelect={disableTreeSelect} />;

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
        {clusterpanel}
      </Card.Body>
    </Card>
  );
};

export default Expectations;
