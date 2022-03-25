import React, { Component } from 'react';

import '../css/docuscope.css';

/**
 *
 */
class DocuScopeProgressWindow extends Component {

  /**
   *
   */
  constructor(props) {
    super(props);
  }

  /**
   *
   */
  render () {
    return (<div className="progresswindow">
	  <div className="progresstitle">{this.props.title}</div>
	  <div className="progresscontent">
	    <div className="meter" style={{height: "25px", margin: "15px"}}>
	      <span style={{width: (this.props.progress+"%")}}></span>
	    </div>        
	  </div>
	</div>);
  }
}

export default DocuScopeProgressWindow;
