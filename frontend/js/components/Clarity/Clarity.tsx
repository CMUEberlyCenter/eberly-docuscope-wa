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

// On locking with text and tool is clarity, then emit text.
const [useClarityText, /*clarityText$*/] = bind(
  combineLatest({ text: lockedEditorText$, tool: currentTool$ }).pipe(
    filter((data) => data.tool === 'clarity'),
    map((data) => data.text)
  ), ''
);

/** Error feedback component for clarity tool. */
const ClarityErrorFallback = (props: { error?: Error }) => (
  <Alert variant="danger">
    <p>Error loading Clarity data:</p>
    <pre>{props.error?.message}</pre>
  </Alert>
)
const Clarity = ({api}: { api: apiCall }) => {
  const [status, setStatus] = useState("");
  const [data, setSentenceData] = useState<unknown>(null);
  const text = useClarityText();

  useEffect(() => {
    if (text !== '') {
      // TODO: add progress spinner.
      setStatus("Retrieving results...");

      // FIXME: encoding of data sent.
      const escaped = encodeURIComponent(`{
      event_id: "docuscope",
      data: {
        status: "text",
        content: ${text},
      }
    }`);
      const encoded = window.btoa(escaped);
      // HERE IS THE CALL TO ONTOPIC API
      api("ontopic", { base: encoded }, "POST").then((results) => {
        console.log(results);
        setSentenceData(sentenceData);
        // replace with setSentenceData(results) once real data is provided.
        setStatus("");
      });
    }
  }, [text, api]);

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Polish Your Sentences for Clarity</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <ErrorBoundary FallbackComponent={ClarityErrorFallback}>
          <Suspense>
            <DocuScopeOnTopic setStatus={setStatus} sentences={data} text={text} />
          </Suspense>
        </ErrorBoundary>
      </Card.Body>
      <Card.Footer>Status: {status}</Card.Footer>
    </Card>
  );
};
export default Clarity;
