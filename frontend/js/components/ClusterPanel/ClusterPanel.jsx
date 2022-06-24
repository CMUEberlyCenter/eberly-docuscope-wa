import React, { Component } from "react";
import { Alert, Card, Container, Form, Nav, Navbar, NavDropdown, Tab, Tabs } from "react-bootstrap";

import './ClusterPanel.scss';

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
      currentTab: "expectationabout"
    };

    this.switchTab=this.switchTab.bind(this);
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
  render () {
  	return (<div className="cluster-container">
  		<div className="cluster-title">
  		  <img src={clusterIcon} className="cluster-icon" />
  		  <div className="card-title h5">Topic Cluster</div>
  		</div>
  		<div className="cluster-content">
  		</div>
	    <Tabs className="mt-1 px-2" onSelect={(key) => this.switchTab(key)}>
	      <Tab eventKey={"expectationabout"} title="About this Expectation">
            <div className="cluster-text-padder" dangerouslySetInnerHTML={{ __html: this.props.ruleDescription }} >
	        </div>
	      </Tab>
	      <Tab eventKey={"examples"} title="Sample Sentences">
	      </Tab>
	    </Tabs>  		
  	</div>);
  }
}

export default ClusterPanel;
