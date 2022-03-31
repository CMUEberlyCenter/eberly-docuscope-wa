import React from "react";

import "./DocuScopeProgressWindow.scss";

const DocuScopeProgressWindow = (props: { title: string, progress: number }) => (
  <div className="progresswindow">
    <div className="progresstitle">{props.title}</div>
    <div className="progress m-3 rounded-pill">
      <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={props.progress} style={{width: `${props.progress}%`}}></div>
    </div>
  </div>
);

export default DocuScopeProgressWindow;
