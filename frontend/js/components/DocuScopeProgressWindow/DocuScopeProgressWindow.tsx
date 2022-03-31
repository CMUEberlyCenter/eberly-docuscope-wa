import React from "react";

import "./DocuScopeProgressWindow.scss";

const DocuScopeProgressWindow = (props: { title: string, progress: number }) => (
  <div className="progresswindow">
    <div className="progresstitle">{props.title}</div>
    <div className="progresscontent">
      <div className="meter">
        <span style={{ width: props.progress + "%" }}></span>
      </div>
    </div>
  </div>
);

export default DocuScopeProgressWindow;
