import React, { Component } from "react";

import './CoherencePanel.scss';

import OnTopicDataTools from "../../lang/OnTopicDataTools";
import TopicHighlighter  from "../../TopicHighlighter";

import topic_left_dark_icon from '../../../css/icons/topic_left_dark_icon.png';
import topic_left_icon from '../../../css/icons/topic_left_icon.png';
import topic_right_icon from '../../../css/icons/topic_right_icon.png';
import topic_sent_icon_left from '../../../css/icons/topic_sent_icon_left.png';
import topic_sent_icon_right from '../../../css/icons/topic_sent_icon_right.png';

// Dummy data so that we can keep working on our visualization widget set
import { coherenceDataLocal } from "../../data/coherencedatalocal";

/**
  Here is a brief summary of what the icons mean.

      Dark circle — At least one sentence in the paragraph includes the word (topic) on the left side of the main verb of the sentence.
      Hollow circle — All of the instances of the word (topic) in the paragraph are on the right side of the sentences.
      Dot on the shoulder — If the word (topic) appears in the first sentence of the paragraph a small dot is added to the icon. The dot can bee added to (1) or (2) above. 

  So, there are 4 possible icons.

  When topic clusters (groups of words/topics) are used, (1) and (2) above can be show at a much smaller size. These small icons are used if a topic does not satisfy the requirement for Global Topic.

  The following is a brief definition of global and local topics.

  A topic is a global topic if:

      it appears in 2 or more paragraphs, AND
      it appears at least once on the left side of the main verb in a sentence, AND
      it is also a Local Topic. 

  A topic is a local topic in a given paragraph if:

      it appears in 2 or more sentences within the paragraph, AND
      it appears at least once on the left side of the main verb in a sentence within the paragraph. 

 */
class CoherencePanel extends Component {

  /**
   * 
   */
  constructor (props) {
    super (props);

    this.state = {
      selectedParagraph: -1,
      selectedSentence: -1
    };

    this.dataTools=new OnTopicDataTools ();
    this.topicHighlighter=new TopicHighlighter ();

    this.onTopicClick=this.onTopicClick.bind(this);
    this.onTopicParagraphClick=this.onTopicParagraphClick.bind(this);
    this.onGlobalTopicClick=this.onGlobalTopicClick.bind(this);
    this.onParagraphClick=this.onParagraphClick.bind(this);
    this.onSentenceClick=this.onSentenceClick.bind(this);
  }

  /**
   *
   */
  /* 
  componentDidUpdate(prevProps) {
  	console.log ("componentDidUpdate ()");

    //console.log (this.props.data);

  	if (prevProps.data !== this.props.data) {      
      this.setState ({data: this.props.data});
    }
  }
  */

  /**
   * 
   */
  getTopicObject (anIndex) {
    if (!this.props.data) {
      return (null);
    }

    let topics=this.props.data.data;

    return (topics [anIndex]);
  }

  /**
   * 
   */
  countParagraphs () {
    if (!this.props.data) {
      return (0);
    }

    let copy=this.props.data;

    let nrParagraphs = parseInt (copy.num_paras);    

    return (nrParagraphs);
  }

  /**
   * 
   */
  countSentences (aParagraphIndex) {
    if (!this.props.local) {
      return (0);
    }

    let copy=this.props.local;
    let envelope=copy [aParagraphIndex]; // Get the first paragraph

    if (envelope.error) {
      //console.log ("No topics found in this sentence");
      return (0);
    }    

    let data=envelope.data; // Get the data block from the first paragraph
    let actual=data [0]; // For some reason there is another nested array in here

    //console.log ("Nr sentences: " + actual.sentences.length);

    return (actual.sentences.length);
  }  

  /**
   * You might get this: {error: 'ncols is 0'}
   */
  getLocalTopic (anIndex) {
    console.log ("getLocalTopic ("+anIndex+")");

    if (!this.props.local) {
      return (null);
    }

    let localTopics=this.props.local;

    let envelope=localTopics [anIndex]; // Get the first paragraph

    if (envelope.error) {
      console.log ("No topics found in this sentence");
      return (null);
    }

    console.log ("local topic root: ");
    console.log (envelope);

    return (envelope);
  }  

