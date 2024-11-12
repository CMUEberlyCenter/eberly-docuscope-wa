import { FC, useContext, useEffect, useId, useState } from "react";
import { Accordion, AccordionProps, Alert, Nav, Navbar } from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { isAllExpectationsData } from "../../../lib/ReviewResponse";
import { Rule } from "../../../lib/WritingTask";
import { isReview } from "../../../server/model/review";
import AllExpectationsIcon from "../../assets/icons/check_all_expectations_icon.svg?react";
import {
  useAllExpectationsAnalysis,
  useExpectations,
} from "../../service/expectations.service";
import { useWritingTask } from "../../service/writing-task.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Legal } from "../Legal/Legal";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { Logo } from "../Logo/Logo";
import { ReviewDispatchContext, ReviewProvider } from "../Review/ReviewContext";
import { UserTextView } from "../UserTextView/UserTextView";
import "./AllExpectations.scss";

/** Test if the suggestion is the "none" fail state in the LLM response. */
const isNone = (suggestion: string): boolean =>
  suggestion.match(/^none/i) !== null;

type ExpectationRuleProps = AccordionProps & { rule: Rule };
/** Component for rendering individual expectation rules. */
const ExpectationRule: FC<ExpectationRuleProps> = ({
  rule,
  className,
  ...props
}) => {
  const dispatch = useContext(ReviewDispatchContext);
  const expectations = useAllExpectationsAnalysis();
  const { t } = useTranslation("expectations");
  const id = useId();

  return (
    <article className={className}>
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
              isNone(expectation.response.suggestions) ? (
                <div className="fake-accordion-button">
                  <div className="flex-grow-1">{expectation.expectation}</div>
                  <AlertIcon message={t("warning")} show />
                </div>
              ) : null}
              {isAllExpectationsData(expectation) &&
              !isNone(expectation.response.suggestions) ? (
                <>
                  <Accordion.Header>
                    <div className="flex-grow-1">{expectation.expectation}</div>
                    <AlertIcon
                      message={t("no_sentences")}
                      show={expectation.response.sentences.length === 0}
                    />
                  </Accordion.Header>
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
          <div className="container-fluid overflow-auto position-relative flex-grow-1">
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
          <Legal />
        </aside>
      </Split>
    </ReviewProvider>
  );
};
