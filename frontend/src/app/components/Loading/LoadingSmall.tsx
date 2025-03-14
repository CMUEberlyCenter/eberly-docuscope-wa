import { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";
import DotSpinner from "../../assets/icons/6-dots-rotate.svg?react";
import style from "./Loading.module.scss";

export const LoadingSmall: FC<HTMLProps<HTMLDivElement>> = (...props) => {
  return (
    <div role="status" {...props}>
      <DotSpinner
        aria-hidden="true"
        className={`text-primary ${style["loading-animate-spin"]}`}
      />
      <Translation>
        {(t) => <span className="sr-only visually-hidden">{t("loading")}</span>}
      </Translation>
    </div>
  );
};
