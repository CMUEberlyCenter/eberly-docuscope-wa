import { FC } from "react";
import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";

export const Loading: FC = () => {
  const { t } = useTranslation();
  return (
    <Spinner
      animation="border"
      role="status"
      variant="info"
      className="mx-auto"
    >
      <span className="visually-hidden sr-only">{t("loading")}</span>
    </Spinner>
  );
};
