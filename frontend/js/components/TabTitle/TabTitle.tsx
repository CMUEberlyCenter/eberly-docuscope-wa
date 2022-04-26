import * as React from "react";
import { Image } from "react-bootstrap";
import audit_icon from "../../../css/icons/audit_icon.png";
import "./TabTitle.scss";

interface Props {
  children?: React.ReactNode;
}
/**
 * Tab title component to standardize rendering.
 * @param param0 text title
 * @returns
 */
const TabTitle: React.FC<Props> = ({ children }) => (
  <h3 className="text-warning ds-tab-title" role={"heading"}>
    <Image
      fluid={true}
      thumbnail={true}
      src={audit_icon}
      className="icon me-2"
      role={"img"}
    />
    {children}
  </h3>
);
export default TabTitle;
