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
    navigator.clipboard.writeText(response.prose ?? "");
  };
  const downloadHistory = () => {
    // file object
    const file = new Blob([retrieveConvertLog()], { type: "application/json" });

    // anchor link
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.style.display = "none";
    element.download = `AIScribeHistory-${courseId()}-${Date.now()}.json`;

    // simulate link click
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    // remove element?
  };

  const alert = (
    <Alert variant="warning">
      A.I. Scribe is currently disabled. See Help&gt;A.I. Scribe.
    </Alert>
  );
  const body = (
    <ErrorBoundary
      fallback={<Alert variant="danger">Notes to Prose is unavailable.</Alert>}
    >
      <section className="card mb-1">
        <div className="card-body">
          <h5 className="card-title">Notes</h5>
          <h6 className="card-subtitle">
            These are from text selected in the editor.
          </h6>
          <Subscribe
            source$={notes$}
            fallback={<Alert variant="warning">No selected text.</Alert>}
          >
            {notes?.text.trim() ? (
              <div
                className="card-text m-2 border"
                style={{ minHeight: "3em" }}
              >
                {notes.text}
              </div>
            ) : (
              <Alert variant="warning">No selected text.</Alert>
            )}
          </Subscribe>
        </div>
      </section>
      <section className="card">
        <div className="card-body">
          <h5 className="card-title">Prose from Notes</h5>
          <div className="card-text">
            <Subscribe
              source$={prose$}
              fallback={<Alert variant="info">Preprocessing...</Alert>}
            >
              {notes?.text.trim() ? (
                <Suspense
                  fallback={<Alert variant="info">Processing...</Alert>}
                >
                  <div className="w-100 mh" style={{ minHeight: "5em" }}>
                    {typeof response !== "object" ? (
                      <Spinner
                        animation="border"
                        role="status"
                        variant="info"
                        className="mx-auto"
                      >
                        <span className="visually-hidden">Processing...</span>
                      </Spinner>
                    ) : (
                      response.prose
                    )}
                  </div>
                  {/* <Button onClick={play}>Play Prose</Button> */}
                  <Button disabled={!response.prose} onClick={copy}>
                    Copy to Clipboard
                  </Button>
                  <Button
                    disabled={!response.prose}
                    onClick={() => insert(response)}
                  >
                    Insert into Essay
                  </Button>
                </Suspense>
              ) : (
                <Alert variant="warning">No selected notes.</Alert>
              )}
            </Subscribe>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end">
          <Button
            title="Instructors might ask for your conversion history, this is where you download it."
            variant="light"
            onClick={downloadHistory}
          >
            Export History
          </Button>
        </div>
      </section>
    </ErrorBoundary>
  );

  return (
    <Modal show={show} onHide={onHide} scrollable>
      <Modal.Header closeButton>A.I. Scribe - Notes to Prose</Modal.Header>
      <Modal.Body>{scribe ? body : alert}</Modal.Body>
    </Modal>
  );
};
