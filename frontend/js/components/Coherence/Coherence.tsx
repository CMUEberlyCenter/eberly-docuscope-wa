/* Contents of the Coherence tab of the tools widget. */
import React, { useId, useState } from "react";
import { Card, Col, Container, Row } from "react-bootstrap";
import TabTitle from "../TabTitle/TabTitle";
import "./Coherence.scss";

/** Legend for data representation for these tools. */
const Legend = () => (
  <Container className="border p-2">
    <Row xs={"auto"} md={"auto"} lg={2}>
      <Col className="text-nowrap">
        <i
          className="fa-solid fa-circle text-legend"
          title="A filled circle."
        ></i>{" "}
        Topic before the main verb
      </Col>
      <Col className="text-nowrap">
        <span
          className="text-nowrap"
          title="A solid circle with a small circle in the upper left corner."
        >
          <i
            className="fa-solid fa-circle text-legend"
            style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
          ></i>
          <i className="fa-solid fa-circle text-legend"></i>
        </span>{" "}
        Topic before the main verb of a topic sentence
      </Col>
      <Col className="text-nowrap">
        <i
          className="fa-regular fa-circle text-legend"
          title="An empty circle."
        ></i>{" "}
        Topic after the main verb
      </Col>
      <Col className="text-nowrap">
        <span className="border rounded px-1 border-2" title="A boxed number.">
          1
        </span>{" "}
        Paragraph/Sentence number
      </Col>
    </Row>
  </Container>
);

const Coherence = () => {
  const toggleId = useId();
  const [showToggle, setShowToggle] = useState(false);

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>CreateFlow in Your Writing</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <Legend />
        <Card.Text>
          The Coherence Panel charts the flow of your topic clusters across and
          within paragraphs. Dark circles indicate that a particular topic
          cluster is prominently discussed in a particular paragraph. White
          circles and gaps indicate that a particular topic cluster is mentioned
          but not prominently or not mentioned at all in the paragraph. Study
          the visualization for dark/white circles and gaps and see if the
          shifts in topic clusters and their prominence fits a writing plan your
          readers can easily follow.
        </Card.Text>
        <Card className="mb-1">
          <Card.Header className="d-flex justify-content-between">
            <span>Coherence across paragraphs</span>
            <div
              className="d-flex align-items-start"
              onChange={() => setShowToggle(!showToggle)}
            >
              <label className="form-check-label me-1" htmlFor={toggleId}>
                Show only topic clusters:
              </label>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={toggleId}
                  disabled
                  checked={showToggle}
                />
              </div>
            </div>
          </Card.Header>
          <Card.Body>{/* coherence-content */}</Card.Body>
        </Card>
        <Card>
          <Card.Header>Topic Cluster</Card.Header>
          <Card.Body>{/* detail */}</Card.Body>
        </Card>
      </Card.Body>
    </Card>
  );
};
export default Coherence;
