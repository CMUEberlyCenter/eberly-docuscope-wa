import { Subscribe } from "@react-rxjs/core";
import React, { Suspense } from "react";
import { Alert, Card, Modal, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import {
  topicsAudit$,
  topicsAuditText$,
  useScribe,
  useTopicsAudit,
  useTopicsAuditText,
} from "../../../service/scribe.service";
import { DisabledAlert } from "../DisabledAlert";

const NoText = () => (
  <Alert variant="warning">There is no text to analyze.</Alert>
);

type AuditProps = {
  show: boolean;
  onHide: () => void;
};
export const TopicsAudit: React.FC<AuditProps> = ({
  show = false,
  onHide,
}: AuditProps) => {
  const scribe = useScribe();
  const text = useTopicsAuditText();
  const audit = useTopicsAudit();

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>myScribe - Topics</Modal.Header>
      <Modal.Body>
        {scribe ? (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">Topics Audit is unavailable.</Alert>
            }
          >
            {text.trim() ? (
              <>
                <Card as="section">
                  <Card.Title>Original Text</Card.Title>
                  <Card.Text as="div">
                    <Subscribe source$={topicsAuditText$} fallback={<NoText />}>
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
                    <Card.Title>Topics</Card.Title>
                    <Card.Text as="div">
                      <Subscribe
                        source$={topicsAudit$}
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
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: audit.comment,
                                }}
                              />
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
