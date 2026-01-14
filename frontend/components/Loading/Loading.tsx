import type { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";
import DotSpinner from "../../assets/icons/6-dots-rotate.svg?react";
import style from "./Loading.module.scss";
import classNames from "classnames";

/**
 * Basic loading spinner with text.
 * Used in Tool content areas.
 */
export const Loading: FC<HTMLProps<HTMLDivElement>> = (className, ...props) => {
  return (
    <div
      role="status"
      className={classNames(
        className,
        `mx-auto loading w-100 h-100 position-relative`
      )}
      {...props}
    >
      <div className="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center">
        <DotSpinner
          aria-hidden="true"
          className={`text-primary ${style["loading-animate-spin"]}`}
        />
        <Translation>
          {(t) => (
            <>
              <div className="text-center text-wrap">{t("loading")}</div>
              <div className="text-center text-wrap fw-light">{t("wait")}</div>
            </>
          )}
        </Translation>
      </div>
    </div>
  );
};
