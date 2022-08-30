import React, { Component, useRef, useEffect } from "react";
import { Button, Alert, Card, Container, Form, Nav, Navbar, NavDropdown, Tab, Tabs } from "react-bootstrap";

import DataTools from "../../DataTools";
import DocuScopeTools from "../../DocuScopeTools";

import './ClusterPanel.scss';
import './ClusterTopics.scss';

import clusterIcon from '../../../css/icons/topic_cluster_icon.png';

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
		    "no_lexical_overlap": false
		}
	]
 */
class ClusterPanel extends Component {

  /**
   * 
   */
  constructor (props) {
    super (props);

    this.dataTools=new DataTools ();
    this.docuscopeTools=new DocuScopeTools ();

    this.state = {      
      currentTab: "expectationabout",
      topicText: "",
      topicTextStatic: ""
    };

    this.switchTab=this.switchTab.bind(this);
    this.onTopicsChange=this.onTopicsChange.bind(this);
    this.onCustomTopicUpdate=this.onCustomTopicUpdate.bind(this);
  }

  /**
   * Update with the latest from the actual data
   */
  componentDidUpdate(prevProps) {
    //console.log ("componentDidUpdate ()");

    if ((prevProps.currentRule!=this.props.currentRule) || (prevProps.currentCluster!=this.props.currentCluster)) {
      let aText=this.getTopicText ();    
      let aTextStatic=this.getTopicTextStatic ();
      this.setState ({
        topicText: aText,
        topicTextStatic: aTextStatic
      });      
    }
  }

  /**
   * 
   */
  getTopicTextStatic () {
    //console.log ("getTopicTextStatic ("+this.props.currentRule + "," + this.props.currentCluster+")");

    let topictextStatic="";
    let cluster=this.props.ruleManager.getClusterByIndex (this.props.currentRule,this.props.currentCluster);
    if (cluster!=null) {
      topictextStatic=this.props.ruleManager.getClusterTopicTextStatic (cluster);
    } else {
      console.log ("Warning cluster not found");
    }

    return (topictextStatic);
  }

  /**
   * 
   */
  getTopicText () {
    //console.log ("getTopicText ("+this.props.currentRule + "," + this.props.currentCluster+")");

  	let topictext="";
  	let cluster=this.props.ruleManager.getClusterByIndex (this.props.currentRule,this.props.currentCluster);
  	if (cluster!=null) {
      topictext=this.props.ruleManager.getClusterTopicText (cluster);
  	} else {
      console.log ("Warning cluster not found");
    }

  	return (topictext);
  }

  /**
   * 
   */
  switchTab (key) {
  	//console.log ("switchTab ("+key+")");

    this.setState ({
      currentTab: key
    });
  }

  /**
   * 
   */
  onTopicsChange (e) {
  	//console.log ("onTopicsChange ()");    
  	this.setState ({
      topicText: e.target.value
  	});  	
  }

  /**
   * 
   */
  onCustomTopicUpdate (e) {
    //console.log ("onCustomTopicUpdate ()");
    let topicArray=[];

    if ((typeof this.state.topicText === 'string') && (this.state.topicText.trim().length > 0)) {
      topicArray=this.dataTools.topicsToArray (this.state.topicText);
    }

    if (this.props.ruleManager.setClusterCustomTopics (this.props.currentRule,this.props.currentCluster, topicArray)==false) {
      console.log ("Show an error dialog to the user");
    } else {
      // Request new data from the server

      let text=this.props.editorValue;

      let customTopics=this.props.ruleManager.getAllCustomTopics ();
      
      const escaped = encodeURIComponent(text);

      const encoded = window.btoa(escaped);

      this.props.api("ontopic", { custom: customTopics, base: encoded }, "POST").then((incoming) => {});
    }
  }

  /**
   * 
   */
  createRuleDescription () {
  	//console.log ("createRuleDescription ("+this.props.currentRule+","+this.props.currentCluster+")");

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
  	  //console.log ("Description: " + description);
  	  return (description);
    }

    return (rule.description);
  }

  /**
   * 
   */
  createTopicEditor () {
    let enableEditor=false;
    let textareaClassName="cluster-topic-input";

    if (this.props.currentCluster==-1) {
      enableEditor=true;
      textareaClassName="cluster-topic-input cluster-textarea-disabled";
    }

    return (<div className="cluster-topic-editor">
      <div>Pre-defined Topics:</div>
      <textarea
        readonly={true}
        className={textareaClassName}
        value={this.state.topicTextStatic}>
      </textarea>      
      <div>Custom Topics:</div>
      <textarea
        readonly={enableEditor}
        className={textareaClassName}
	      value={this.state.topicText}
	      onChange={(e) => this.onTopicsChange (e)}>
      </textarea>
    	<div className="cluster-topic-controls">
    	  <Button onClick={(e) => this.onCustomTopicUpdate (e)} disabled={enableEditor}>Update</Button>
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
   * Via Suguru in email:
   * 
   * I don’t think we talked about this… There is a hard coded HTML string defined the UI code, which I have not externalized yet :-(
   * 
   * CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE = "<p>Enter words and phrases associated with <b style=\"color: \'{}\'\">{}</b> in the text field.</p>"
   * 
   * The variable “{}” is replaced by the name of the topic cluster associated with the currently selected rule.
   * 
   * It is followed by the following HTML string in the instructions_en.yml file. 
   * 
   * topic_cluster_edu: >
   *  <p><b>What are topic clusters?</b> &mdash; Consider what your responses are for this expectation, and enter the words/phrases you need to convey them to your reader. A set of words/phrases for each response is called a topic cluster.</p>
 
   */
  createClusterDefinition () {
    if (this.props.currentCluster!=-1) {
      let cluster=this.props.ruleManager.getClusterByIndex (this.props.currentRule,this.props.currentCluster);

      let clusterList=this.props.ruleManager.listClustersForRule (this.props.currentRule,this.props.currentCluster);
      let clusterSentence=this.docuscopeTools.clusterListToSentence (clusterList);      

      let defined="<p>Enter words and phrases associated with <b style=\"color: black;\">[replacer]</b> in the text field.</p> <br> <p><b>What are topic clusters?</b> &mdash; Consider what your responses are for this expectation, and enter the words/phrases you need to convey them to your reader. A set of words/phrases for each response is called a topic cluster.</p>";
      let clean=defined;
      if (cluster!=null) {
        clean=defined.replace ("[replacer]", clusterSentence);
      }
      return (clean);
    }

    return ("&nbsp;");
  }

  /**
   * 
   */
  render () {
  	let ruledescription="<div></div>";
  	let topiceditor;
  	let examples;
    let clusterdefinition;

    ruledescription=this.createRuleDescription ();
    topiceditor=this.createTopicEditor ();
    examples=this.createExamplePanel();    
    clusterdefinition=this.createClusterDefinition ();

  	return (<div className="cluster-container">
  		<div className="cluster-title">
  		  <img src={clusterIcon} className="cluster-icon" />
  		  <div className="card-title h5">Topic Cluster</div>
  		</div>
  		<div className="cluster-content">
  		  <div className="cluster-content-left" dangerouslySetInnerHTML={{ __html: clusterdefinition }} >
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
