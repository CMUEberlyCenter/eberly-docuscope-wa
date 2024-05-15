import { faClipboard, faFileImport } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Subscribe } from "@react-rxjs/core";
import { FC, ReactElement, Suspense } from "react";
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
import { Descendant, Text } from "slate";
import { useEditorState } from "../../../service/editor-state.service";
import {
  SelectedNotesProse,
  downloadHistory,
  notes$,
  prose$,
  useNotes,
  useProse,
  useScribe,
} from "../../../service/scribe.service";
import { DisabledAlert } from "../DisabledAlert";
import { TextToSpeech } from "../TextToSpeech";

/**
 * Serialize editor fragment to html for rendering.
 * @param node A fragment of selected text from the editor
 * @returns html for selected text.
 *
 * This implimentation invokes the need unique key warning.
 */
const serialize = (
  node: Descendant | Descendant[] | undefined
): ReactElement => {
  if (!node) {
    return <></>;
  }
  if (Array.isArray(node)) {
    return <>{node.map(serialize)}</>;
  }
  if (Text.isText(node)) {
    return <>{node.text}</>;
  }

  const children = serialize(node.children);
  switch (node.type) {
    case "quote":
      return (
        <blockquote>
          <p>{children}</p>
        </blockquote>
      );
    case "paragraph":
      return <p>{children}</p>;
    default:
      return children;
  }
};

type Notes2ProseProps = {
  show: boolean;
  onHide: () => void;
  insert: (notes: SelectedNotesProse) => void;
};
/**
 * myScribe component for converting notes to prose.
 * @component
 * @param show if true, then show the modal.
 * @param onHide function to call when modal is dismissed.
 * @param insert function to call to export generated text.
 * @example <Notes2Promse show={showNotes} onHide={() => setShowNotes(false)} insert={insert}/>
 */
export const Notes2Prose: FC<Notes2ProseProps> = ({
  show = false,
  onHide,
  insert = () => undefined,
}: Notes2ProseProps) => {
  const scribe = useScribe();
  const notes = useNotes();
  const response = useProse();
  const editing = useEditorState();

  // copy prose to clipboard.
  const copy = () => {
    navigator.clipboard.writeText(response.prose ?? "");
  };

  // Warning message to display if no notes are selected or the editor is locked.
  const noNotes = (
    <Alert variant="warning">
      {editing ? "" : <p>Set the Edit Mode to unlocked.</p>}
      <p>Select some notes to submit in the text editor.</p>
    </Alert>
  );

  const body = (
    <ErrorBoundary
      fallback={<Alert variant="danger">Notes to Prose is unavailable.</Alert>}
    >
      {notes?.text.trim() ? (
        <>
          <Card as="section">
            <Card.Body>
              <Card.Title>Notes</Card.Title>
              <Card.Subtitle>Text selected in editor:</Card.Subtitle>
              <Card.Text as="div">
                <Subscribe source$={notes$} fallback={noNotes}>
                  <article
                    className="m-2 border border-dark rounded p-1"
                    style={{ minHeight: "3em" }}
                  >
                    {serialize(notes.fragment)}
                    {/* {notes.text} */}
                  </article>
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
                            <span className="visually-hidden">
                              Processing...
                            </span>
                          </Spinner>
                        ) : (
                          <>
                            {response.prose
                              ?.split("\n\n")
                              .map((par, i) => (
                                <p key={`prose-paragraph-${i}`}>{par}</p>
                              ))}
                          </>
                        )}
                      </article>
                      <div className="d-flex justify-content-end">
                        <ButtonToolbar>
                          <TextToSpeech text={response.prose ?? ""} />
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
        </>
      ) : (
        noNotes
      )}
    </ErrorBoundary>
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>myScribe - Notes to Prose</Modal.Header>
      <Modal.Body>{scribe ? body : <DisabledAlert />}</Modal.Body>
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
