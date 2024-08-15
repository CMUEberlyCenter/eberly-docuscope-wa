import { faArrowUpRightFromSquare, faListCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { FC, useEffect, useState } from "react";
import {
  Accordion,
  Alert,
  Button,
  Card,
  Container,
  Nav,
  Navbar,
  Placeholder,
  Spinner
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { isAllExpectationsData } from "../../../lib/ReviewResponse";
import { isReview } from "../../../server/model/review";
import {
  useAllExpectationsAnalysis,
  useExpectations,
} from "../../service/expectations.service";
import { useWritingTask } from "../../service/writing-task.service";
import { Logo } from "../Logo/Logo";
import TaskViewer from "../Review/TaskViewer";
import { UserTextHeader } from "../UserTextHeader/UserTextHeader";

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
      <Card as={'main'}>
        <UserTextHeader title={writingTask?.info.name} />
        <Card.Body>
          {prose ? (
            <div
              className="p-2 flex-grow-1 overflow-auto"
              dangerouslySetInnerHTML={{ __html: prose }}
            />
          ) : (
            <Placeholder />
          )}
        </Card.Body>
      </Card>
        <Card as={'aside'}>
          <Card.Header>
            <Navbar>
              <Container>
                <Nav defaultActiveKey={"generate"} variant="tabs">
                  <Nav.Item>
                    <Nav.Link eventKey="generate">
                      {tt("tool.tab.generate")}
                    </Nav.Link>
                  </Nav.Item>
                  <Button variant="link" disabled>
                    {tt("tool.tab.review")}
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ms-1" />
                  </Button>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="refine"
                      disabled
                    >
                      {tt("tool.tab.refine")}
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                <Navbar.Brand>
                  <Logo />
                </Navbar.Brand>
              </Container>
            </Navbar>
            <Card.Title className="text-dark text-center">
              <FontAwesomeIcon icon={faListCheck} />{" "}
              {t("title")}
            </Card.Title>
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
                              {/* {isAllExpectationsData(expectation) &&
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
                                )} */ /* Sentences should not be displayed, used for highlighting. */}
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
    </Split>
  );
};
