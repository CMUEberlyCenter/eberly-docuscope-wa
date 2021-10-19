import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import { Switch, Button, Colors, Sizes } from 'react-foundation';
import { Tabs, TabItem, TabsContent, TabPanel } from 'react-foundation';

// https://docs.slatejs.org/walkthroughs/installing-slate
import { Editor } from 'slate-react';
import { Value } from 'slate';
import { createEditor } from 'slate';
import Plain from 'slate-plain-serializer';

import DocuScopeWA from './DocuScopeWAScrim';
import DocuScopeRules from './DocuScopeRules';
import DataTools from './DataTools';

import '../css/main.css';
import '../css/docuscope.css';
import '../css/editor.css';

import mainIcon from '../css/icons/audit_icon.png';

let initialValue = Value.fromJSON({
  document: {
    nodes: [
      {
        object: 'block',
        type: 'paragraph',
        nodes: [
          {
            object: 'text',
            text: '',
          },
        ],
      },
    ],
  },
});

/**
 * https://bit.dev/digiaonline/react-foundation
 */
export default class DocuScopeWAStudent extends Component {

  schema = {
    annotations: {
      highlight: {
        isAtomic: true,
      },
      underline: {
        isAtomic: true,
      }
    },
  }  

  /**
   *
   */
  constructor(props) {
    console.log ("DocuScopeWAStudent ()");

    super(props);


    this.bURLServer='';
    this.bURLPath='/api/activity/ontopic/';

    if (typeof backendServer !== 'undefined') {
      this.bURLServer=backendServer;
      console.log ("Switching back-end url to one defined in the html page: " + this.bURLServer + this.bURLPath);
    }

    this.dataTools=new DataTools ();

    let value=initialValue;

    this.state = {
      loading: false,
      activeIndex: 1,
      currentRule: null,
      currentRuleChild: null,
      locked: false,
      fontSize: "12pt",
      value: value,
      invalidated: false,
      sentences: null,
      sentence: null,
      collapsed: null,
      expanded: null,
      loading: false,
      topics: null,
      topic: null      
    };

    this.onContextSelect=this.onContextSelect.bind (this);
    this.onClickRule=this.onClickRule.bind (this);
    this.onClickRuleChild=this.onClickRuleChild.bind (this);

    // Editor event handlers
    this.insertText = this.insertText.bind(this);    
  }

  /**
   *
   */
  insertText (text)  {
    console.log ("insertText ()");

    return (text);
  }

  /**
   * On change, save the new `value`.
   *
   * @param {Editor} editor
   */
  onChange ({ value }) {
    //console.log ("onChange ()");

    this.setState({ value }, (e) => {
      let invalidated=this.state.invalidated;
      let expanded=this.dataTools.deepCopy (this.state.expanded);
      let topic=this.dataTools.deepCopy (this.state.topic);
      let topics=null;

      /*  
      if (value.document.text!="") {
        if (this.state.check!=value.document.text) {
          //console.log ("onChange () actual");

          invalidated=true;
          topic=null;

          if (this.state.topics!=null) {
            topics=this.copyTopics ();
          }
        } else {
          topics=this.copyTopics ();       
        }
      } else {
        topics=null;
        expanded=null;
      }
      */

      this.setState ({
                      valueRaw: value.document,
                      check: value.document.text, 
                      invalidated: invalidated, 
                      topics: topics, 
                      topic: topic,
                      expanded: expanded});
    });
  }

  /**
   * Render a Slate block.
   *
   * @param {Object} props
   * @return {Element}
   */
  renderBlock (props, editor, next) {
    const { attributes, children, node } = props

    switch (node.type) {
      case 'block-quote':
        return <blockquote {...attributes}>{children}</blockquote>
      case 'bulleted-list':
        return <ul {...attributes}>{children}</ul>
      case 'heading-one':
        return <h1 {...attributes}>{children}</h1>
      case 'heading-two':
        return <h2 {...attributes}>{children}</h2>
      case 'list-item':
        return <li {...attributes}>{children}</li>
      case 'numbered-list':
        return <ol {...attributes}>{children}</ol>
      default:
        return next()
    }
  }

  /**
   * Render a Slate mark.
   *
   * @param {Object} props
   * @return {Element}
   */
  renderMark (props, editor, next) {
    const { children, mark, attributes } = props

    switch (mark.type) {
      case 'bold':
        return <strong {...attributes}>{children}</strong>
      case 'code':
        return <code {...attributes}>{children}</code>
      case 'italic':
        return <em {...attributes}>{children}</em>
      case 'underlined':
        return <u {...attributes}>{children}</u>
      default:
        return next()
    }
  }

