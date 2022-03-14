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

    console.log("DocuScopeWAScrim ()");

    this.state = {
      enabled: false,
    };
  }

  /**
   *
   */
  render() {
    return (
      <div>
        {this.props.children}
        <div className="docuscope_scrim"></div>
      </div>
    );
  }
}
