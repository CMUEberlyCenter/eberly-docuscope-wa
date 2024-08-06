import React, { FC, useEffect, useState } from "react";
import {
  Accordion,
  Alert,
  Button,
  Card,
  Navbar,
  Placeholder,
  Spinner,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { isReview } from "../../../server/model/review";
import logo from "../../assets/logo.svg";
import { useWritingTask } from "../../service/writing-task.service";
import TaskViewer from "../Review/TaskViewer";
import {
  useAllExpectationsAnalysis,
  useExpectations,
} from "../../service/expectations.service";
import { isAllExpectationsData } from "../../../lib/ReviewResponse";

export const AllExpectations: FC = () => {
  const { t } = useTranslation("expectations");
  const { t: tt } = useTranslation();
  const review = useExpectations();
  const [showWritingTask, setShowWritingTask] = useState(false);
  const writingTask = useWritingTask();
  const [prose, setProse] = useState("");
  const expectations = useAllExpectationsAnalysis();

  useEffect(() => {
    window.document.title = t("document.title");
  }, [t]);
  useEffect(() => {
    if (isReview(review)) {
      setProse(review.document);
    } else {
      setProse("");
    }
  }, [review]);

  return (
    <Split
      className="container-fluid h-100 w-100 d-flex flex-row"
      sizes={[60, 40]}
      minSize={[400, 320]}
      expandToMin={true}
    >
      <main className="d-flex overflow-none h-100 flex-column">
        <Navbar>
          <div className="ms-3">
            <h6 className="mb-0 text-muted">{tt("editor.menu.task")}</h6>
            <h5>{writingTask?.info.name ?? tt("editor.menu.no_task")}</h5>
          </div>
        </Navbar>
        {prose ? (
          <div
            className="p-2 flex-grow-1 overflow-auto"
            dangerouslySetInnerHTML={{ __html: prose }}
          />
        ) : (
          <Placeholder />
        )}
      </main>
      <aside>
        <Card className="h-100 w-100">
          <Card.Header>
            <div className="d-flex justify-content-between">
              <Card.Title>{t("title")}</Card.Title>
              <img
                style={{ height: "1.75em" }}
                src={logo}
                alt={tt("document.title")}
              />
            </div>
          </Card.Header>
          <Card.Body className="h-100 overflow-auto position-relative">
            {/* Assumes strict two level writing tasks... */}
            {writingTask?.rules.rules.map((rule, i) => (
              <React.Fragment key={`rule-${i}`}>
                <h4>{rule.name}</h4>
                <Accordion alwaysOpen>
                  {rule.children
                    .map(
                      ({ name }) =>
                        expectations?.get(name) ?? { expectation: name }
                    )
                    .map((expectation, j) => (
                      <Accordion.Item
                        key={`expectation-${i}-${j}`}
                        eventKey={`expectation-${i}-${j}`}
                      >
                        <Accordion.Header>
                          {expectation.expectation}
                        </Accordion.Header>
                        <Accordion.Body>
                          {expectations?.has(expectation.expectation) ? (
                            <>
                              {isAllExpectationsData(expectation) &&
                                expectation.response.sentences.length > 0 && (
                                  <>
                                    <h6>{t("sentences")}</h6>
                                    {isAllExpectationsData(expectation) &&
                                      expectation.response.sentences.map(
                                        (sentence, k) => (
                                          <p key={`sentence-${i}-${j}-${k}`}>
                                            {sentence}
                                          </p>
                                        )
                                      )}
                                  </>
                                )}
                              <h6>{t("suggestions")}</h6>
                              <p key={`suggestion-${i}-${j}`}>
                                {isAllExpectationsData(expectation) &&
                                  expectation.response.suggestions}
                              </p>
                            </>
                          ) : (
                            <Spinner />
                          )}
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                </Accordion>
              </React.Fragment>
            )) ?? <Alert variant="warning">{t("error.no_task")}</Alert>}
          </Card.Body>
          <Card.Footer>
            {writingTask && (
              <Button
                variant="outline-dark"
                onClick={() => setShowWritingTask(!showWritingTask)}
              >
                {tt("tool.button.view.title")}
              </Button>
            )}
          </Card.Footer>
        </Card>
        <TaskViewer
          show={showWritingTask}
          onHide={() => setShowWritingTask(false)}
        />
      </aside>
    </Split>
  );
};
