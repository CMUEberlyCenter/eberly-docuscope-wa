import classNames from "classnames";
import type { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";
import { About } from "../About/About";

/**
 * Footer component with about and legal links.
 */
export const Legal: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <Translation>
    {(t) => (
      <footer
        {...props}
        className={classNames(
          className,
          "tw:w-full tw:px-3 tw:border-t tw:border-mercury tw:py-2 tw:flex tw:flex-row tw:items-center tw:justify-end tw:divide-x-2 tw:divide-mercury tw:text-sm"
        )}
      >
        <About className="tw:px-1" />
        {/* <a className="px-1 border-end border-2" href="https://www.andrew.cmu.edu/" target="_blank">{t('legal.myprose')}</a> */}
        <a
          className="tw:px-1"
          href="https://www.cmu.edu/legal/"
          target="_blank"
          rel="noreferrer noopener"
        >
          {t("legal.cmu")}
        </a>
        <a
          className="tw:px-1"
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
