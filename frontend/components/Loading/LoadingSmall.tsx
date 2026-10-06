import DotSpinner from "#assets/icons/6-dots-rotate.svg?react";
import type { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";

/**
 * Component for displaying a small loading spinner.
 * Used in accordion headers and other small areas.
 */
export const LoadingSmall: FC<HTMLProps<HTMLDivElement>> = (props) => {
  return (
    <div role="status" {...props}>
      <DotSpinner
        aria-hidden="true"
        className={`tw:text-primary tw:animate-spin`}
      />
      <Translation>
        {(t) => <span className="tw:sr-only">{t("loading")}</span>}
      </Translation>
    </div>
  );
};
