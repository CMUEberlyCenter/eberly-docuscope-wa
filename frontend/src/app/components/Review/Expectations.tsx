import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import {
  type FC,
  type HTMLProps,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  type AccordionItemProps,
  type AccordionProps,
  type ButtonProps,
} from "react-bootstrap";
import type {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { useTranslation } from "react-i18next";
import {
  isErrorData,
  isExpectationsData,
  type ErrorData,
} from "../../../lib/ReviewResponse";
import type { Rule, WritingTask } from "../../../lib/WritingTask";
import Icon from "../../assets/icons/expectations_icon.svg?react";
// import {
//   type OptionalExpectations
// } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { useFileText } from "../FileUpload/FileUploadContext";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import style from "./Expectations.module.scss";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import type { ExpectationData } from "../../lib/ToolResults";

/** Test if the suggestion is the "none" fail state in the LLM response. */
const isNone = (suggestion: string): boolean =>
  suggestion.match(/^none/i) !== null;

/** Button component to use for selecting the Content Expectations tool. */
export const ExpectationsButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("expectations.title")}
      tooltip={t("instructions:expectations_scope_note")}
      icon={<Icon />}
    />
  );
};

// export const ExpectationsTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
//   <Translation ns={"review"}>
//     {(t) => (
//       <span {...props}>
//         <Icon />
//         {t("expectations.title")}
//       </span>
//     )}
//   </Translation>
// );

// function useExpectation(elementRef: Ref<HTMLDivElement>, rule: Rule) {

// }

type ExpectationProps = AccordionItemProps & { rule: Rule };
/** Component for rendering individual expectation rules. */
const ExpectationRule: FC<ExpectationProps> = ({
  eventKey,
  rule,
  ...props
}) => {
  const dispatch = useContext(ReviewDispatchContext);
  const { task } = useWritingTask();
  const document = useFileText();
  const [state, setState] = useState<
    "unset" | "pending" | "fulfilled" | "rejected"
  >("unset");
  const [error, setError] = useState<ErrorData | null>(null);
  // const expectations = useExpectationsData();
  const { t } = useTranslation("expectations");
  const id = useId();
  const [expectation, setExpectation] = useState<ExpectationData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: WritingTask;
      expectation: string;
    }) => {
      const { document, writing_task, expectation } = data;
      setError(null);
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/v2/review/expectation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document, writing_task, expectation }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch expectation");
      }
      return response.json();
    },
    onSuccess: ({ input, data }: { input: string; data: ExpectationData }) => {
      setExpectation(data);
      if (isErrorData(data)) {
        setState("rejected");
        setError(data);
        return;
      }
      setState("fulfilled");
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
    },
    onError: (error) => {
      console.error("Error fetching expectation:", error);
      setState("rejected");
      setExpectation(null);
      dispatch({ type: "unset" });
      setError({
        tool: "expectations",
        error: {
          message:
            error.message || "An error occurred while fetching expectation.",
        },
      });
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    if (!task || !document || !rule || state === "unset") {
      return;
    }
    // setState("pending");
    if (state === "pending") {
      mutation.mutate({
        document,
        writing_task: task,
        expectation: rule.name,
      });
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [task, document, rule, state]);

  return (
    <Accordion.Item eventKey={eventKey} {...props}>
      {state === "unset" ? (
        <div
          className={style["fake-accordion-button"]}
          onClick={() => setState("pending")}
        >
          <div className="flex-grow-1">{rule.name}</div>
          <FontAwesomeIcon icon={faEllipsis} />
        </div>
      ) : null}
      {mutation.isPending || state === "pending" ? (
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{rule.name}</div>
          <LoadingSmall />
        </div>
      ) : null}
      {state === "rejected" ? (
        <>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">{rule.name}</div>
            <FontAwesomeIcon
              icon={faCircleExclamation}
              className="text-danger"
            />
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "unset" })}
            onExit={() => dispatch({ type: "unset" })}
          >
            <ReviewErrorData data={error!} />
          </Accordion.Body>
        </>
      ) : null}
      {state === "fulfilled" &&
      isExpectationsData(expectation) &&
      isNone(expectation.response.suggestion) ? (
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{expectation.expectation}</div>
          <AlertIcon message={t("warning")} show />
        </div>
      ) : null}
      {state === "fulfilled" &&
      isExpectationsData(expectation) &&
      !isNone(expectation.response.suggestion) ? (
        <>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">{expectation.expectation}</div>
            <AlertIcon
              message={t("no_sentences")}
              show={expectation.response.sent_ids.length === 0}
            />
          </Accordion.Header>
          <Accordion.Body
            onEntered={() =>
              isExpectationsData(expectation)
                ? dispatch({
                    sentences: [expectation.response.sent_ids],
                    type: "set",
                  })
                : dispatch({ type: "unset" })
            }
            onExit={() => dispatch({ type: "unset" })}
          >
            <>
              {isExpectationsData(expectation) &&
              expectation.response.assessment ? (
                <div>
                  <h6 className="d-inline">{t("assessment")}</h6>{" "}
                  <span key={`${id}-assessment`}>
                    {expectation.response.assessment}
                  </span>
                </div>
              ) : null}
              {isExpectationsData(expectation) &&
              expectation.response.suggestion ? (
                <div>
                  <h6 className="d-inline">{t("suggestion")}</h6>{" "}
                  <span key={`${id}-suggestion`}>
                    {expectation.response.suggestion}
                  </span>
                </div>
              ) : null}
              {isExpectationsData(expectation) &&
              !expectation.response.suggestion ? (
                <div>
                  <h6 className="d-inline">{t("suggestion")}</h6>{" "}
                  <span key={`${id}-suggestion`}>{t("no_suggestions")}</span>
                </div>
              ) : null}
            </>
          </Accordion.Body>
        </>
      ) : null}
      {/* {!expectation ? (
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{rule.name}</div>
          <LoadingSmall />
        </div>
      ) : null} */}
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

/** Content Expectations tool component. */
export const Expectations: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const { task } = useWritingTask();
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader
          title={t("expectations.title")}
          instructionsKey="expectations"
        />
        {/* <Suspense fallback={<Loading />}>
          {!task ? (
            <Loading />
          ) : ( */}
        {/* TODO null content report, but should not be accessable without task */}
        <section className="container-fluid overflow-auto position-relative flex-grow-1">
          {task?.rules.rules.map((rule, i) => (
            <ExpectationRules
              key={`rule-${i}`}
              rule={rule}
              onSelect={onSelect}
              activeKey={current}
            />
          ))}
        </section>
        {/* )}
        </Suspense> */}
      </article>
    </ReviewReset>
  );
};
