import React, { Component } from "react";

import './CoherencePanel.scss';

import OnTopicDataTools from "../../lang/OnTopicDataTools";

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
      selectedParagraph: -1
    };

    this.dataTools=new OnTopicDataTools ();

    this.onTopicClick=this.onTopicClick.bind(this);
    this.onGlobalTopicClick=this.onGlobalTopicClick.bind(this);
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
  onTopicClick (e,anIndex) {
    console.log ("onTopicClick ("+anIndex+")");

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
      this.setState ({selectedParagraph: anIndex});
    }
  }

  /**
   * Utility function, also need one that gets the topic by the
   * actual string or occurrence in the text (maybe?)
   */
  getTopicObject (anIndex) {
  	if (!this.props.data) {
  	  return (null);
  	}

  	let topicRow=this.props.data [0];

  	if (topicRow) {
  	  return (topicRow [anIndex]);
  	}

  	return (null);
  }

  /**
   * 
   */
  generateGlobalTopics (paraCount) {
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
   * data format
   */
  generateCoherencePanel (paraCount) {
  	let topicElements=[];

    /*
  	if (!this.props.data) {
  	  return (topicElements);
  	}

    let copy=this.props.data;

    let topics=copy [0];

    for (let i=0;i<topics.length;i++) {
      let topic=this.getTopicObject (i);
      topicElements.push (<tr key={"topic-key-"+i}><td style={{width: "150px"}}><div className="coherence-item" onClick={(e) => this.onTopicClick (e,i)}>{topic[1]}</div></td><td>&nbsp;</td></tr>)
    }

    // Skip the header
    for (let i=1;i<copy.length;i++) {

    }
    */

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
      paraElements.push (<div key={"key-paragraph-"+i} className={paraClass} onClick={(e) => this.onParagraphClick (e,i)}>{""+i}</div>);
    }

    paraElements.push (<div className="paragraph-padding"></div>);

    return (<div className="paragraph-row">{paraElements}</div>);
  }

  /**
   * 
   */
  render () {
    let paraCount=this.dataTools.countParagraphs (this.props.data);    
  	let visualization;
    let paragraphcontrols=this.generatePagraphControls (paraCount);

    if (this.props.showglobal==true) {
      visualization=this.generateGlobalTopics (paraCount);
    } else {
      visualization=this.generateCoherencePanel (paraCount);
    }

    return (<div className="coherence-list"><table>
      <tbody>
      <tr>
        <td>Controls</td>
        <td>{paragraphcontrols}</td>
      </tr>
      {visualization}
      </tbody>
    </table></div>);
  }
}

export default CoherencePanel;
