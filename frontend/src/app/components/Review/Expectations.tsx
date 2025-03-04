import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, HTMLProps, useContext, useEffect, useId, useState } from "react";
import {
  Accordion,
  AccordionItemProps,
  AccordionProps,
  ButtonProps,
} from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData, isExpectationsData } from "../../../lib/ReviewResponse";
import { Rule } from "../../../lib/WritingTask";
import Icon from "../../assets/icons/expectations_icon.svg?react";
import {
  OptionalExpectations,
  useExpectationsData,
} from "../../service/review.service";
import { useWritingTask } from "../../service/writing-task.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import style from "./Expectations.module.scss";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

/** Test if the suggestion is the "none" fail state in the LLM response. */
const isNone = (suggestion: string): boolean =>
  suggestion.match(/^none/i) !== null;

export const ExpectationsButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("expectations.title")}
      tooltip={it("expectations_scope_note")}
      icon={<Icon />}
    />
  );
};

export const ExpectationsTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        <Icon />
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
  const [expectation, setExpectation] = useState<OptionalExpectations>(null);
  useEffect(() => {
    setExpectation(expectations?.get(rule.name) ?? null);
  }, [expectations, rule]);

  return (
    <Accordion.Item {...props}>
      {isExpectationsData(expectation) &&
      isNone(expectation.response.suggestions) ? (
        <div className={style["fake-accordion-button"]}>
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
            {isExpectationsData(expectation) &&
            expectation.response.assessment ? (
              <div>
                <h6 className="d-inline">{t("assessment")}</h6>{" "}
                <span key={`${id}-assessment`}>
                  {expectation.response.assessment}
                </span>
              </div>
            ) : null}
            <div>
              <h6 className="d-inline">{t("suggestions")}</h6>{" "}
              <span key={`${id}-suggestion`}>
                {isExpectationsData(expectation) &&
                  expectation.response.suggestions}
              </span>
            </div>
          </Accordion.Body>
        </>
      ) : null}
      {!expectation ? (
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{rule.name}</div>
          <LoadingSmall />
        </div>
      ) : null}
      {isErrorData(expectation) ? (
        <>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">{expectation.expectation}</div>
            <FontAwesomeIcon
              icon={faCircleExclamation}
              className="text-danger"
            />
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "unset" })}
            onExit={() => dispatch({ type: "unset" })}
          >
            <ReviewErrorData data={expectation} />
          </Accordion.Body>
        </>
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
    <section className={className}>
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
    </section>
  );
};

export const Expectations: FC = () => {
  const { t } = useTranslation("review");
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
      <article className="container-fluid overflow-auto d-flex flex-column flex-grow-1">
        <ToolHeader
          title={t("expectations.title")}
          instructionsKey="expectations"
        />
        {!writingTask ? (
          <Loading />
        ) : (
          <section className="container-fluid overflow-auto position-relative flex-grow-1">
            {writingTask?.rules.rules.map((rule, i) => (
              <ExpectationRules
                key={`rule-${i}`}
                rule={rule}
                onSelect={onSelect}
                activeKey={current}
              />
            ))}
          </section>
        )}
      </article>
    </ReviewReset>
  );
};
