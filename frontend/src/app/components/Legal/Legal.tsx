import { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";
import { About } from "../About/About";
import classNames from "classnames";

/**
 * Footer component with legal links.
 */
export const Legal: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  style,
  ...props
}) => (
  <Translation>
    {(t) => (
      <footer
        {...props}
        className={classNames(
          className,
          "container-fluid border-top py-2 d-flex flex-row align-items-baseline justify-content-end"
        )}
        style={{ ...style, fontSize: "small" }}
      >
        <About />
        {/* <a className="px-1 border-end border-2" href="https://www.andrew.cmu.edu/" target="_blank">{t('legal.myprose')}</a> */}
        <a
          className="border-start border-end border-2 px-1"
          href="https://www.cmu.edu/legal/"
          target="_blank"
          rel="noreferrer noopener"
        >
          {t("legal.cmu")}
        </a>
        <a
          className="px-1"
          href="https://www.cmu.edu/legal/privacy-notice.html"
          target="_blank"
          rel="noreferrer noopener"
        >
          {t("legal.privacy")}
        </a>
      </footer>
    )}
  </Translation>
);
