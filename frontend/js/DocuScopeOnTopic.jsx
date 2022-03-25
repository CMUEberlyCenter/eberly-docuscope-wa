import React, { Component } from "react";

// https://react-bootstrap.github.io/components/navbar/#navbars-mobile-friendly
import {
  Form,
  FormControl,
  Button,
  Navbar,
  Nav,
  NavItem,
  NavDropdown,
} from "react-bootstrap";

import {
  Topic,
  OnTopicDataTools,
  OnTopicConstants,
  OnTopicVisualization,
} from "@cmu-eberly-center/eberly-ontopic-visualization";

import HashTable from "./HashTable";

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

    this.state = {
      locked: false,
      invalidated: false,
      flipped: false,
      mode: "SENTENCE",
      textdata: this.dataTools.getInitialData(),
      loading: false,
      sentence: null
    };    

    this.onHandleTopic=this.onHandleTopic.bind(this);
    this.onHandleSentence = this.onHandleSentence.bind(this);    

    this.onSentenceChange = this.onSentenceChange.bind(this);    
  }

  /**
   *
   */
  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text) {
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

    //>--------------------------------------------------------------------

    if (this.state.mode == "SENTENCE") {
      newData.sentences = data;

      this.setState({
        sentence: null,
        loading: false,
        textdata: newData,
        invalidated: false,
      });
    }

    //>--------------------------------------------------------------------

    /*
    if (this.state.mode=="PARAGRAPH") {
      newData.paragraphs=data;

      this.setState({
        sentence: null,
        loading: false, 
        textdata: newData,
        invalidated: false,
      });
    }
    */

    //>--------------------------------------------------------------------

    /*
    if (this.state.mode=="TEXT") {
      let collapsed=data.collapsed;
      let expanded=data.expanded;
      let topics=new HashTable ();
      let sentence=0;

      if (expanded != null) {
        for (let i = 0; i < expanded.length; i++) {
          let row = expanded[i];

          if (i == 0) {
            for (let j = 0; j < row.length; j++) {
              row[j][2] = this.dataTools.uuidv4();

              let topic = new Topic();
              topic.uuid = row[j][2];
              topic.name = row[j][1];
              topics.setItem(topic.uuid, topic);
            }
          } else {
            let isParaBoundary = 0;

            for (let j = 0; j < row.length; j++) {
              let cell = row[j];
              let isCellBoundary = false;

              if (this.dataTools.isNumber(cell) == true) {
                isCellBoundary = true;
                isParaBoundary++;
              }

              // We have a valid row
              if (isCellBoundary == false) {
                if (cell[1] != false) {
                  cell[13] = this.dataTools.uuidv4();

                  let topic = new Topic();
                  topic.uuid = cell[13];
                  topic.name = cell[2];
                  topic.sentence = sentence;
                  topics.setItem(topic.uuid, topic);
                }
              }
            }

            if (isParaBoundary != row.length) {
              sentence++;
            }
          }
        }
      }

      newData.collapsed = collapsed;
      newData.expanded = expanded;
      newData.topics = topics;

      this.setState({
        sentence: null,
        loading: false, 
        textdata: newData,
        invalidated: false,
      });
    }
    */

    //>--------------------------------------------------------------------
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
  onHandleSentence (aSentenceObject) {
    console.log ("onHandleSentence ()");
    console.log (aSentenceObject);

    if (aSentenceObject==null) {
      if (this.props.setStatus) {
        this.props.setStatus ("");
      }      
      return;
    }

    this.setState({ sentence: aSentenceObject }, (e) => {
      this.onSentenceChange();
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
  render() {
    const onTopicHelp='You may lose <b>clarity</b> if you try to pack too many ideas into a sentence.<br/> This panel displays each of your sentences as a sequence of noun phrases appearing before and after the main verb. Focus on the sentences with many noun phrases before the main verb but also after.  Click on the sentence line on the left to see your actual sentence. <br/><br/> Read the sentence aloud when feeling. If you stumble or run out of breath, you are most likely stuffing too much information into a single sentence. <br/><br/>  There is nothing wrong with <b>be verbs</b> to signal "existence". But an overreliance on the <b>be verbs</b> can result in weak writing. If you find you have too many <b>be verbs</b>, try to revise some of the sentences with <b>active verbs</b>.';
    let sentencedetails;

    if (this.state.sentence!=null) {
      sentencedetails=this.state.sentence.full;
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
          <div className="ontopic-explanation">
          {sentencedetails}  
          </div>
        </div>
      </div>
    );
  }
}

export default DocuScopeOnTopic;
