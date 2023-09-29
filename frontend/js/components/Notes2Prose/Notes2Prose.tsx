import React, { Suspense } from "react";
import { Alert, Button, Modal, Spinner } from "react-bootstrap";
import {
  SelectedNotesProse,
  notes$,
  prose$,
  retrieveConvertLog,
  useNotes,
  useProse,
  useScribe,
} from "../../service/scribe.service";
import { Subscribe } from "@react-rxjs/core";
import { ErrorBoundary } from "react-error-boundary";
import { courseId } from "../../service/lti.service";

export const Notes2Prose = ({
  show = false,
  onHide,
  insert = () => undefined,
}: {
  show: boolean;
  onHide: () => void;
  insert: (notes: SelectedNotesProse) => void;
}) => {
  const scribe = useScribe();
  const notes = useNotes();
  const response = useProse();

  // const play = () => {
  //   const utterance = new SpeechSynthesisUtterance(prose);
  //   speechSynthesis.speak(utterance);
  // };
  const copy = () => {
    navigator.clipboard.writeText(response.prose ?? '');
  }
  const downloadHistory = () => {
    // file object
    const file = new Blob([retrieveConvertLog()], { type: 'application/json' });

    // anchor link
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.style.display = 'none';
    element.download = `AIScribeHistory-${courseId()}-${Date.now()}.json`;

    // simulate link click
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    // remove element?
  }


  const alert = (
    <Alert variant="warning">
      A.I. Scribe is currently disabled. See Help&gt;A.I. Scribe.
    </Alert>
  );
  const body = (
    <ErrorBoundary fallback={<Alert variant="danger">Notes to Prose is unavailable.</Alert>}>
      <h3>Notes</h3>
      <Subscribe source$={notes$}>
        <div>{notes?.text ?? ''}</div>
      </Subscribe>
      <h3>Prose</h3>
      <Subscribe
        source$={prose$}
        fallback={<Alert variant="info">Preprocessing...</Alert>}
      >
        <Suspense fallback={<Alert variant="info">Processing...</Alert>}>
          <div className="w-100">{typeof (response) !== 'object' ?  (
          <Spinner animation="border" role="status" variant="info" className="mx-auto">
            <span className="visually-hidden">Processing...</span>
          </Spinner>
          ) : response.prose}</div>
          {/* <Button onClick={play}>Play Prose</Button> */}
          <Button onClick={copy}>Copy Prose to Clipboard</Button>
          <Button onClick={() => insert(response)}>Insert into Essay</Button>
          <Button onClick={downloadHistory}>Export History</Button>
        </Suspense>
      </Subscribe>
    </ErrorBoundary>
  );

  return (
    <Modal show={show} onHide={onHide} scrollable>
      <Modal.Header closeButton>A.I. Scribe - Notes to Prose</Modal.Header>
      <Modal.Body>{scribe ? body : alert}</Modal.Body>
    </Modal>
  );
};
