import React from "react";
import { Alert, Button, Modal } from "react-bootstrap";
import {
  notes$,
  prose$,
  useNotes,
  useProse,
  useScribe,
} from "../../service/scribe.service";
import { Subscribe } from "@react-rxjs/core";

export const Notes2Prose = ({
  show = false,
  onHide,
}: {
  show: boolean;
  onHide: () => void;
}) => {
  const scribe = useScribe();
  const notes = useNotes();
  const prose = useProse();

  const play = () => {
    const utterance = new SpeechSynthesisUtterance(prose);
    speechSynthesis.speak(utterance);
  };
  const alert = (
    <Alert variant="warning">
      A.I. Scribe is currently disabled. See Help&gt;A.I. Scribe.
    </Alert>
  );
  const body = (
    <>
      <h3>Notes</h3>
      <Subscribe source$={notes$}>
        <div>{notes}</div>
      </Subscribe>
      <h3>Prose</h3>
      <Subscribe
        source$={prose$}
        fallback={<Alert variant="info">Processing...</Alert>}
      >
        <div>{prose}</div>
        <Button onClick={play}>Play Prose</Button>
      </Subscribe>
    </>
  );

  return (
    <Modal show={show} onHide={onHide} scrollable>
      <Modal.Header closeButton>A.I. Scribe - Notes to Prose</Modal.Header>
      <Modal.Body>{scribe ? body : alert}</Modal.Body>
    </Modal>
  );
};
