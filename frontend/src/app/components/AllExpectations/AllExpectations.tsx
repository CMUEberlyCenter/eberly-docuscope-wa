import { FC, useContext, useEffect, useId, useState } from "react";
import {
  Accordion,
  AccordionProps,
  Alert,
  Card,
  Container
} from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { isAllExpectationsData } from "../../../lib/ReviewResponse";
import { Rule } from "../../../lib/WritingTask";
import { isReview } from "../../../server/model/review";
import AttentionIcon from "../../assets/icons/attention_icon.svg?react";
import AllExpectationsIcon from "../../assets/icons/check_all_expectations_icon.svg?react";
import {
  useAllExpectationsAnalysis,
  useExpectations,
} from "../../service/expectations.service";
import { useWritingTask } from "../../service/writing-task.service";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { Logo } from "../Logo/Logo";
import { ReviewDispatchContext, ReviewProvider } from "../Review/ReviewContext";
import { TaskViewerButton } from "../TaskViewer/TaskViewer";
import { UserTextView } from "../UserTextView/UserTextView";
import "./AllExpectations.scss";

type ExpectationRuleProps = AccordionProps & { rule: Rule };
/** Component for rendering individual expectation rules. */
const ExpectationRule: FC<ExpectationRuleProps> = ({ rule, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const expectations = useAllExpectationsAnalysis();
  const { t } = useTranslation("expectations");
  const id = useId();

  return (
    <article>
      <h5>{rule.name}</h5>
      <Accordion {...props}>
        {rule.children
          .map(({ name }) => expectations?.get(name) ?? { expectation: name })
          .map((expectation, j) => (
            <Accordion.Item
              key={`${id}-expectation-${j}`}
              eventKey={`${id}-expectation-${j}`}
            >
              {isAllExpectationsData(expectation) && expectation.response.suggestions === "none." ? (
                <div className="fake-accordion-button">
                  <div className="flex-grow-1 p">{expectation.expectation}</div>
                  <div
                    className="attention-icon text-warning"
                    title={t("warning")}
                  >
                    <AttentionIcon />
                    <span className="sr-only visually-hidden">
                      {t("warning")}
                    </span>
                  </div>
                </div>
              ) : null}
              {isAllExpectationsData(expectation) && expectation.response.suggestions !== "none." ? (<>
                <Accordion.Header>{expectation.expectation}</Accordion.Header>
                <Accordion.Body
                  onEntering={() =>
                    isAllExpectationsData(expectation)
                      ? dispatch({
                        sentences: expectation.response.sentences,
                        type: "set",
                      })
                      : dispatch({ type: "unset" })
                  }
                  onExiting={() => dispatch({ type: "unset" })}
                >
                  <h6>{t("suggestions")}</h6>
                  <p key={`${id}-suggestion-${j}`}>
                    {isAllExpectationsData(expectation) &&
                      expectation.response.suggestions}
                  </p>
                </Accordion.Body>
              </>) : null}
              {!isAllExpectationsData(expectation) || !(expectations?.has(expectation.expectation)) ? (
                <div className="fake-accordion-button">
                  <div className="flex-grow-1 p">{expectation.expectation}</div>
                  <LoadingSmall />
                </div>
              ) : null}
            </Accordion.Item>))}
      </Accordion>
    </article >
  );
};

/** Render the user's writing and each exectation with its generated evaluation. */
export const AllExpectations: FC = () => {
  const { t } = useTranslation("expectations");
  const { t: tt } = useTranslation();
  const review = useExpectations();
  const writingTask = useWritingTask();
  const [prose, setProse] = useState("");
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);

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
    <ReviewProvider>
      <Split
        className="container-fluid h-100 w-100 d-flex flex-row"
        sizes={[60, 40]}
        minSize={[400, 320]}
        expandToMin={true}
      >
        <UserTextView prose={prose} />
        <Card as={"aside"}>
          <Card.Header className="px-0">
            <Container className="d-flex justify-content-between align-items-baseline border-bottom mb-2">
              <span className="text-dark">{tt("tool.tab.generate")}</span>
              <Logo />
            </Container>
            {/* <Navbar>
              <Container>
                <Nav defaultActiveKey={"generate"} variant="underline">
                  <Nav.Item>
                    <Nav.Link eventKey="generate">
                      {tt("tool.tab.generate")}
                    </Nav.Link>
                  </Nav.Item>
                  <Button variant="link" disabled>
                    {tt("tool.tab.review")}
                    <FontAwesomeIcon
                      icon={faArrowUpRightFromSquare}
                      className="ms-1"
                    />
                  </Button>
                  <Nav.Item>
                    <Nav.Link eventKey="refine" disabled>
                      {tt("tool.tab.refine")}
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                <Navbar.Brand>
                  <Logo />
                </Navbar.Brand>
              </Container>
            </Navbar> */}
            <Card.Title className="text-dark mx-1">
              <AllExpectationsIcon /> {t("title")}
            </Card.Title>
          </Card.Header>
          <Card.Body className="h-100 overflow-auto position-relative bg-light">
            {/* Assumes strict two level writing tasks... */}
            {writingTask?.rules.rules.map((rule, i) => (
              <ExpectationRule
                key={`rule-${i}`}
                rule={rule}
                onSelect={onSelect}
                activeKey={current}
              />
            )) ?? <Alert variant="warning">{t("error.no_task")}</Alert>}
          </Card.Body>
          <Card.Footer>
            {writingTask && (
              <TaskViewerButton/>
            )}
          </Card.Footer>
        </Card>
      </Split>
    </ReviewProvider>
  );
};
