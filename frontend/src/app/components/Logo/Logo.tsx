import type { FC } from "react";
import { Translation } from "react-i18next";
import logo from "../../assets/logo.svg";

/** Logo component for the application. */
export const Logo: FC = () => (
  <Translation>
    {(t) => (
      <a
        href="https://www.cmu.edu/dietrich/english/research-and-publications/myprose.html"
        target="_blank"
        rel="noreferrer noopener"
      >
        <img style={{ height: "1.1em" }} src={logo} alt={t("document.title")} />
      </a>
    )}
  </Translation>
);
