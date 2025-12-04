import { FC } from "react";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";

export const Page: FC = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <Card.Header>{t("admin.home")}</Card.Header>
      <Card.Body>
        <Card.Text>{t("admin.welcome")}</Card.Text>
      </Card.Body>
    </Card>
  );
};