  /**
   * You might get this: {error: 'ncols is 0'}
   */
  getLocalTopicObject (anIndex) {
    console.log ("getLocalTopicObject ("+anIndex+")");

    if (!this.props.local) {
      return (null);
    }

    let localTopics=this.props.local;

    let envelope=localTopics [anIndex]; // Get the first paragraph

    if (envelope.error) {
      console.log ("No topics found in this sentence");
      return (null);
    }

    let data=envelope.data; // Get the data block from the first paragraph
    let actual=data [0]; // For some reason there is another nested array in here    

    console.log (actual);

    return (actual);
  }  
 
  /**
   * 
   */
  onTopicClick (e,anIndex) {
    console.log ("onTopicClick ("+anIndex+")");

    let topic=this.getTopicObject (anIndex);

    console.log (topic);

    this.topicHighlighter.highlightTopic (this.state.selectedParagraph,this.state.selectedSentence,topic);
  }

  /**
   * 
   */
  onTopicParagraphClick (e,anIndex,aParagraph) {
    console.log ("onTopicParagraphClick ("+anIndex+","+aParagraph+")");

    let topic=this.getTopicObject (anIndex);

    console.log (topic);
  }  

  /**
   * 
   */
  onGlobalTopicClick (e,anIndex) {
    console.log ("onGlobalTopicClick ("+anIndex+")");

    //this.topicHighlighter.highlightTopic (this.state.selectedParagraph,this.state.selectedSentence,anIndex);

    if (this.props.ruleManager) {
      let clusters=this.props.ruleManager.clusters;
      let cluster=clusters[anIndex];
    }    
  }

  /**
   * 
   */
  onParagraphClick (e,anIndex) {
    console.log ("onParagraphClick ("+anIndex+")");

    if (this.state.selectedParagraph==anIndex) {
      this.setState ({selectedParagraph: -1});
    } else {
      this.setState ({
        selectedParagraph: anIndex
      });

      this.topicHighlighter.highlightParagraph (anIndex);
    }
  }

  /**
   * 
   */
  onSentenceClick (e,anIndex) {
    console.log ("onSentenceClick ("+anIndex+")");

    if (this.state.selectedSentence==anIndex) {
      this.setState ({selectedSentence: -1});
    } else {
      this.setState ({
        selectedSentence: anIndex
      });

      this.topicHighlighter.highlightSentence (this.state.selectedParagraph,anIndex);
    }    
  }  

  /**
   * 
   */
  generateGlobalClusters (paraCount) {
    let topicElements=[];

    if (this.props.ruleManager) {
      let clusters=this.props.ruleManager.clusters;

      for (let i=0;i<clusters.length;i++) {
        topicElements.push (<tr key={"topic-key-0"}><td style={{width: "175px"}}><div className="coherence-item" onClick={(e) => this.onGlobalTopicClick (e,i)}>{clusters [i].name}</div></td><td>&nbsp;</td></tr>)
      }
    }

    return (topicElements);
  }

