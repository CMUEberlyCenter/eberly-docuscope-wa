import { Subscribe } from "@react-rxjs/core";
import { Suspense } from "react";
import { Alert, Card, ListGroup, Modal, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useEditorState } from "../../service/editor-state.service";
import { assessment$, expectation$, useAssess, useAssessAvailable, useAssessment, useExpectation, useScribe } from "../../service/scribe.service";

interface AssessExpectationsProps {
  show: boolean;
  onHide: () => void;
}

const DisabledAlert = () => (
  <Alert variant="warning">
    The myScribe feature is currently disabled. Click &apos;myScribe&apos; in
    the &apos;Help&apos; menu to enable it.
  </Alert>)
const UnavailableAlert = () => (
  <Alert variant="danger">
    Assess Expectations is unavailable.
  </Alert>
)

const Rating = ({value}: {value:number}) => {
  // const scaled = value * 4;
  const solid = (val: number, threshold: number) => val > threshold ? 'fa-solid' : 'fa-regular';
  const colors = [
    {min: 0.99, color: '#00a76b' },
    {min: 0.75, color: '#a1cd3a' },
    {min: 0.5, color: '#eabd21' },
    {min: 0.25, color: '#f58020' },
    {min: 0.0, color: '#d12026'}
  ];
  const color = colors.find(({min}) => value > min)?.color ?? colors.at(-1)?.color;
  return (
    <span className="d-flex" style={{color}}>
    <i className={`fa-star ${solid(value, 0.0)}`}></i>
    <i className={`fa-star ${solid(value, 0.25)}`}></i>
    <i className={`fa-star ${solid(value, 0.50)}`}></i>
    <i className={`fa-star ${solid(value, 0.75)}`}></i>
    <i className={`fa-star ${solid(value, 1.0)}`}></i>
    </span>
  )
}


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
      {expectation ? "" : <p>Select an expectation question in the Expectations tool.</p>}
      {selected ? "" : <p>Select some text in the editor.</p>}
    </Alert>
  )
  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        myScribe - Assess Expectations
      </Modal.Header>
      <Modal.Body>
        {!scribe ? <DisabledAlert /> :
          <ErrorBoundary
            fallback={<UnavailableAlert />}>
            {!sufficient ? insufficient :
              <>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Expectation</Card.Title>
                    <Card.Subtitle>Selected question from Expectations Tool</Card.Subtitle>
                    <Card.Text as="div">
                      <Subscribe source$={expectation$} fallback={<Alert variant="warning">No selected question from the Expectation tool.</Alert>}>
                        <ListGroup as={'dl'}>
                          <ListGroup.Item as={'dt'}>{expectation?.name}</ListGroup.Item>
                          <ListGroup.Item as={'dd'} dangerouslySetInnerHTML={{ __html: expectation?.description ?? '' }}></ListGroup.Item>
                        </ListGroup>
                      </Subscribe>
                    </Card.Text>
                  </Card.Body>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Selected Text</Card.Title>
                    <Card.Text as="div">
                      <article className="m-2 border border-dark rounded p-1"
                        style={{ minHeight: "3em" }}
                      >
                        {selected}
                      </article>
                    </Card.Text>
                  </Card.Body>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Assessment</Card.Title>
                    <Card.Subtitle>myScribe's assessment of how well the selected text addresses the question.</Card.Subtitle>
                    <Card.Text as="div">
                      <Subscribe source$={assessment$} fallback={<Alert variant="info">Preprocessing...</Alert>}>
                        <Suspense fallback={<Alert variant="info">Processing...</Alert>}>
                          <article className="border border-dark rounded m-2 p-1">
                            {typeof assessment !== "object" ? (
                              <Spinner
                                animation="border"
                                role="status"
                                variant="info"
                                className="mx-auto">
                                <span className="visually-hidden">
                                  Processing...
                                </span>
                              </Spinner>
                            ) : <>
                            <Rating value={assessment.rating}/>
                            {assessment.explanation}
                            </>
                            }
                          </article>
                        </Suspense>
                      </Subscribe>
                    </Card.Text>
                  </Card.Body>
                </Card>
              </>
            }
          </ErrorBoundary>}
      </Modal.Body>
    </Modal>
  )
}