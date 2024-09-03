import { FC } from "react";
import { Translation } from "react-i18next";
import DotSpinner from "../../assets/icons/6-dots-rotate.svg?react";
import "./Loading.scss";

export const Loading: FC = () => {
  return (
    <div
      role="status"
      className="mx-auto loading w-100 h-100 position-relative"
    >
      <div className="position-absolute top-50 start-50 translate-middle">
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
    </div>
  );
};
