import { FC, useState } from "react";
import { Card, Col, Form, ListGroup, Row } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";
import { onActivatePlatform } from "./Page.telefunc";

export const Page: FC = () => {
  const { platforms } = useData<Data>();
  const { t } = useTranslation("admin");
  const [lms, setLms] = useState(platforms);

  return (
    <Card>
      <Card.Header>{t("platforms.title")}</Card.Header>
      <ListGroup variant="flush">
        {lms.map(
          ({ platformId, platformName, platformActive, platformUrl }) => (
            <ListGroup.Item key={platformId}>
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
                  <Form>
                    <Form.Check
                      type="switch"
                      id={`platform-${platformId}-active`}
                      label={
                        platformActive
                          ? t("platforms.active")
                          : t("platforms.inactive")
                      }
                      checked={platformActive}
                      onChange={async (e) => {
                        const val = await onActivatePlatform(
                          platformId,
                          e.target.checked
                        );
                        if (val.success) {
                          setLms((prev) =>
                            prev.map((lms) =>
                              lms.platformId === platformId
                                ? {
                                    ...lms,
                                    platformActive:
                                      val.value ?? lms.platformActive,
                                  }
                                : lms
                            )
                          );
                        }
                      }}
                    />
                  </Form>
                </Col>
              </Row>
            </ListGroup.Item>
          )
        )}
      </ListGroup>
    </Card>
  );
};
