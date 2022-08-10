import React, { Component } from 'react';

import '../css/about.css';

import { ruleInfo } from './data/info.js';

/**
 * 
 */
class DocuScopeAbout extends Component {
  
  /**
   * 
   */
  constructor (props) {
    super(props);
  }

  /**
   * 
   */
  onCloseAboutPage (e) {
  	console.log ("onCloseAboutPage ()");

    if (this.props.onCloseAboutPage) {
      this.props.onCloseAboutPage();
    }
  }

  /**
   * 
   */
  render () {
  	let version=this.props.ruleManager.getVersion ();

  	return (<div className="about-modal">
      <div className="about-modal-content">
        <div className="about-modal-container">
          <span className="about-close-button" onClick={(e) => this.onCloseAboutPage(e)}>&times;</span>

          <h1>About DocuScope Write & Audit</h1>
          <p>
          DocuScope is a text analysis environment with a suite of interactive visualization tools for corpus-based rhetorical analysis. The DocuScope Project began in 1998 as a result of collaboration between David Kaufer and Suguru Ishizaki at Carnegie Mellon University. David created what we call the generic (default) dictionary, consisting of over 40 million linguistic patterns of English classified into over 100 categories of rhetorical effects. 
          </p>

          <hr/>

          <h2>Application Information</h2>
          <p>
          Application version: {version}
          </p>

          <hr/>

          <h2>Expectations Details</h2>
          <ul>
            <li>Name: {ruleInfo.name}</li>
            <li>Version: {ruleInfo.version}</li>
            <li>Author: {ruleInfo.author}</li>
            <li>Copyright: {ruleInfo.copyright}</li>
            <li>Saved: {ruleInfo.saved}</li>
          </ul>
        </div>
      </div>
    </div>);
  }
}

export default DocuScopeAbout;