  /**
   * Currently commented out the old data processing code to make sure we have something in
   * the repository that is stable. From this point on we will be working with the new
   * data format. Below is the original Python code that tests the visualization mapping code:
   * 
   * 
      para_pos = para_data['para_pos']
      is_left  = para_data['is_left']
      is_topic_sent = para_data['is_topic_sent']

      if is_left:                     # is 'topic' on the left side?
          if is_non_local:            # is it a non-local global topic?
              c = 'l'
          else: 
              c = 'L'

          if is_topic_sent:           # is 'topic' appear in a topic sentence?
              line += (c + "*")
          else:                      
              line += (c + " ")
      else:
          if is_non_local:
              c = 'r'
          else: 
              c = 'R'

          if is_topic_sent:
              line += (c + "*")
          else:
              line += (c + " ")
   *
   */
  generateGlobalTopics (paraCount) {
  	let topicElements=[];

  	if (!this.props.data) {
  	  return (topicElements);
  	}

    let copy=this.props.data;

    //console.log (copy);

    if (!copy.data) {
      return (topicElements);
    }

    let topics=copy.data;

    for (let i=0;i<topics.length;i++) {
      let topicObject=this.getTopicObject (i);      
      let topic=topicObject.topic [2];
      let is_topic_cluster = topicObject.is_topic_cluster;
      let is_non_local = topicObject.is_non_local;
      let paragraphs=topicObject.paragraphs;
      let paraElements=[];

      //for (let j=0;j<paragraphs.length;j++) {
      // Temporary fix. Already resolved in the Python code
      for (let j=0;j<paraCount;j++) {
        let icon;

        let paraType=paragraphs[j];
        let paraContent=" ";
        let paraIcon=null;
        let paraIconClass="topic-icon-large";

        if (paraType!=null) {
          if (paraType.is_left==true) {
            if (is_non_local==true) {
              paraContent = "l";
              paraIconClass="topic-icon-small";            
            } else {
              paraContent = "L";
            }

            if (paraType.is_topic_sent==true) {
              paraContent += "*";
              paraIcon=topic_sent_icon_left;
            } else {
              paraIcon=topic_left_icon;
            }
          } else {
            if (is_non_local==true) {
              paraContent = "r";
              paraIconClass="topic-icon-small";            
            } else {
              paraContent = "R";
            }

            if (paraType.is_topic_sent==true) {
              paraContent += "*";
              paraIcon=topic_sent_icon_right;
            } else {
              paraIcon=topic_right_icon;
            }
          }

          icon=<img alt={paraContent} title={paraContent} className={paraIconClass} src={paraIcon}/>;
        }
        paraElements.push (<div key={"topic-key-"+i+"-"+j} className="topic-type-default" onClick={(e) => this.onTopicParagraphClick (e,i,j)}>{icon}</div>);
      }

      topicElements.push (<tr key={"topic-paragraph-key-"+i}><td style={{width: "150px"}}><div className="coherence-item" onClick={(e) => this.onTopicClick (e,i)}>{topic}</div></td><td><div className="topic-container">{paraElements}</div></td></tr>)
    }

    //let nrParagraphs = parseInt (copy.num_paras);

    return (topicElements);
  }

  /**
   * 
   */
  generateLocalTopics () {
    //console.log ("generateLocalTopics ()");

    let topicElements=[];

    //if ((this.state.selectedParagraph==-1) || (this.state.selectedLocal==null)) {
    if ((this.state.selectedParagraph==-1) || (this.props.local==null)) {
      return (topicElements);
    }

    let topics=this.props.local [this.state.selectedParagraph].data;
    let num_sents=this.countSentences (this.state.selectedParagraph);

    if (num_sents==0) {
      return (topicElements);
    }

    //let num_sents=this.props.local.num_sents; // Not valid yet, needs to be fixed in the Python code
  
    for (let i=0;i<topics.length;i++) {
      let topicObject=topics [i];
      if (topicObject==null) {
        return (topicElements);
      }
      let topic=topicObject.topic [2];
      let is_topic_cluster = topicObject.is_topic_cluster;
      let is_non_local = topicObject.is_non_local;
      let sentences=topicObject.sentences;
      let sentenceElements=[];

      for (let j=0;j<num_sents;j++) {
        let icon;

        let paraType=sentences[j];
        let paraContent=" ";
        let paraIcon=null;
        let paraIconClass="topic-icon-large";

        if (paraType!=null) {
          if (paraType.is_left==true) {
            if (is_non_local==true) {
              paraContent = "l";
              paraIconClass="topic-icon-small";            
            } else {
              paraContent = "L";
            }

            if (paraType.is_topic_sent==true) {
              paraContent += "*";
              paraIcon=topic_sent_icon_left;
            } else {
              paraIcon=topic_left_icon;
            }
          } else {
            if (is_non_local==true) {
              paraContent = "r";
              paraIconClass="topic-icon-small";            
            } else {
              paraContent = "R";
            }

            if (paraType.is_topic_sent==true) {
              paraContent += "*";
              paraIcon=topic_sent_icon_right;
            } else {
              paraIcon=topic_right_icon;
            }
          }

          icon=<img alt={paraContent} title={paraContent} className={paraIconClass} src={paraIcon}/>;
        }

        sentenceElements.push (<div key={"topic-key-"+i+"-"+j} className="topic-type-default" onClick={(e) => this.onTopicParagraphClick (e,i,j)}>{icon}</div>);
      }

      topicElements.push (<tr key={"topic-paragraph-key-"+i}><td style={{width: "150px"}}><div className="coherence-item" onClick={(e) => this.onTopicClick (e,i)}>{topic}</div></td><td><div className="topic-container">{sentenceElements}</div></td></tr>)
    }

    return (topicElements);
  }

