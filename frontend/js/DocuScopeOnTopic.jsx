import React, { Component } from 'react';

// https://react-bootstrap.github.io/components/navbar/#navbars-mobile-friendly
import { Form, FormControl, Button, Navbar, Nav, NavItem, NavDropdown } from 'react-bootstrap';

import { Topic, OnTopicDataTools, OnTopicConstants, OnTopicVisualization } from '@cmu-eberly-center/eberly-ontopic-visualization';

import HashTable from './HashTable';

import { paragraphData } from './data/paragraphdata.js'
import { textData } from './data/textdata.js'
import { sentenceData } from './data/sentencedata.js'
import { rawData } from './data/rawdata.js'

/**
 * 
 */
class DocuScopeOnTopic extends Component {

  /**
   *
   */
  constructor(props) {
    super(props);

    this.dataTools=new OnTopicDataTools ();

    this.state = { 
      locked: false,
      invalidated: false,      
      flipped: false,
      mode: "TEXT",
      textdata: this.dataTools.getInitialData(),
      loading: false
    };    

    this.onSelect=this.onSelect.bind(this);
    this.modeToTab=this.modeToTab.bind(this);
    this.onFlip=this.onFlip.bind(this);
    this.onHandleTopic=this.onHandleTopic.bind(this);
    this.onHandleSentence = this.onHandleSentence.bind(this);    
    this.updateVisualization=this.updateVisualization.bind(this);
  }

  /**
   *
   */
  updateVisualization () {
    console.log ("updateVisualization ()");

    this.getData (this.state.mode);
  }

  /**
   *
   */
  onSelect (index, lastIndex, event) {
    console.log ("onSelect ("+index+","+lastIndex+")");

    if (index==0) {
      this.setState ({mode: "SENTENCE"});
    }

    if (index==1) {
      this.setState ({mode: "PARAGRAPH"}); 
    }

    if (index==2) {
      this.setState ({mode: "TEXT"});
    }

    if (index==3) {
      this.setState ({mode: "OUTLINE"});
    }
  }

  /**
   *
   */
  getData (aMode) {
    console.log ("getData ()");
      
    if (this.state.mode=="SENTENCE") {
      this.prep (sentenceData);
    }

    if (this.state.mode=="PARAGRAPH") {
      this.prep (paragraphData);
    }

    if (this.state.mode=="TEXT") {
      this.prep (textData);
    }
  }

  /**
   *
   */
  prep (data, plain) {
    console.log ("prep ("+this.state.mode+")");

    //var newData=this.dataTools.deepCopy (this.state.textdata);
    var newData=this.dataTools.copyData (this.state.textdata);
    newData.plain=plain;

    //>--------------------------------------------------------------------

    if (this.state.mode=="SENTENCE") {
      newData.sentences=data;

      this.setState({
        loading: false,
        textdata: newData,
        invalidated: false
      });
    }

    //>--------------------------------------------------------------------

    if (this.state.mode=="PARAGRAPH") {    
      newData.paragraphs=data;

      this.setState({
        loading: false, 
        textdata: newData,
        invalidated: false
      });    
    }

    //>--------------------------------------------------------------------    

    if (this.state.mode=="TEXT") {
      let collapsed=data.collapsed;
      let expanded=data.expanded;
      let topics=new HashTable ();
      let sentence=0;

      if (expanded!=null) {
        for (let i=0;i<expanded.length;i++) {
          let row=expanded [i];

          if (i==0) {
            for (let j=0;j<row.length;j++) {
              row [j][2]=this.dataTools.uuidv4();

              let topic=new Topic ();
              topic.uuid=row [j][2];
              topic.name=row [j][1];
              topics.setItem (topic.uuid,topic);
            }
          } else {
            let isParaBoundary=0;

            for (let j=0;j<row.length;j++) {
              let cell=row [j];
              let isCellBoundary=false;

              if (this.dataTools.isNumber (cell)==true) {
                isCellBoundary=true;
                isParaBoundary++;
              }

              // We have a valid row
              if (isCellBoundary==false) {
                if (cell [1]!=false) {
                  cell [13]=this.dataTools.uuidv4();

                  let topic=new Topic ();
                  topic.uuid=cell [13];
                  topic.name=cell [2];
                  topic.sentence=sentence;
                  topics.setItem (topic.uuid,topic);
                }
              }
            }

            if (isParaBoundary!=row.length) {
              sentence++;
            }          
          }
        }
      }

      newData.collapsed = collapsed;
      newData.expanded = expanded;
      newData.topics = topics;

      this.setState({
        loading: false, 
        textdata: newData,
        invalidated: false
      });
    }

    //>--------------------------------------------------------------------    
  }

