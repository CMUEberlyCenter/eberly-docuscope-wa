import { FC } from "react";
// import './Logo.scss';
import logo from "../../assets/logo.svg";
import { Translation } from "react-i18next";

// CSS logo
// export const Logo: FC = () => (
//   <div className="logo">
//     <span className="prefix">my</span>
//     <span className="main">Prose</span>
//   </div>
// );

export const Logo: FC = () => (
  <Translation>
    {(t) => (
      <img style={{ height: "1.75em" }} src={logo} alt={t("document.title")} />
    )}
  </Translation>
);