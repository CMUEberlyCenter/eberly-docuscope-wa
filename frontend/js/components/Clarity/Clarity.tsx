/**
 * @fileoverview Contents of the Clarity tools.
 */
import { bind } from "@react-rxjs/core";
import React, { Suspense, useEffect, useState } from "react";
import { Alert, Card } from "react-bootstrap";

import { ErrorBoundary } from "react-error-boundary";
import { combineLatest, filter, map } from "rxjs";
import { sentenceData } from "../../data/sentencedata";

import DocuScopeOnTopic from "../../DocuScopeOnTopic";
import { currentTool$ } from "../../service/current-tool.service";
import { lockedEditorText$ } from "../../service/editor-state.service";
import TabTitle from "../TabTitle/TabTitle";

import "./Clarity.scss";

// On locking with text and tool is clarity, then emit text.
const [useClarityText /*clarityText$*/] = bind(
  combineLatest({ text: lockedEditorText$, tool: currentTool$ }).pipe(
    filter((data) => data.tool === "clarity"),
    map((data) => data.text)
  ),
  ""
);

/** Error feedback component for clarity tool. */
const ClarityErrorFallback = (props: { error?: Error }) => (
  <Alert variant="danger">
    <p>Error loading Clarity data:</p>
    <pre>{props.error?.message}</pre>
  </Alert>
);

const Clarity = (props: { 
    api: apiCall,
    ruleManager: any,
    htmlSentences: string
  }) => {
  const [status, setStatus] = useState("");
  const [data, setClarityData] = useState<unknown>(null);
  const text = useClarityText();

  /**
   * 
   */
  useEffect(() => {
    console.log ("useEffect ()");

    if (text !== "") {    
      setStatus("Retrieving results...");
      
      const escaped = encodeURIComponent(text);

      const encoded = window.btoa(escaped);

      props.api("ontopic", { custom: "", base: encoded }, "POST").then((incoming : any) => {
        const clarityData=incoming.clarity;

        setClarityData(clarityData);

        setStatus("Data retrieved");
      });
    }    
  }, [text, props.api]);

  let visualization;

  visualization=<DocuScopeOnTopic setStatus={setStatus} sentences={data} text={text} htmlSentences={props.htmlSentences}/>;

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Polish Your Sentences for Clarity</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <ErrorBoundary FallbackComponent={ClarityErrorFallback}>
          <Suspense>
          {visualization}
          </Suspense>
        </ErrorBoundary>
      </Card.Body>
      <Card.Footer>Status: {status}</Card.Footer>
    </Card>
  );
};

export default Clarity;
