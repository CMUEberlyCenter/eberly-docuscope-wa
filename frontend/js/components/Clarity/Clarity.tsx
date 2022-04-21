import React, { useState } from "react";
import { Card } from "react-bootstrap";
import { sentenceData } from "../../data/sentencedata";
import DocuScopeOnTopic from "../../DocuScopeOnTopic";
import { useEditorText } from "../../service/editor-state.service";
import TabTitle from "../TabTitle/TabTitle";

const Clarity = () => {
  const [status, setStatus] = useState('');
  const text = useEditorText();
  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header><TabTitle>Polish Your Sentences for Clarity</TabTitle></Card.Header>
      <Card.Body className="overflow-auto">
        <DocuScopeOnTopic
          setStatus={setStatus}
          sentences={ sentenceData }
          text={ text } />
      </Card.Body>
      <Card.Footer>Status: {status}</Card.Footer>
    </Card>
  )
}
export default Clarity;
