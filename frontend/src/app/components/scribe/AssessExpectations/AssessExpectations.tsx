import { Subscribe } from "@react-rxjs/core";
import { Suspense } from "react";
import { Alert, Card, ListGroup, Modal, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useEditorState } from "../../../service/editor-state.service";
import {
  assessment$,
  expectation$,
  useAssess,
  useAssessAvailable,
  useAssessment,
  useExpectation,
  useScribe,
} from "../../../service/scribe.service";
import { DisabledAlert } from "../DisabledAlert";
import "./AssessExpectations.scss";
import { Rating } from "../../Rating/Rating";

interface AssessExpectationsProps {
  show: boolean;
  onHide: () => void;
}

const UnavailableAlert = () => (
  <Alert variant="danger">Assess Expectations is unavailable.</Alert>
);

export const AssessExpectations = ({
  show = false,
  onHide,
}: AssessExpectationsProps) => {
  const scribe = useScribe();
  const editing = useEditorState();
  const sufficient = useAssessAvailable();
  const expectation = useExpectation();
  const selected = useAssess();
  const assessment = useAssessment();

  const insufficient = (
    <Alert variant="warning">
      {editing ? "" : <p>Set the Edit Mode to unlocked.</p>}
      {expectation ? (
        ""
      ) : (
        <p>Select an expectation question in the Expectations tool.</p>
      )}
      {selected ? "" : <p>Select some text in the editor.</p>}
    </Alert>
  );
  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>myScribe - Assess Expectations</Modal.Header>
      <Modal.Body>
        {!scribe ? (
          <DisabledAlert />
        ) : (
          <ErrorBoundary fallback={<UnavailableAlert />}>
            {!sufficient ? (
              insufficient
            ) : (
              <>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Expectation</Card.Title>
                    <Card.Subtitle>
                      Selected question from Expectations Tool
                    </Card.Subtitle>
                    <Card.Text as="div">
                      <Subscribe
                        source$={expectation$}
                        fallback={
                          <Alert variant="warning">
                            No selected question from the Expectation tool.
                          </Alert>
                        }
                      >
                        <ListGroup as={"dl"}>
                          <ListGroup.Item as={"dt"}>
                            {expectation?.name}
                          </ListGroup.Item>
                          <ListGroup.Item
                            as={"dd"}
                            dangerouslySetInnerHTML={{
                              __html: expectation?.description ?? "",
                            }}
                            style={{ maxHeight: "3em" }}
                            className="overflow-auto"
                          ></ListGroup.Item>
                        </ListGroup>
                      </Subscribe>
                    </Card.Text>
                  </Card.Body>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Selected Text</Card.Title>
                    <Card.Text as="div">
                      <article
                        className="m-2 border border-dark rounded p-1 overflow-auto"
                        style={{ minHeight: "3em", maxHeight: "4em" }}
                      >
                        {selected}
                      </article>
                    </Card.Text>
                  </Card.Body>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Assessment</Card.Title>
                    <Card.Subtitle>
                      myScribe&apos;s assessment of how well the selected text
                      addresses the question.
                    </Card.Subtitle>
                    <Card.Text as="div">
                      <Subscribe
                        source$={assessment$}
                        fallback={
                          <Alert variant="info">Preprocessing...</Alert>
                        }
                      >
                        <Suspense
                          fallback={<Alert variant="info">Processing...</Alert>}
                        >
                          <article className="border border-dark rounded m-2 p-1">
                            {typeof assessment !== "object" ? (
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
                                <Rating value={assessment.rating} />
                                {assessment.explanation}
                              </>
                            )}
                          </article>
                        </Suspense>
                      </Subscribe>
                    </Card.Text>
                  </Card.Body>
                </Card>
              </>
            )}
          </ErrorBoundary>
        )}
      </Modal.Body>
    </Modal>
  );
};
