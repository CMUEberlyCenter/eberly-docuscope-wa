import { FC } from "react";
import { Translation } from "react-i18next";

export const Legal: FC = () => (
  <Translation>
    {(t) => (
      <footer
        className="container-fluid border-top py-2 d-flex flex-row align-items-baseline justify-content-end"
        style={{ fontSize: "small" }}
      >
        {/* <a className="px-1 border-end border-2" href="https://www.andrew.cmu.edu/" target="_blank">{t('legal.myprose')}</a> */}
        <a
          className="border-end border-2 px-1"
          href="https://www.cmu.edu/legal/"
          target="_blank"
        >
          {t("legal.cmu")}
        </a>
        <a
          className="px-1"
          href="https://www.cmu.edu/legal/privacy-notice.html"
          target="_blank"
        >
          {t("legal.privacy")}
        </a>
      </footer>
    )}
  </Translation>
);
