import React, { Component } from 'react';
import { Button } from "react-bootstrap";

import '../css/reset.css';

/**
 * 
 */
class DocuScopeReset extends Component {
  
  /**
   * 
   */
  constructor (props) {
    super(props);

    this.onOk=this.onOk.bind(this);
    this.onCancel=this.onCancel.bind(this);
  }

  /**
   * 
   */
  onOk (e) {
    console.log ("onOk ()");

    if (this.props.onCloseResetDialog) {
      this.props.onCloseResetDialog (true);
    }
  }

  /**
   * 
   */
  onCancel (e) {
    console.log ("onCancel ()");

    if (this.props.onCloseResetDialog) {
      this.props.onCloseResetDialog (false);
    }
  }

  /**
   * 
   */
  render () {
  	return (<div className="reset-modal">
      <div className="reset-modal-content">
        <div className="reset-modal-container">
          <span className="reset-close-button" onClick={(e) => this.onCanvel(e)}>&times;</span>
          <h1>Reset DocuScope Write & Audit?</h1>
          <p>This will reset your application to the default state. That means your save data will be replaced by the template expectations and clusters. Custom topics will be lost.</p>
          <div className="reset-controls">
            <div className="reset-padding"/>
            <Button className="reset-button" onClick={(e) => this.onOk (e)}>Ok</Button>
            <Button className="reset-button" onClick={(e) => this.onCancel (e)}>Cancel</Button>
            <div className="reset-padding"/>
          </div>
        </div>
      </div>
    </div>);
  }
}

export default DocuScopeReset;
