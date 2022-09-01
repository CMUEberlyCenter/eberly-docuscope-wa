/**
 * @fileoverview Contents of the Coherence tool.
 *
 * The top has a legend for interpreting this tool's symbols.
 */
import React, { useEffect, useId, useState } from "react";

import { Card, Col, Container, Row } from "react-bootstrap";

import { combineLatest, filter, map } from "rxjs";
import { bind } from "@react-rxjs/core";

import { currentTool$ } from "../../service/current-tool.service";
import { lockedEditorText$ } from "../../service/editor-state.service";
import TabTitle from "../TabTitle/TabTitle";

import { useLockedEditorText } from "../../service/editor-state.service";

import "./Coherence.scss";
import CoherencePanel from "../CoherencePanel/CoherencePanel";
import TopicHighlighter from "../../TopicHighlighter";

// Dummy data so that we can keep working on our visualization widget set
/*
import { coherenceData } from "../../data/coherencedata";
import { coherenceDataLocal } from "../../data/coherencedatalocal";
*/

/** Legend for data representation for these tools. */
const Legend = () => (
  <Container className="border p-2">
    <Row xs={"auto"} md={"auto"} lg={2}>
      <Col>
        <i
          className="fa-solid fa-circle text-legend"
          title="A filled circle."
        ></i>{" "}
        Topic before the main verb
      </Col>
      <Col>
        <span
          className="text-nowrap"
          title="A solid circle with a small circle in the upper left corner.">
          <i
            className="fa-solid fa-circle text-legend"
            style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}></i>
          <i className="fa-solid fa-circle text-legend"></i>
        </span>{" "}
        Topic before the main verb of a topic sentence
      </Col>
      <Col>
        <i className="fa-regular fa-circle text-legend"
          title="An empty circle."></i>
        Topic after the main verb
      </Col>
      <Col>
        <span className="border rounded px-1 border-2" title="A boxed number.">1</span>{" "}
        Paragraph/Sentence number
      </Col>
    </Row>
  </Container>
);

// Using react-rxjs to get observable to act like hooks.
// On locking text with some text present and the tool is clarity
// emit the text.
const [useCoherenceText /*coherenceText$*/] = bind(
  combineLatest({ text: lockedEditorText$, tool: currentTool$ }).pipe(
    filter((data) => data.tool === "coherence"),
    map((data) => data.text)
  ),
  ""
);

/**
 * 
 */
const Coherence = (props: { 
    api: apiCall,
    ruleManager: any
  }) => {
  // api passed through on assumption that it will be used in submission.
  const toggleId = useId();

  const topicHighlighter=new TopicHighlighter ();

  const [status, setStatus] = useState("");
  const [showToggle, setShowToggle] = useState(false);
  const [data, setCoherenceData] = useState<unknown>(null);
  const [local, setLocalCoherenceData] = useState<unknown>(null);
  
  const text = useCoherenceText();

  useEffect(() => {
    //console.log ("useEffect ()");

    if (text !== "") {
      //setStatus("Retrieving results...");

      let customTopics=props.ruleManager.getAllCustomTopics ();

      //console.log ("Adding custom topics: " + customTopics);
      
      const escaped = encodeURIComponent(text);

      const encoded = window.btoa(escaped);

      props.api("ontopic", { custom: customTopics, base: encoded }, "POST").then((incoming : any) => {
        //console.log ("Processing incoming coherence data ...");
        
        let coherence=incoming.coherence;
        let local=incoming.local;

        setCoherenceData(coherence);
        setLocalCoherenceData(local);

        setStatus("Data retrieved");
      });
    }
  }, [text, props.api]);

  let visualization;

  visualization=<CoherencePanel setStatus={setStatus} data={data} local={local} text={text} showglobal={showToggle} ruleManager={props.ruleManager}/>;  

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Create Flow in Your Writing</TabTitle>
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
              onChange={() => setShowToggle(!showToggle)}>
              <label className="form-check-label me-1" htmlFor={toggleId}>Show only topic clusters:</label>
              <div className="form-check form-switch">
                <input
                  onChange={() => {}}
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={toggleId}
                  checked={showToggle}
                />
              </div>
            </div>
          </Card.Header>

          <Card.Body>{visualization}</Card.Body>
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
