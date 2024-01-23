import { Subscribe } from "@react-rxjs/core";
import { Suspense } from "react";
import { Alert, Card, ListGroup, Modal, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useEditorState } from "../../service/editor-state.service";
import {
  assessment$,
  expectation$,
  useAssess,
  useAssessAvailable,
  useAssessment,
  useExpectation,
  useScribe,
} from "../../service/scribe.service";
import "./AssessExpectations.scss";

interface AssessExpectationsProps {
  show: boolean;
  onHide: () => void;
}

const DisabledAlert = () => (
  <Alert variant="warning">
    The myScribe feature is currently disabled. Click &apos;myScribe&apos; in
    the &apos;Help&apos; menu to enable it.
  </Alert>
);
const UnavailableAlert = () => (
  <Alert variant="danger">Assess Expectations is unavailable.</Alert>
);

const Rating = ({ value }: { value: number }) => {
  const scale = 5;
  const rating = value * scale;
  const fullSymbols = Math.floor(rating);
  return (
    <div className="assess-rating" title={`${rating.toFixed(1)}`}>
      <div className={`d-flex rating-${fullSymbols}`}>
        {new Array(scale).fill(0).map((_v, i) => {
          let percent = 0;
          if (i - fullSymbols < 0) {
            percent = 100;
          } else if (i - fullSymbols === 0) {
            percent = (rating - i) * 100;
          } else {
            percent = 0;
          }
          return (
            <span
              key={`assess-expectations-rating-${i}`}
              className="position-relative"
            >
              <i
                className={`fa-regular fa-star ${percent < 100 ? "visible" : "invisible"}`}
              ></i>
              <i
                className="fa-solid fa-star d-inline-block position-absolute overflow-hidden"
                style={{ top: 0, left: 0, width: `${percent}%` }}
              ></i>
            </span>
          );
        })}
      </div>
      <span className="visually-hidden ms-2">{rating}</span>
    </div>
  );
};
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
                                {/* <div
                                  className="assess-rating"
                                  title={`${(assessment.rating * 5).toFixed(1)}`}
                                >
                                  <Rating
                                    readOnly={true}
                                    initialRating={assessment.rating * 5}
                                    emptySymbol="fa-star fa-regular"
                                    fullSymbol="fa-star fa-solid"
                                    className={`rating-${Math.floor(assessment.rating * 5)}`}
                                  />
                                  <span className="visually-hidden ms-2">
                                    {assessment.rating * 5}
                                  </span>
                                </div> */}
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
