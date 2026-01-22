import { FC } from "react";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";

/** Index page for the admin dashboard. */
export const Page: FC = () => {
  const { t } = useTranslation("admin");
  return (
    <Card>
      <Card.Header>{t("home")}</Card.Header>
      <Card.Body>
        <Card.Text>{t("welcome")}</Card.Text>
      </Card.Body>
    </Card>
  );
};
