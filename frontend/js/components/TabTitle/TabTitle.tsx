import * as React from 'react';
import mainIcon from "../../../css/icons/audit_icon.png";
import './TabTitle.scss'

const TabTitle = (props: { title: string }) => (
  <div className="bg-light flex-shrink-0 p-3 d-flex align-items-center tab-title">
    <img src={`${mainIcon}`} className="pe-3 icon"></img>
    <h3 className="context-title">{props.title}</h3>
  </div>
);
export default TabTitle;
