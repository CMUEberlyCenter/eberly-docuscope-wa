import React, { Component } from "react";

import './CoherencePanel.scss';

import OnTopicDataTools from "../../lang/OnTopicDataTools";

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
      selectedLocal: {},
      selectedSentence: -1
    };

    this.dataTools=new OnTopicDataTools ();

    this.onTopicClick=this.onTopicClick.bind(this);
    this.onTopicParagraphClick=this.onTopicParagraphClick.bind(this);
    this.onGlobalTopicClick=this.onGlobalTopicClick.bind(this);
    this.onParagraphClick=this.onParagraphClick.bind(this);
    this.onSentenceClick=this.onSentenceClick.bind(this);
  }

  /**
   *
   */
  componentDidUpdate(prevProps) {
  	console.log ("componentDidUpdate ()");

  	if (prevProps.data !== this.props.data) {
      this.setState ({data: this.props.data});
    }

    if (prevProps.text !== this.props.text) {
      
    }
  }

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
  getLocalTopicObject (anIndex) {
    if (!this.state.selectedLocal) {
      return (null);
    }

    let topics=this.state.selectedLocal.data;

    return (topics [anIndex]);
  }  
 
  /**
   * 
   */
  onTopicClick (e,anIndex) {
    console.log ("onTopicClick ("+anIndex+")");

    let topic=this.getTopicObject (anIndex);

    console.log (topic);
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
        selectedParagraph: anIndex,
        selectedLocal: coherenceDataLocal});
    }
  }

  /**
   * 
   */
  onSentenceClick (e,anIndex) {
    console.log ("onSentenceClick ("+anIndex+")");

  }  

  /**
   * 
   */
  countParagraphs () {
    if (!this.props.data) {
      return (0);
    }

    //this.dataTools.countParagraphs (this.props.data);

    let copy=this.props.data;

    let nrParagraphs = parseInt (copy.num_paras);    

    return (nrParagraphs);
  }

  /**
   * 
   */
  generateGlobalClusters (paraCount) {
    let topicElements=[];

    topicElements.push (<tr key={"topic-key-0"}><td style={{width: "175px"}}><div className="coherence-item" onClick={(e) => this.onGlobalTopicClick (e,0)}>Current Conditions</div></td><td>&nbsp;</td></tr>)
    topicElements.push (<tr key={"topic-key-1"}><td style={{width: "175px"}}><div className="coherence-item" onClick={(e) => this.onGlobalTopicClick (e,1)}>Target Audience</div></td><td>&nbsp;</td></tr>)
    topicElements.push (<tr key={"topic-key-2"}><td style={{width: "175px"}}><div className="coherence-item" onClick={(e) => this.onGlobalTopicClick (e,2)}>Limitations in Your Proposal</div></td><td>&nbsp;</td></tr>)
    topicElements.push (<tr key={"topic-key-3"}><td style={{width: "175px"}}><div className="coherence-item" onClick={(e) => this.onGlobalTopicClick (e,3)}>Proposed Change</div></td><td>&nbsp;</td></tr>)            

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
    let topicElements=[];

    if ((this.state.selectedParagraph==-1) || (this.state.selectedLocal==null)) {
      return (topicElements);
    }

    let topics=this.state.selectedLocal.data;

    console.log (topics);

    let num_sents=this.state.selectedLocal.num_sents;
  
    for (let i=0;i<topics.length;i++) {
      let topicObject=this.getLocalTopicObject (i);
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
    let sentenceElements=[];

    if ((this.state.selectedParagraph==-1) || (this.state.selectedLocal==null)) {
      return (sentenceElements);
    }

    for (let i=0;i<this.state.selectedLocal.num_sents;i++) {
      let paraClass="paragraph-toggle";
      if (i==this.state.selectedSentence) {
        paraClass="paragraph-toggled";
      }
      sentenceElements.push (<div key={"key-paragraph-"+i} className={paraClass} onClick={(e) => this.onSentenceClick (e,i)}>{""+(i+1)}</div>);
    }

    sentenceElements.push (<div className="paragraph-padding"></div>);

    return (<div className="paragraph-row">{sentenceElements}</div>);
  }

  /**
   * 
   */
  render () {
    let paraCount=this.countParagraphs ();
  	let visualizationGlobal;
    let visualizationLocal;
    let paragraphcontrols=this.generatePagraphControls (paraCount);
    let sentencecontrols=this.generateSentenceControls ();

    if (this.props.showglobal==true) {
      visualizationGlobal=this.generateGlobalClusters (paraCount);
    } else {
      visualizationGlobal=this.generateGlobalTopics (paraCount);
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
        {visualizationGlobal}
      </tbody>
    </table></div>);
  }
}

export default CoherencePanel;
