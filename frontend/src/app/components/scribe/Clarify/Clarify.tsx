import { faClipboard, faFileImport } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Subscribe } from "@react-rxjs/core";
import { ReactElement, Suspense, useEffect, useState } from "react";
import { Alert, Button, ButtonGroup, ButtonToolbar, Card, Modal, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Descendant, Text } from "slate";
import { useEditorState } from "../../../service/editor-state.service";
import { SelectedNotesProse, clarified$, clarify$, useClarified, useClarify, useScribe } from "../../../service/scribe.service";
import { DisabledAlert } from "../DisabledAlert";

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

type Fixes = {
  revision: string;
  "clean-revision": string;
  explanation: string;
}

type ClarifyProps = {
  show: boolean;
  onHide: () => void;
  insert: (notes: SelectedNotesProse) => void;
}

export const Clarify = ({
  show = false,
  onHide,
  insert = () => undefined
}: ClarifyProps) => {
  const scribe = useScribe();
  const editing = useEditorState();
  const selection = useClarify();
  const response = useClarified();

  const [edits, setEdits] = useState('');
  const [clean, setClean] = useState('');
  const [explanation, setExplanation] = useState('');

  const copy = () => {
    navigator.clipboard.writeText(clean);
  };

  useEffect(() => {
    if (!response || !response.prose) {
      setEdits('');
      setClean('');
      setExplanation('');
    } else {
      const fixes: Fixes = JSON.parse(response.prose);
      setEdits(fixes.revision);
      setClean(fixes["clean-revision"]);
      setExplanation(fixes.explanation);
    }
  }, [response]);

  const noNotes = (
    <Alert variant="warning">
      {editing ? "" : <p>Set the Edit Mode to unlocked.</p>}
      <p>Select some text to submit in the text editor.</p>
    </Alert>
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        myScribe - Clarify Text
      </Modal.Header>
      <Modal.Body>
        {scribe ?
         (<ErrorBoundary fallback={<Alert variant="danger">Clarify Tool is unavailable</Alert>}>
          {selection?.text.trim() ? (
            <>
              <Card as="section">
                <Card.Title>Selected Text</Card.Title>
                <Card.Text as="div">
                  <Subscribe source$={clarify$} fallback={noNotes}>
                    <article className="m-2 border border-dark rounded p-1"
                      style={{ minHeight: "3rem" }}>
                      {serialize(selection.fragment)}
                    </article>
                  </Subscribe>
                </Card.Text>
              </Card>
              <Card as="section">
                <Card.Body>
                  <Card.Title>Results</Card.Title>
                  <Card.Subtitle>myScribe&apos;s suggested revisions.</Card.Subtitle>
                  <Card.Text as="div">
                    <Subscribe source$={clarified$}
                      fallback={<Alert variant="info">Preprocessing...</Alert>}>
                      {selection?.text.trim() ? (
                        <Suspense fallback={<Alert variant="info">Processing...</Alert>}>
                          <article className="border border-dark rounded m-2 p-1" style={{ minHeight: "3rem" }}>
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
                              <h4>Edits</h4>
                              <div dangerouslySetInnerHTML={{ __html: edits }}></div>
                              <h4>Results</h4>
                              <div>{clean}</div>
                              <h4>Explanation</h4>
                              <div dangerouslySetInnerHTML={{ __html: explanation }}></div>
                            </>
                        )}
                          </article>
                          <div className="d-flex justify-content-end">
                            <ButtonToolbar>
                              <ButtonGroup>
                                <Button disabled={!response.prose} onClick={copy}>
                                  <FontAwesomeIcon icon={faClipboard} />
                                  <span className="ms-1">Copy to Clipboard</span>
                                </Button>
                                <Button
                                  disabled={!response.prose}
                                  onClick={() => insert({...response, prose: clean})}
                                >
                                  <FontAwesomeIcon icon={faFileImport} />
                                  <span className="ms-1">Insert into Essay</span>
                                </Button>
                              </ButtonGroup>
                            </ButtonToolbar>
                          </div>
                        </Suspense>
                      ) : noNotes }
                    </Subscribe>
                  </Card.Text>
                </Card.Body>
              </Card>
            </>
          ) : (noNotes)}
        </ErrorBoundary>) : <DisabledAlert />}
      </Modal.Body>
    </Modal>
  )
}