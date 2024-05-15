/* Component for standardizing look of tool card headers.

This renders the audit icon image and then the child text in a h3 element.
*/
import { FC, ReactNode } from "react";
import { Image } from "react-bootstrap";
import audit_icon from "../../assets/icons/audit_icon.png";
import "./TabTitle.scss";

interface Props {
  children?: ReactNode;
}

/**
 * Tab title component to standardize rendering of the title
 * header of the cards in the tabbed tools.
 * @param param0 text title
 * @returns
 */
const TabTitle: FC<Props> = ({ children }) => (
  <h3 className="ds-tab-title" role={"heading"}>
    <Image
      alt="DocuScope Audit Icon"
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
