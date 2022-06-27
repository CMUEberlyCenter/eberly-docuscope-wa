import React, { Component, useRef, useEffect } from "react";
import { Button, Alert, Card, Container, Form, Nav, Navbar, NavDropdown, Tab, Tabs } from "react-bootstrap";

//import TopicEditor from '../TopicEditor/TopicEditor';

import './ClusterPanel.scss';
import './ClusterTopics.scss';

import clusterIcon from '../../../css/icons/topic_cluster_icon.png';

// https://javascript.plainenglish.io/editable-html-in-react-6dd67dd7e302
const EditableElement = (props) => {
  const { onChange } = props;
  const element = useRef();
  let elements = React.Children.toArray(props.children);
  if (elements.length > 1) {
    throw Error("Can't have more than one child");
  }
  const onMouseUp = () => {
    const value = element.current?.value || element.current?.innerText;
    onChange(value);
  };
  useEffect(() => {
    const value = element.current?.value || element.current?.innerText;
    onChange(value);
  }, []);
  elements = React.cloneElement(elements[0], {
    contentEditable: true,
    suppressContentEditableWarning: true,
    ref: element,
    onKeyUp: onMouseUp
  });
  return elements;
};

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
      topics: "Enter custom topics here"
    };

    this.switchTab=this.switchTab.bind(this);
    this.onTopicsChange=this.onTopicsChange.bind(this);
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
  onTopicsChange (value) {
  	console.log ("onTopicsChange ()");
  	console.log (value);

  	this.setState ({
      topics: value
  	});
  }

  /**
   * 
   */
  createRuleDescription () {
  	let rules=this.props.ruleManager.rules;

  	if (!rules) {
      return ("Internal error: no rule definitions available");
  	}
  	
  	if (this.props.currentRule==-1) {
      return ("Internal error: invalid rule or cluster index provided");
  	}

  	if (this.props.currentRule==-1) {
  	  return ("");
  	}

  	let rule=rules [this.props.currentRule];

  	if (!rule) {
      return ("Internal error: invalid ruleprovided");
  	}

    return (rule.description);
  }

  /**
   * 
   */
  createTopicEditor () {
    return (<div className="cluster-topic-editor">
    	<div className="cluster-topic-input">   
	      <EditableElement onChange={this.onTopicsChange}>
	        <p>{this.state.topics}</p>
	      </EditableElement>    	  
    	</div>
    	<div className="cluster-topic-controls">
    	  <Button>Update</Button>
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

  	console.log ("Example data: " + cluster.examples);

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
