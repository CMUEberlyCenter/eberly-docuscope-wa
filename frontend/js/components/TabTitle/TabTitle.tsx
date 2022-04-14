import * as React from "react";
import { Image } from "react-bootstrap";
import audit_icon from "../../../css/icons/audit_icon.png";
import "./TabTitle.scss";

interface Props {
  children?: React.ReactNode;
}
const TabTitle: React.FC<Props> = ({children}) => (
  <h3 className="text-warning ds-tab-title">
    <Image fluid={true} thumbnail={true} src={audit_icon} className="icon me-2" />
    {children}
  </h3>
);
export default TabTitle;