  /**
   * 
   */
  generatePagraphControls (paraCount) {
    let paraElements=[];

    for (let i=0;i<paraCount;i++) {
      let paraClass="paragraph-toggle";
      if (i==this.state.selectedParagraph) {
        paraClass="paragraph-toggled";
      }
      paraElements.push (<div key={"key-paragraph-"+i} className={paraClass} onClick={(e) => this.onParagraphClick (e,i)}>{""+(i+1)}</div>);
    }

    paraElements.push (<div className="paragraph-padding"></div>);

    return (<div className="paragraph-row">{paraElements}</div>);
  }

  /**
   * 
   */
  generateSentenceControls (paraCount) {
    //console.log ("generateSentenceControls ()");

    let sentenceElements=[];

    if ((this.state.selectedParagraph==-1) || (this.props.data==null)) {
      return (<div className="paragraph-row">{sentenceElements}</div>);
    }

    let topics=this.props.local [this.state.selectedParagraph].data;
    let num_sents=0;

    if (topics==null) {
      return (<div className="paragraph-row">{sentenceElements}</div>);
    }

    //console.log (topics);

    if (topics.num_sents) {
      num_sents=topics.num_sents;
    } else {
      num_sents=this.countSentences (this.state.selectedParagraph);
    }

    if (num_sents==0) {
      return (<div className="paragraph-row">{sentenceElements}</div>);
    }    

    for (let i=0;i<num_sents;i++) {      
      let sentenceClass="paragraph-toggle";
      if (i==this.state.selectedSentence) {
        sentenceClass="paragraph-toggled";
      }
      sentenceElements.push (<div key={"key-paragraph-"+i} className={sentenceClass} onClick={(e) => this.onSentenceClick (e,i)}>{""+(i+1)}</div>);
    }

    sentenceElements.push (<div className="paragraph-padding"></div>);

    return (<div className="paragraph-row">{sentenceElements}</div>);
  }

  /**
   * 
   */
  render () {
    let paraCount=this.countParagraphs ();
    let visualizationTopics;
  	let visualizationGlobal;
    let visualizationLocal;
    let paragraphcontrols=this.generatePagraphControls (paraCount);
    let sentencecontrols=this.generateSentenceControls ();

    if (this.props.showglobal==true) {
      visualizationGlobal=this.generateGlobalClusters (paraCount);
    } else {
      visualizationGlobal=this.generateGlobalClusters (paraCount);
      visualizationTopics=this.generateGlobalTopics (paraCount);
      if (this.state.selectedParagraph!=-1) {
        visualizationLocal=this.generateLocalTopics ();
      }
    }

    if (this.state.selectedParagraph!=-1) {
      return (<div className="coherence-list"><table>
        <tbody>
          <tr>
            <td>Paragraphs:</td>
            <td>{paragraphcontrols}</td>
          </tr>
          {visualizationTopics}          
          {visualizationGlobal}
          <tr>
            <td colspan="2" className="topic-separator">{"Coherence across sentences in paragraph: " + (this.state.selectedParagraph+1)}</td>
          </tr>
          <tr>
            <td>Sentences:</td>
            <td>{sentencecontrols}</td>
          </tr>      
          {visualizationLocal}      
        </tbody>
      </table></div>);
    }

    return (<div className="coherence-list"><table>
      <tbody>
        <tr>
          <td>Paragraphs:</td>
          <td>{paragraphcontrols}</td>
        </tr>
        {visualizationTopics}        
        {visualizationGlobal}
      </tbody>
    </table></div>);
  }
}

export default CoherencePanel;
