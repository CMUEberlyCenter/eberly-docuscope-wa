/* Contents of the Clarity tab of the tools widget.
 */
import React, { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import { sentenceData } from "../../data/sentencedata";
import DocuScopeOnTopic from "../../DocuScopeOnTopic";
import { useLockedEditorText } from "../../service/editor-state.service";
import TabTitle from "../TabTitle/TabTitle";

const Clarity = (props: { api: apiCall }) => {
  const [status, setStatus] = useState("");
  const [data, setSentenceData] = useState<unknown>(null);
  const text = useLockedEditorText();

  const api = props.api;
  useEffect(() => {
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
    api("ontopic", { base: encoded }, "POST").then((_res) => {
      setSentenceData(sentenceData);
      // replace with setSentenceData(res) once real data is provided.
      setStatus("");
    });
  }, [text, api]);

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Polish Your Sentences for Clarity</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <DocuScopeOnTopic setStatus={setStatus} sentences={data} text={text} />
      </Card.Body>
      <Card.Footer>Status: {status}</Card.Footer>
    </Card>
  );
};
export default Clarity;
