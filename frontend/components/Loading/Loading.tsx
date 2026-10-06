import DotSpinner from "#assets/icons/6-dots-rotate.svg?react";
import classNames from "classnames";
import type { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";

/**
 * Basic loading spinner with text.
 * Used in Tool content areas.
 */
export const Loading: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      role="status"
      className={classNames(
        className,
        `tw:flex tw:flex-col loading tw:w-full tw:h-full tw:items-center tw:justify-content-center`
      )}
      {...props}
    >
      <DotSpinner
        aria-hidden="true"
        className={`tw:text-primary tw:animate-spin`}
      />
      <Translation>
        {(t) => (
          <>
            <div className="tw:text-center tw:text-wrap">{t("loading")}</div>
            <div className="tw:text-center tw:text-wrap tw:font-light">
              {t("wait")}
            </div>
          </>
        )}
      </Translation>
    </div>
  );
};
