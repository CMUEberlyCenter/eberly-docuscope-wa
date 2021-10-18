import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import { Button, Colors } from 'react-foundation';
import { Tabs, TabItem, TabsContent, TabPanel } from 'react-foundation';

import DocuScopeWA from './DocuScopeWAScrim';
import DocuScopeRules from './DocuScopeRules';

import '../css/main.css';
import '../css/docuscope.css';

import mainIcon from '../css/icons/audit_icon.png';

/**
 * https://bit.dev/digiaonline/react-foundation
 */
export default class DocuScopeWAStudent extends Component {

  /**
   *
   */
  constructor(props) {
    console.log ("DocuScopeWAStudent ()");

    super(props);

    this.state={
      loading: false,
      activeIndex: 1
    };

    this.onContextSelect=this.onContextSelect.bind (this);
    this.onClickRule=this.onClickRule.bind (this);
    this.onClickRuleChild=this.onClickRuleChild.bind (this);
  }

  /**
   *
   */
  onContextSelect (anIndex) {
    console.log ("onContextSelect ()");

    this.setState ({
      activeIndex: anIndex
    });
  }

  /**
   *
   */
  onClickRule (e) {
    console.log ("onClickRule ("+e.target.id+")");

    e.stopPropagation ();

    let aRule=this.props.ruleManager.getRule (e.target.id);
  }

  /**
   *
   */
  onClickRuleChild (e) {
    console.log ("onClickRuleChild ("+e.target.id+")");

    e.stopPropagation ();

    let aRuleChild=this.props.ruleManager.getRuleChild (e.target.id);
  }

  /**
   *
   */
  generateRuleElements () {
    let rulesElements=[];

    for (let i=0;i<this.props.ruleManager.rules.length;i++) {
      let aRule=this.props.ruleManager.rules [i];

      let childElements=[];

      for (let j=0;j<aRule.children.length;j++) {
        let aChild=aRule.children [j];
        let aChildElement=<li id={aChild.id} className="impressions-child" onClick={(e) => { this.onClickRuleChild(e) }}>{aChild.name}</li>;
        childElements.push (aChildElement);
      }
      
      rulesElements.push (<li id={aRule.id} className="impressions-item" onClick={(e) => { this.onClickRule(e) }}>{aRule.name}<ul className="impressions-children">{childElements}</ul></li>);
    }

    return (rulesElements);
  }

  /**
   *
   */
  generateExpectationsTab () {
    let ruleElements=this.generateRuleElements ();

    return (<div className="impressions">
      <div className="impressions-title">
        <img src={mainIcon} className="context-icon"></img><h3 className="context-title">Meet Readers' Expectations</h3>
      </div>
      <div className="impressions-description">
        <div className="impressions-name">
        {this.props.ruleManager.name}
        </div>
        <div className="impressions-statement">
        Respond to the following questions to meet the readers' expectations. The sentences that you write to respond to each question include a unique topic cluster that consists of a set of words and phrases. DocuScope will automatically highlight sentences in your draft that most likely match these expectations.
        </div>
      </div>
      <div className="impressions-content">
        <ol>
        {ruleElements}      
        </ol>
      </div>
      <div className="impressions-detail">
      </div>
    </div>);
  }  

  /**
   *
   */
  generateCoherenceTab () {
    return (<div className="impressions">
      <div className="impressions-title">
        <img src={mainIcon} className="context-icon"></img><h3 className="context-title">Create Flow in Your Writing</h3>
      </div>
      <div className="impressions-description">
      </div>
      <div className="impressions-content">
      </div>
      <div className="impressions-detail">
      </div>
    </div>);
  }  

  /**
   *
   */
  generateClarityTab () {
    return (<div className="impressions">
      <div className="impressions-title">
        <img src={mainIcon} className="context-icon"></img><h3 className="context-title">Polish Your Sentences for Clarity</h3>
      </div>
      <div className="impressions-description">
      </div>
      <div className="impressions-content">
      </div>
      <div className="impressions-detail">
      </div>
    </div>);
  }  

  /**
   *
   */
  generateImpressionsTab () {
    return (<div className="impressions">
      <div className="impressions-title">
        <img src={mainIcon} className="context-icon"></img><h3 className="context-title">Manage Readers' Impressions</h3>
      </div>
      <div className="impressions-description">
      </div>
      <div className="impressions-content">
      </div>
      <div className="impressions-detail">
      </div>
    </div>);
  }

  /**
   *
   */
  render() {
    let mainPage;
    let expectationsTab;
    let coherenceTab;
    let clarityTab;
    let impressionsTab;

    expectationsTab=this.generateExpectationsTab ();
    coherenceTab=this.generateCoherenceTab ();
    clarityTab=this.generateClarityTab ();
    impressionsTab=this.generateImpressionsTab ();

    mainPage=<div className="mainframe">
      <div className="menubar">menubar</div>
      <div className="content">
       <div className="leftcol">
        <Tabs>
          <TabItem isActive={this.state.activeIndex === 1} onClick={(e) => { this.onContextSelect(1) }}><a href="#">Expectations</a></TabItem>
          <TabItem isActive={this.state.activeIndex === 2} onClick={(e) => { this.onContextSelect(2) }}><a href="#">Coherence</a></TabItem>
          <TabItem isActive={this.state.activeIndex === 3} onClick={(e) => { this.onContextSelect(3) }}><a href="#">Clarity</a></TabItem>
          <TabItem isActive={this.state.activeIndex === 3} onClick={(e) => { this.onContextSelect(4) }}><a href="#">Impressions</a></TabItem>
        </Tabs>
        <TabsContent className="tabscontent">

          <TabPanel id={'tab1'} className="tabs-panel-override" isActive={this.state.activeIndex === 1}>
          {expectationsTab}
          </TabPanel>

          <TabPanel id={'tab2'} className="tabs-panel-override" isActive={this.state.activeIndex === 2}>
          {coherenceTab}
          </TabPanel>

          <TabPanel id={'tab3'} className="tabs-panel-override" isActive={this.state.activeIndex === 3}>
          {clarityTab}
          </TabPanel>

          <TabPanel id={'tab4'} className="tabs-panel-override" isActive={this.state.activeIndex === 4}>
          {impressionsTab}
          </TabPanel>
        </TabsContent>
       </div>
       <div className="centercol"></div>
       <div className="rightcol"></div>
      </div>
      <div className="statusbar">statusbar</div>
    </div>;

    return (mainPage);
  }
}
