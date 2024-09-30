import { FC, useContext, useEffect, useId, useState } from "react";
import {
  Accordion,
  AccordionProps,
  Alert,
  Container,
  Nav,
  Navbar,
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
      <h5 className="mb-0">{rule.name}</h5>
      <Accordion {...props} className="mb-3">
        {rule.children
          .map(({ name }) => expectations?.get(name) ?? { expectation: name })
          .map((expectation, j) => (
            <Accordion.Item
              key={`${id}-expectation-${j}`}
              eventKey={`${id}-expectation-${j}`}
            >
              {isAllExpectationsData(expectation) &&
              expectation.response.suggestions.toLowerCase().startsWith("none") ? (
                <div className="fake-accordion-button">
                  <div className="flex-grow-1">{expectation.expectation}</div>
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
              {isAllExpectationsData(expectation) &&
              expectation.response.suggestions !== "none." ? (
                <>
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
                </>
              ) : null}
              {!isAllExpectationsData(expectation) ||
              !expectations?.has(expectation.expectation) ? (
                <div className="fake-accordion-button">
                  <div className="flex-grow-1">{expectation.expectation}</div>
                  <LoadingSmall />
                </div>
              ) : null}
            </Accordion.Item>
          ))}
      </Accordion>
    </article>
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
        className="container-fluid h-100 w-100 d-flex flex-row align-items-stretch"
        sizes={[60, 40]}
        minSize={[400, 320]}
        expandToMin={true}
      >
        <UserTextView prose={prose} className="my-1" />
        <aside className="my-1 border rounded bg-light d-flex flex-column">
          <header>
            <Navbar className="border-bottom py-0 mb-1 mt-0 d-flex align-items-baseline justify-content-between">
              <Nav defaultActiveKey={"generate"}>
                <Nav.Item className="active fw-bolder text-primary ms-3">
                  {tt("tool.tab.generate")}
                </Nav.Item>
              </Nav>
              <Navbar.Brand>
                <Logo />
              </Navbar.Brand>
            </Navbar>
            <div className="container-fluid text-primary mb-2 border-bottom py-2">
              <AllExpectationsIcon /> {t("title")}
            </div>
          </header>
          <div className="container-fluid overflow-auto position-relative flex-grow-1 ">
            {/* Assumes strict two level writing tasks... */}
            {writingTask?.rules.rules.map((rule, i) => (
              <ExpectationRule
                key={`rule-${i}`}
                rule={rule}
                onSelect={onSelect}
                activeKey={current}
              />
            )) ?? <Alert variant="warning">{t("error.no_task")}</Alert>}
          </div>
          {writingTask && (
            <Container as={"footer"} className="border-top py-2">
              <TaskViewerButton />
            </Container>
          )}
        </aside>
      </Split>
    </ReviewProvider>
  );
};