  /**
   *
   */
  renderAnnotation = (props, editor, next) => {
    const { children, annotation, attributes } = props

    switch (annotation.type) {
      case 'highlight':
        return (
          <span {...attributes} style={{ backgroundColor: '#ffeeba' }}>
            {children}
          </span>
        );
      case 'underline':
        return (
          <span {...attributes} style={{ textDecoration: 'underline' }}>
            {children}
          </span>
        );       
      case 'italic':
        return (
          <span {...attributes} style={{ fontStyle: 'italic' }}>
            {children}
          </span>
        );       
      case 'bold':
        return (
          <span {...attributes} style={{ fontWeight: 'bold' }}>
            {children}
          </span>
        );                       
      default:
        return next();
    }
  }

  /**
   * On key down, if it's a formatting command toggle a mark.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @return {Change}
   */
  onKeyDown (event, editor, next) {
    //console.log (event);
    console.log(event.keyCode);

    if (event.keyCode==32) {
      //this.clearAnnotations ();
    }

    return next();

    /*
    let mark

    if (isBoldHotkey(event)) {
      mark = 'bold'
    } else if (isItalicHotkey(event)) {
      mark = 'italic'
    } else if (isUnderlinedHotkey(event)) {
      mark = 'underlined'
    } else if (isCodeHotkey(event)) {
      mark = 'code'
    } else {
      return next()
    }

    //event.preventDefault()

    editor.toggleMark(mark)
    */
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

    if (aRule) {
      this.setState ({currentRule: aRule, currentRuleChild: null});
    }
  }

  /**
   *
   */
  onClickRuleChild (e) {
    console.log ("onClickRuleChild ("+e.target.id+")");

    e.stopPropagation ();

    let aRuleChild=this.props.ruleManager.getRuleChild (e.target.id);

    if (aRuleChild) {
      this.setState ({currentRule: null, currentRuleChild: aRuleChild});
    }    
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
    let ruleDescription;

    if (this.state.currentRule) {
      ruleDescription=this.state.currentRule.description;
    }

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
      <div className="impressions-name">
      About this Group of Expectations
      </div>
      <div className="impressions-rule" dangerouslySetInnerHTML={{ __html: ruleDescription }}>
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
    let editor;

    expectationsTab=this.generateExpectationsTab ();
    coherenceTab=this.generateCoherenceTab ();
    clarityTab=this.generateClarityTab ();
    impressionsTab=this.generateImpressionsTab ();

    if (this.state.locked==false) {
      editor=<Editor 
        tabIndex="0"
        id="editor"
        className="editor-content" 
        spellCheck
        autoFocus
        placeholder="Enter some rich text..."
        ref="editor"
        value={this.state.value}
        onChange={this.onChange.bind(this)}
        onKeyDown={this.onKeyDown.bind(this)}
        renderBlock={this.renderBlock.bind(this)}
        renderMark={this.renderMark.bind(this)}
        renderAnnotation={this.renderAnnotation}
        style={{overflowY: 'auto', fontSize: this.state.fontSize, marginTop: '2px', padding: '8px'}}
        schema={this.schema}
        insertText={this.insertText}></Editor>;
    } else {
      editor=<Editor 
        id="editor"
        readOnly
        tabIndex="0"
        className="editor-content" 
        spellCheck
        autoFocus
        placeholder="Enter some rich text..."
        ref="editor"
        value={this.state.value}
        onChange={this.onChange.bind(this)}
        onKeyDown={this.onKeyDown.bind(this)}
        renderBlock={this.renderBlock.bind(this)}
        renderMark={this.renderMark.bind(this)}
        renderAnnotation={this.renderAnnotation}
        style={{overflowY: 'auto', fontSize: this.state.fontSize, marginTop: '2px', padding: '8px'}}
        schema={this.schema}
        insertText={this.insertText}></Editor>
    }

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
          <div className="centercol">
            <div className="editor-top-menu">
              <div className="editor-top-menu-filler"></div>              
              <label className="edit-top-menu-label">Edit Mode:</label>
              <Switch size={Sizes.TINY} active={{ text: 'On' }} inactive={{ text: 'Off' }}/></div>
            <div className="editor-container">
              {editor}
            </div>  
            <div className="editor-bottom-menu">Editor Bottom Marker</div>
          </div>
          <div className="rightcol"></div>
      </div>
      <div className="statusbar">statusbar</div>
    </div>

    return (mainPage);
  }
}
