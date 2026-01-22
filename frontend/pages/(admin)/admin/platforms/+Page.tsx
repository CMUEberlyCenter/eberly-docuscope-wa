import { FC } from "react";
import { Card, Col, ListGroup, Row } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";

export const Page: FC = () => {
  const { platforms } = useData<Data>();
  const { t } = useTranslation("admin");

  return (
    <Card>
      <Card.Header>{t("platforms.title")}</Card.Header>
      <ListGroup variant="flush">
        {platforms.map(
          ({ platformId, platformName, platformActive, platformUrl }, i) => (
            <ListGroup.Item
              key={
                typeof platformId === "string" ? platformId : `platform-${i}`
              }
            >
              <Row>
                <Col md="auto">{t("platforms.id")}</Col>
                <Col>{platformId}</Col>
              </Row>
              <Row>
                <Col md="auto">{t("platforms.name")}</Col>
                <Col>{platformName}</Col>
              </Row>
              <Row>
                <Col md="auto">{t("platforms.url")}</Col>
                <Col>{platformUrl}</Col>
              </Row>
              <Row>
                <Col md="auto">{t("platforms.status")}</Col>
                <Col>
                  {platformActive
                    ? t("platforms.active")
                    : t("platforms.inactive")}
                </Col>
              </Row>
            </ListGroup.Item>
          )
        )}
      </ListGroup>
    </Card>
  );
};
