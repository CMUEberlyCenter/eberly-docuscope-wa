import { NullTool } from "#components/Review/NullTool.js";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export const Page: FC = () => {
  const { t } = useTranslation("review");

  return <NullTool text={t("null.fine_tuning")} />;
};
