import { FC } from "react";
import './Logo.scss';
// import logo from "../../assets/logo.svg";

export const Logo: FC = () => (
  <div className="logo">
    <span className="prefix">my</span>
    <span className="main">Prose</span>
  </div>
);
{/* <img
style={{ height: "1.75em" }}
src={logo}
alt={tt("document.title")}
/> */}
