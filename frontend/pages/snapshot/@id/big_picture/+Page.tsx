import { NullTool } from "#components/Review/NullTool";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export const Page: FC = () => {
  const { t } = useTranslation("review");

  return <NullTool text={t("null.big_picture")} />;
};
