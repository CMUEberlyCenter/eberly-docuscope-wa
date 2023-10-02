import { faClipboard, faFileImport } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Subscribe } from "@react-rxjs/core";
import React, { Suspense } from "react";
import {
  Alert,
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Modal,
  Spinner,
} from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import {
  SelectedNotesProse,
  downloadHistory,
  notes$,
  prose$,
  useNotes,
  useProse,
  useScribe,
} from "../../service/scribe.service";

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
  // const [pause, setPause] = useState<boolean>(false);

  // TODO: manage state to show/disable correct buttons.
  // const play = useCallback(() => {
  //   if (speechSynthesis.paused && speechSynthesis.pending) {
  //     speechSynthesis.resume();
  //     setPause(false);
  //   } else if (speechSynthesis.speaking) {
  //     speechSynthesis.pause();
  //     setPause(true);
  //   } else {
  //     speechSynthesis.cancel();
  //     const utterance = new SpeechSynthesisUtterance(response.prose);
  //     speechSynthesis.speak(utterance);
  //     setPause(false);
  //   }
  // }, [response.prose]);
  // const stop = () => {
  //   speechSynthesis.cancel();
  //   setPause(false);
  // }
  // useEffect(() => {
  //   return () => speechSynthesis.cancel();
  // }, []);

  const copy = () => {
    navigator.clipboard.writeText(response.prose ?? "");
  };

  const alert = (
    <Alert variant="warning">
      A.I. Scribe is currently disabled. See Help&gt;A.I. Scribe.
    </Alert>
  );
  const noNotes = <Alert variant="warning">No selected notes.</Alert>;

  const body = (
    <ErrorBoundary
      fallback={<Alert variant="danger">Notes to Prose is unavailable.</Alert>}
    >
      <Card as="section">
        <Card.Body>
          <Card.Title>Notes</Card.Title>
          <Card.Subtitle>Text selected in editor:</Card.Subtitle>
          <Card.Text as="div">
            <Subscribe source$={notes$} fallback={noNotes}>
              {notes?.text.trim() ? (
                <article
                  className="m-2 border border-dark rounded p-1"
                  style={{ minHeight: "3em" }}
                >
                  {notes.text}
                </article>
              ) : (
                noNotes
              )}
            </Subscribe>
          </Card.Text>
        </Card.Body>
      </Card>
      <Card as="section">
        <Card.Body>
          <Card.Title>Prose</Card.Title>
          <Card.Subtitle>A.I. Generated text:</Card.Subtitle>
          <Card.Text as="div">
            <Subscribe
              source$={prose$}
              fallback={<Alert variant="info">Preprocessing...</Alert>}
            >
              {notes?.text.trim() ? (
                <Suspense
                  fallback={<Alert variant="info">Processing...</Alert>}
                >
                  <article
                    className="border border-dark rounded m-2 p-1"
                    style={{ minHeight: "5em" }}
                  >
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
                  </article>
                  <div className="d-flex justify-content-end">
                    <ButtonToolbar>
                      {/* <ButtonGroup className="me-2">
                        <Button onClick={play} title="Play/Pause" disabled={!response.prose}>
                          <FontAwesomeIcon icon={pause ? faPause : faPlay}/>
                          <span className="sr-only">{pause ? 'Pause' : 'Play'}</span>
                          </Button>
                        <Button onClick={stop} title="Stop">
                          <FontAwesomeIcon icon={faStop} />
                          <span className="sr-only">Stop</span>
                          </Button>
                      </ButtonGroup> */}
                      <ButtonGroup>
                        <Button disabled={!response.prose} onClick={copy}>
                          <FontAwesomeIcon icon={faClipboard} />
                          <span className="ms-1">Copy to Clipboard</span>
                        </Button>
                        <Button
                          disabled={!response.prose}
                          onClick={() => insert(response)}
                        >
                          <FontAwesomeIcon icon={faFileImport} />
                          <span className="ms-1">Insert into Essay</span>
                        </Button>
                      </ButtonGroup>
                    </ButtonToolbar>
                  </div>
                </Suspense>
              ) : (
                noNotes
              )}
            </Subscribe>
          </Card.Text>
        </Card.Body>
      </Card>
    </ErrorBoundary>
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>A.I. Scribe - Notes to Prose</Modal.Header>
      <Modal.Body>{scribe ? body : alert}</Modal.Body>
      <Modal.Footer>
        <a
          type="button"
          title="Instructors might ask for your conversion history, this is where you download it."
          onClick={downloadHistory}
          className="text-sm"
        >
          Export History
        </a>
      </Modal.Footer>
    </Modal>
  );
};
