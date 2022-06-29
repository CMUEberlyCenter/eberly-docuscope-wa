import React, { Component, useRef, useEffect } from "react";
import { Button, Alert, Card, Container, Form, Nav, Navbar, NavDropdown, Tab, Tabs } from "react-bootstrap";

//import TopicEditor from '../TopicEditor/TopicEditor';

import './ClusterPanel.scss';
import './ClusterTopics.scss';

import clusterIcon from '../../../css/icons/topic_cluster_icon.png';

/**
 *
 */
class ClusterPanel extends Component {

  /**
   * 
   */
  constructor (props) {
    super (props);

    this.state = {      
      currentTab: "expectationabout",
      topics: "",
      topicList: []
    };

    this.switchTab=this.switchTab.bind(this);
    this.onTopicsChange=this.onTopicsChange.bind(this);
    this.onCustomTopicUpdate=this.onCustomTopicUpdate.bind(this);
  }

  /**
   * 
   */
  switchTab (key) {
  	console.log ("switchTab ("+key+")");

    this.setState ({
      currentTab: key
    });
  }

  /**
   * 
   */
  onTopicsChange (e) {
  	console.log ("onTopicsChange ()");
  	
  	let newList=[];

  	let rawText=e.target.value;

    if (rawText) {
      let lines=rawText.split ("\n");
      for (let i=0;i<lines.length;i++) {
      	if (lines [i]!="") {
      	  newList.push (lines [i]);
      	}
      }
    }

    console.log (newList);

  	this.setState ({
      topics: e.target.value,
      topicList: newList
  	});
  }

  /**
   * 
   */
  onCustomTopicUpdate (e) {
    console.log ("onCustomTopicUpdate ()");

  }

  /**
   * 
   */
  createRuleDescription () {
  	console.log ("createRuleDescription ("+this.props.currentRule+","+this.props.currentCluster+")");

  	let rules=this.props.ruleManager.rules;

  	if (!rules) {
      return ("Internal error: no rule definitions available");
  	}
  	
  	// Nothing selected yet
  	if (this.props.currentRule==-1) {
      return ("");
  	}

  	let rule=rules [this.props.currentRule];

  	if (!rule) {
      return ("Internal error: invalid rule provided");
  	}

    if (this.props.currentCluster!=-1) {
      let description=rule.children [this.props.currentCluster].description;
  	  if (description=="") {
  	    description=" ";
  	  }
  	  console.log ("Description: " + description);
  	  return (description);
    }

    return (rule.description);
  }

  /**
   * 
   */
  createTopicEditor () {
    return (<div className="cluster-topic-editor">
        <textarea
          className="cluster-topic-input"
	      value={this.state.topics}
	      onChange={this.onTopicsChange} />
    	<div className="cluster-topic-controls">
    	  <Button onClick={(e) => this.onCustomTopicUpdate (e)}>Update</Button>
    	</div>
    </div>);
  }

  /**
   * 
   */
  createExamplePanel () {
  	let rules=this.props.ruleManager.rules;

  	if (!rules) {
      return (<div className="cluster-examples">Internal error: no rule definitions available</div>);
  	}
  	
  	if (this.props.currentRule==-1) {
      return (<div className="cluster-examples"></div>);
  	}

  	if (this.props.currentCluster==-1) {
      return (<div className="cluster-examples"></div>);
  	}  	

  	let rule=rules [this.props.currentRule];

  	if (!rule) {
      return (<div className="cluster-examples">Internal error: invalid rule provided</div>);
  	}

    let cluster=rule.children [this.props.currentCluster];

  	if (!cluster) {
      return (<div className="cluster-examples">Internal error: invalid cluster provided</div>);
  	}

  	//console.log ("Example data: " + cluster.examples);

    return (<div className="cluster-examples" dangerouslySetInnerHTML={{ __html: cluster.examples }}></div>);
  }

  /**
   * 
   */
  render () {
  	let ruledescription=this.createRuleDescription ();
  	let topiceditor=this.createTopicEditor ();
  	let examples=this.createExamplePanel();

  	return (<div className="cluster-container">
  		<div className="cluster-title">
  		  <img src={clusterIcon} className="cluster-icon" />
  		  <div className="card-title h5">Topic Cluster</div>
  		</div>
  		<div className="cluster-content">
  		  <div className="cluster-content-left">
  		  Left
  		  </div>  		  
  		  {topiceditor}
  		</div>
	    <Tabs className="mt-1 px-2" onSelect={(key) => this.switchTab(key)}>
	      <Tab eventKey={"expectationabout"} title="About this Expectation">
            <div className="cluster-text-padder" dangerouslySetInnerHTML={{ __html: ruledescription }} >
	        </div>
	      </Tab>
	      <Tab eventKey={"examples"} title="Sample Sentences">
	      {examples}
	      </Tab>
	    </Tabs>  		
  	</div>);
  }
}

export default ClusterPanel;
