import React, { Suspense } from "react";
import {
  logicalFlow$,
  logicalFlowAudit$,
  useLogicalFlow,
  useLogicalFlowAudit,
  useScribe,
} from "../../../service/scribe.service";
import { Alert, Card, Modal, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { DisabledAlert } from "../DisabledAlert";
import { Subscribe } from "@react-rxjs/core";
import { Rating } from "../../Rating/Rating";

const NoText = () => (
  <Alert variant="warning">There is no text to audit.</Alert>
);

type Props = {
  show: boolean;
  onHide: () => void;
};
export const LogicalFlowAudit: React.FC<Props> = ({
  show = false,
  onHide,
}: Props) => {
  const scribe = useScribe();
  const text = useLogicalFlow();
  const audit = useLogicalFlowAudit();

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>myScribe - Logical Flow Audit</Modal.Header>
      <Modal.Body>
        {scribe ? (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">Logical Flow Audit is unavailable.</Alert>
            }
          >
            {text.trim() ? (
              <>
                <Card as="section">
                  <Card.Title>Original Text</Card.Title>
                  <Card.Text as="div">
                    <Subscribe source$={logicalFlow$} fallback={<NoText />}>
                      <article
                        className="m-2 border border-dark rounded p-1 overflow-auto"
                        style={{ minHeight: "3rem", maxHeight: "30vh" }}
                        dangerouslySetInnerHTML={{ __html: text }}
                      ></article>
                    </Subscribe>
                  </Card.Text>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>Review</Card.Title>
                    <Card.Text as="div">
                      <Subscribe
                        source$={logicalFlowAudit$}
                        fallback={
                          <Alert variant="info">Preprocessing...</Alert>
                        }
                      >
                        <Suspense
                          fallback={<Alert variant="info">Processing...</Alert>}
                        >
                          <article
                            className="border border-dark rounded m-2 p-1"
                            style={{ minHeight: "3rem" }}
                          >
                            {typeof audit !== "object" ? (
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
                                {typeof audit.comment === "object" ? (
                                  <>
                                    <Rating value={audit.comment.rating} />
                                    {audit.comment.explanation}
                                  </>
                                ) : (
                                  <Alert>{audit.comment}</Alert>
                                )}
                              </>
                            )}
                          </article>
                        </Suspense>
                      </Subscribe>
                    </Card.Text>
                  </Card.Body>
                </Card>
              </>
            ) : (
              <NoText />
            )}
          </ErrorBoundary>
        ) : (
          <DisabledAlert />
        )}
      </Modal.Body>
    </Modal>
  );
};
