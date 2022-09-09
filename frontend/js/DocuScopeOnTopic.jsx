import React, { Component } from "react";

// https://react-bootstrap.github.io/components/navbar/#navbars-mobile-friendly
import { Form, FormControl, Button, Navbar, Nav, NavItem, NavDropdown } from "react-bootstrap";

import {Topic, OnTopicDataTools, OnTopicConstants, OnTopicVisualization, } from "@cmu-eberly-center/eberly-ontopic-visualization";

import HashTable from "./HashTable";

import TopicHighlighter  from "./TopicHighlighter";

/**
 *
 */
class DocuScopeOnTopic extends Component {
  /**
   *
   */
  constructor(props) {
    super(props);

    this.dataTools = new OnTopicDataTools();
    this.topicHighlighter = new TopicHighlighter ();

    this.state = {
      locked: false,
      invalidated: false,
      flipped: false,
      mode: "SENTENCE",
      textdata: this.dataTools.getInitialData(),
      loading: false,
      paragraphIndex: -1, 
      sentenceIndex: -1
    };

    this.onHandleTopic=this.onHandleTopic.bind(this);
    this.onHandleSentence = this.onHandleSentence.bind(this);
    this.onSentenceChange = this.onSentenceChange.bind(this);
  }

  /**
   *
   */
  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text || prevProps.sentences !== this.props.sentences) {
      this.prep(this.props.sentences, this.props.text);
    }
  }

  /**
   *
   */
  prep(data, plain) {
    console.log("prep (" + this.state.mode + ")");

    var newData = this.dataTools.copyData(this.state.textdata);
    newData.plain = plain;

    if (this.state.mode == "SENTENCE") {
      newData.sentences = data;

      this.setState({
        sentence: null,
        loading: false,
        textdata: newData,
        invalidated: false,
      });
    }
  }

  /**
   *
   */
  onHandleTopic (topicId,isGlobal,count) {
    console.log ("onHandleTopic ("+topicId+","+isGlobal+","+count+") => Dummy for now");

  }

  /**
   *
   */
  onHandleSentence (aParagraphIndex,aSentenceIndex,aBlock,aSentence,aTopic) {
    console.log ("onHandleSentence ()");

    if (aTopic) {
      this.topicHighlighter.highlightSentence (aParagraphIndex, aSentenceIndex, [aTopic]);
    } else {
      this.topicHighlighter.highlightSentence (aParagraphIndex, aSentenceIndex);
    }

    this.setState ({
      paragraphIndex: aParagraphIndex, 
      sentenceIndex: aSentenceIndex
    });
  }

  /**
   *
   */
  onSentenceChange () {
    console.log ("onSentenceChange ()");

    if (this.props.setStatus) {
      this.props.setStatus ("Selected sentence, at paragraph " + this.state.sentence.paragraphIndex + ", and sentence " + this.state.sentence.sentenceIndex + ", with main verb: " + this.state.sentence.verb);
    } else {
      console.log ("No status update method available");
    }
  }

  /**
   * 
   */
  generateSentenceDetails (aParagraphIndex,aSentenceIndex) {
    //console.log ("generateSentenceDetails ("+aParagraphIndex+","+aSentenceIndex+")");

    if ((aParagraphIndex==-1) || (aSentenceIndex==-1)) {
      console.log ("No valid paragraph or sentence index selected");
      return (null);
    }

    let aParagraph=this.props.htmlSentences [aParagraphIndex];

    if (!aParagraph) {
      console.log ("Invalid paragraph selected");
      return (null);
    }

    //console.log (aParagraph);

    let aSentence=aParagraph [aSentenceIndex];

    if (!aSentence) {
      console.log ("Invalid sentence selected");
      return (null);
    }

    let sentencedetails=aSentence.replaceAll ('\\"','"');

    //console.log (sentencedetails);

    return (<div className="ontopic-explanation" dangerouslySetInnerHTML={{__html: sentencedetails}}></div>);  
  }

  /**
   *
   */
  render() {
    const onTopicHelp='You may lose <b>clarity</b> if you try to pack too many ideas into a sentence.<br/> This panel displays each of your sentences as a sequence of noun phrases appearing before and after the main verb. Focus on the sentences with many noun phrases before the main verb but also after.  Click on the sentence line on the left to see your actual sentence. <br/><br/> Read the sentence aloud when feeling. If you stumble or run out of breath, you are most likely stuffing too much information into a single sentence. <br/><br/>  There is nothing wrong with <b>be verbs</b> to signal "existence". But an overreliance on the <b>be verbs</b> can result in weak writing. If you find you have too many <b>be verbs</b>, try to revise some of the sentences with <b>active verbs</b>.';
    
    let sentencedetails=this.generateSentenceDetails (this.state.paragraphIndex,this.state.sentenceIndex);
    
    if (sentencedetails==null) {
      sentencedetails=<div className="ontopic-explanation"><p>Select a sentence to see its composition</p></div>;
    }

    return (
      <div className="ontopic-container">
        <div className="ontopic-content">
          <OnTopicVisualization
            mode="SENTENCE"
            singlepane={true}
            onFlip={this.onFlip}
            onHandleTopic={this.onHandleTopic}
            onHandleSentence={this.onHandleSentence}
            loading={this.state.loading}
            invalidated={this.state.invalidated}
            textdata={this.state.textdata}
          />
        </div>
        <div className="ontopic-help">
          <div className="ontopic-legend">
            <span className="topic-legend-item">
              <div className="box-green"></div>Noun phrase
            </span>
            <span className="topic-legend-item">
              <div className="box-red"></div>Active verb
            </span>
            <span className="topic-legend-item">
              <div className="box-blue"></div>be verb
            </span>
          </div>
          <div className="ontopic-details" dangerouslySetInnerHTML={{__html: onTopicHelp}} />
          {sentencedetails}
        </div>
      </div>
    );
  }
}

export default DocuScopeOnTopic;
