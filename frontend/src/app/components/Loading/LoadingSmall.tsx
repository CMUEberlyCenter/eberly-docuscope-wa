import { FC } from "react";
import { Translation } from "react-i18next";
import DotSpinner from "../../assets/icons/6-dots-rotate.svg?react";
import "./Loading.scss";

export const LoadingSmall: FC = () => {
  return (
    <div
      role="status"
    >
      <DotSpinner
        aria-hidden="true"
        className="text-dark loading-animate-spin"
      />
      <Translation>
        {(t) => (
          <span className="sr-only visually-hidden">{t("loading")}</span>
        )}
      </Translation>
    </div>
  );
};
