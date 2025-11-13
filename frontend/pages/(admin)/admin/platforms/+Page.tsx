import { FC } from "react";
import { Card, Col, ListGroup, Row } from "react-bootstrap";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";

export const Page: FC = () => {
  const { platforms } = useData<Data>();

  return (
    <Card>
      <Card.Header>Registered LTI Platforms</Card.Header>
      <ListGroup variant="flush">
        {platforms.map(
          ({ platformId, platformName, platformActive, platformUrl }, i) => (
            <ListGroup.Item
              key={
                typeof platformId === "string" ? platformId : `platform-${i}`
              }
            >
              <Row>
                <Col md="auto">ID:</Col>
                <Col>{platformId}</Col>
              </Row>
              <Row>
                <Col md="auto">Name:</Col>
                <Col>{platformName}</Col>
              </Row>
              <Row>
                <Col md="auto">URL:</Col>
                <Col>{platformUrl}</Col>
              </Row>
              <Row>
                <Col md="auto">Status:</Col>
                <Col>{platformActive ? "Active" : "Inactive"}</Col>
              </Row>
            </ListGroup.Item>
          )
        )}
      </ListGroup>
    </Card>
  );
};
