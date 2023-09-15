import React, { Component } from "react";

import "../css/docuscope.css";

/**
 *
 */
export default class DocuScopeWAScrim extends Component {
  /**
   *
   */
  constructor(props) {
    super(props);
  }

  /**
   *
   */
  render() {
    let scrimup;

    if (this.props.enabled == true) {
      scrimup = <div className="editor-scrim"></div>;
    }

    return (
      <div>
        {this.props.children}
        {scrimup}
        {this.props.dialog}
      </div>
    );
  }
}