  /**
   *
   */
  modeToTab () {
    if (this.state.mode=="SENTENCE") {
      return (0);
    }

    if (this.state.mode=="PARAGRAPH") {
      return (1);
    }

    if (this.state.mode=="TEXT") {
      return (2);
    }

    if (this.state.mode=="OUTLINE") {
      return (3);
    }        

    return (0);
  }  

  /**
   *
   */
  onSelect (index, lastIndex, event) {
    console.log ("onSelect ("+index+","+lastIndex+")");

    //>----------------------------------------------------------

    if (index==0) {
      this.setState ({mode: "SENTENCE"});
    }

    //>----------------------------------------------------------

    if (index==1) {
      this.setState ({mode: "PARAGRAPH"}); 
    }

    //>----------------------------------------------------------    

    if (index==2) {
      this.setState ({mode: "TEXT"});
    }

    //>----------------------------------------------------------    

    if (index==3) {
      this.setState ({mode: "OUTLINE"});
    }

    //>----------------------------------------------------------    
  }  

  /**
   *
   */
  onFlip () {
    console.log ("onFlip ()");    
    
    if (this.state.flipped==true) {
      this.setState ({flipped: false});
    } else {
      this.setState ({flipped: true});
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
  onHandleSentence (aSentenceObject) {
    console.log ("onHandleSentence ()");

    this.setState ({sentence: aSentenceObject},(e) => {
      this.onSentenceChange ();
    });
  }

  /**
   * On input change, update the annotations.
   *
   * @param {Event} event
   */
  onSentenceChange () {
    console.log ("onSentenceChange ()");

    /*
    const editor = this.getEditorRef ();
    
    if (editor==null) {
      return;
    }

    const { value } = editor;
    const { document, annotations } = value;

    // Make the change to annotations without saving it into the undo history,
    // so that there isn't a confusing behavior when undoing.
    editor.withoutSaving(() => {
      if (this.state.sentence!=null) {
        //let string = this.state.sentence.sentence;
      
        // Key is the editor's paragraph id
        let pIndex=1;
        for (const [node, path] of document.texts()) {
          const { key, text } = node;
          console.log ("Paragraph: " + pIndex + ", text: " + text);
 
          let boundaries=this.dataTools.findSentence (text,this.state.sentence);

          console.trace (boundaries);

          pIndex++;
        }
      }
    });
    */
  }  

  /**
   *
   */
  render() {

    let ontopic=<OnTopicVisualization 
      onFlip={this.onFlip}
      onSelect={this.onSelect}
      onHandleTopic={this.onHandleTopic}
      onHandleSentence={this.onHandleSentence}
      defaultindex={this.modeToTab ()}
      loading={this.state.loading} 
      flipped={this.state.flipped}
      mode={this.state.mode}      
      invalidated={this.state.invalidated}
      onNavItemClick={this.onNavItemClick}
      textdata={this.state.textdata} />;

    return (
      <div className="drydock-content">
        <Button className="btn btn-light" style={{marginRight: "4px"}} onClick={()=> this.updateVisualization()}>Update Visualization</Button>
        {ontopic}
      </div>
    );
  }
}

export default DocuScopeOnTopic;
