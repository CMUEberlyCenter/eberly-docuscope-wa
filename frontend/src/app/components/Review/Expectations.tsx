import { FC, HTMLProps, useContext, useEffect, useId, useState } from "react";
import { Accordion, AccordionItemProps, AccordionProps } from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { Translation, useTranslation } from "react-i18next";
import {
  ExpectationsData,
  isExpectationsData,
} from "../../../lib/ReviewResponse";
import { Rule } from "../../../lib/WritingTask";
import AllExpectationsIcon from "../../assets/icons/check_all_expectations_icon.svg?react";
import { useExpectationsData } from "../../service/review.service";
import { useWritingTask } from "../../service/writing-task.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import "../AllExpectations/AllExpectations.scss";
import { Loading } from "../Loading/Loading";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { FadeContent } from "../FadeContent/FadeContent";

/** Test if the suggestion is the "none" fail state in the LLM response. */
const isNone = (suggestion: string): boolean =>
  suggestion.match(/^none/i) !== null;

export const ExpectationsTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        <AllExpectationsIcon />
        {t("expectations.title")}
      </span>
    )}
  </Translation>
);

type ExpectationProps = AccordionItemProps & { rule: Rule };
const ExpectationRule: FC<ExpectationProps> = ({ rule, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const expectations = useExpectationsData();
  const { t } = useTranslation("expectations");
  const id = useId();
  const [expectation, setExpectation] = useState<ExpectationsData | null>(null);
  useEffect(() => {
    setExpectation(expectations?.get(rule.name) ?? null);
  }, [expectations, rule]);

  return (
    <Accordion.Item {...props}>
      {isExpectationsData(expectation) &&
      isNone(expectation.response.suggestions) ? (
        <div className="fake-accordion-button">
          <div className="flex-grow-1">{expectation.expectation}</div>
          <AlertIcon message={t("warning")} show />
        </div>
      ) : null}
      {isExpectationsData(expectation) &&
      !isNone(expectation.response.suggestions) ? (
        <>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">{expectation.expectation}</div>
            <AlertIcon
              message={t("no_sentences")}
              show={expectation.response.sentences.length === 0}
            />
          </Accordion.Header>
          <Accordion.Body
            onEntered={() =>
              isExpectationsData(expectation)
                ? dispatch({
                    sentences: [expectation.response.sentences],
                    type: "set",
                  })
                : dispatch({ type: "unset" })
            }
            onExit={() => dispatch({ type: "unset" })}
          >
            <h6>{t("suggestions")}</h6>
            <p key={`${id}-suggestion`}>
              {isExpectationsData(expectation) &&
                expectation.response.suggestions}
            </p>
          </Accordion.Body>
        </>
      ) : null}
      {!isExpectationsData(expectation) ||
      !expectations?.has(expectation.expectation) ? (
        <div className="fake-accordion-button">
          <div className="flex-grow-1">{rule.name}</div>
          <LoadingSmall />
        </div>
      ) : null}
    </Accordion.Item>
  );
};

type ExpectationRulesProps = AccordionProps & { rule: Rule };
/** Component for rendering individual expectation rules. */
const ExpectationRules: FC<ExpectationRulesProps> = ({
  rule,
  className,
  ...props
}) => {
  const id = useId();

  return (
    <article className={className}>
      <h5 className="mb-0">{rule.name}</h5>
      <Accordion {...props} className="mb-3">
        {rule.children.map((rule, j) => (
          <ExpectationRule
            rule={rule}
            key={`${id}-expectation-${j}`}
            eventKey={`${id}-expectation-${j}`}
          />
        ))}
      </Accordion>
    </article>
  );
};

export const Expectations: FC = () => {
  const { t } = useTranslation("review");
  const { t: ti } = useTranslation("instructions");
  const writingTask = useWritingTask();
  // const [expectations, setExpectations] = useState<Rule[]>([]);
  // useEffect(() => {
  //   setExpectations(getExpectations(writingTask))
  // }, [writingTask]);
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("expectations.title")}</h4>
        <FadeContent htmlContent={ti("expectations")} />
        {!writingTask ? (
          <Loading />
        ) : (
          <div className="container-fluid overflow-auto position-relative flex-grow-1">
            {writingTask?.rules.rules.map((rule, i) => (
              <ExpectationRules
                key={`rule-${i}`}
                rule={rule}
                onSelect={onSelect}
                activeKey={current}
              />
            ))}
          </div>
        )}
      </div>
    </ReviewReset>
  );
};
