import { FC } from "react";
// import './Logo.scss';
import { Translation } from "react-i18next";
import logo from "../../assets/logo.svg";

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
      <img style={{ height: "1.1em" }} src={logo} alt={t("document.title")} />
    )}
  </Translation>
);
