import {
  faCircleExclamation,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import {
  Activity,
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type HTMLProps,
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
  type ExpectationsData,
} from "../../../lib/ReviewResponse";
import type { Rule, WritingTask } from "../../../lib/WritingTask";
import Icon from "../../assets/icons/expectations_icon.svg?react";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { ReviewErrorData } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import style from "./Expectations.module.scss";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";

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

type ExpectationProps = AccordionItemProps & {
  rule: Rule;
  setCurrent?: (key: AccordionEventKey) => void;
};
class ExpectationError extends Error {
  data: ErrorData;
  constructor(data: ErrorData) {
    super(data.error.message);
    this.data = data;
  }
}
/** Component for rendering individual expectation rules. */
const ExpectationRule: FC<ExpectationProps> = ({
  eventKey,
  rule,
  setCurrent,
  ...props
}) => {
  const dispatch = useReviewDispatch();
  const { task } = useWritingTask();
  const [document] = useFileText();
  const [error, setError] = useState<ErrorData | null>(null);
  const { t } = useTranslation("expectations");
  const id = useId();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: WritingTask;
      expectation: string;
    }) => {
      setError(null);
      setCurrent?.(""); // Close any open accordion item
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      const response = await fetch("/api/v2/review/expectation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch expectation");
      }
      return response.json();
    },
    onSuccess: ({ input, data }: { input: string; data: ExpectationsData }) => {
      if (isErrorData(data)) {
        throw new ExpectationError(data);
      }
      dispatch({ type: "update", sentences: input });
      dispatch({
        type: "set",
        sentences: [data.response.sent_ids],
      });
      setCurrent?.(eventKey); // open this accordion item
    },
    onError: (error) => {
      console.error("Error fetching expectation:", error);
      dispatch({ type: "unset" });
      if (error instanceof ExpectationError) {
        setError(error.data);
        return;
      }
      setError({
        tool: "expectations",
        error,
      });
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    return () => {
      // abort ongoing fetch request on component destruction.
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <Accordion.Item eventKey={eventKey} {...props}>
      {mutation.isIdle ? (
        <div
          role="button"
          className={style["fake-accordion-button"]}
          onClick={() => {
            if (document && task && rule)
              mutation.mutate({
                document,
                writing_task: task,
                expectation: rule.name,
              });
          }}
          aria-disabled={!document || !task || !rule}
        >
          <div className="flex-grow-1">{rule.name}</div>
          <FontAwesomeIcon icon={faEllipsis} />
        </div>
      ) : null}
      {mutation.isPending ? (
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{rule.name}</div>
          <LoadingSmall />
        </div>
      ) : null}
      {mutation.isError ? (
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
      {mutation.isSuccess &&
      isExpectationsData(mutation.data?.data) &&
      isNone(mutation.data.data.response.suggestion) ? (
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{mutation.data.data.expectation}</div>
          <AlertIcon message={t("warning")} show={true} />
        </div>
      ) : null}
      {mutation.isSuccess &&
      isExpectationsData(mutation.data.data) &&
      !isNone(mutation.data.data.response.suggestion) ? (
        <>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">{mutation.data.data.expectation}</div>
            <AlertIcon
              message={t("no_sentences")}
              show={mutation.data.data.response.sent_ids.length === 0}
            />
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => {
              dispatch({ type: "update", sentences: mutation.data.input });
              isExpectationsData(mutation.data.data)
                ? dispatch({
                    sentences: [mutation.data.data.response.sent_ids],
                    type: "set",
                  })
                : dispatch({ type: "unset" });
            }}
            onExit={() => dispatch({ type: "unset" })}
          >
            <>
              {isExpectationsData(mutation.data.data) &&
              mutation.data.data.response.assessment ? (
                <div>
                  <h6 className="d-inline">{t("assessment")}</h6>{" "}
                  <span key={`${id}-assessment`}>
                    {mutation.data.data.response.assessment}
                  </span>
                </div>
              ) : null}
              {isExpectationsData(mutation.data.data) &&
              mutation.data.data.response.suggestion ? (
                <div>
                  <h6 className="d-inline">{t("suggestion")}</h6>{" "}
                  <span key={`${id}-suggestion`}>
                    {mutation.data.data.response.suggestion}
                  </span>
                </div>
              ) : null}
              {isExpectationsData(mutation.data.data) &&
              !mutation.data.data.response.suggestion ? (
                <div>
                  <h6 className="d-inline">{t("suggestion")}</h6>{" "}
                  <span key={`${id}-suggestion`}>{t("no_suggestions")}</span>
                </div>
              ) : null}
            </>
          </Accordion.Body>
        </>
      ) : null}
    </Accordion.Item>
  );
};

type ExpectationRulesProps = AccordionProps & {
  rule: Rule;
  setCurrent?: (key: AccordionEventKey) => void;
};
/** Component for rendering individual expectation rules. */
const ExpectationRules: FC<ExpectationRulesProps> = ({
  rule,
  className,
  setCurrent,
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
            key={`${id}-expectation-${rule.name}-${j}`}
            eventKey={`${id}-expectation-${j}`}
            setCurrent={setCurrent}
          />
        ))}
      </Accordion>
    </section>
  );
};

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/** Content Expectations tool component. */
export const Expectations: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const { task } = useWritingTask();
  const dispatch = useReviewDispatch();
  const [document] = useFileText();
  /** Document hash to force rerender of expectation on change of document. */
  const [hash, setHash] = useState<string>("null");
  useEffect(() => {
    // compute hash of document for use in keys
    hashString(document || "").then((h) => setHash(h));
  }, [document]);

  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) => {
    setCurrent(eventKey);
  };

  useEffect(() => {
    // on task or document change, reset current accordion item
    setCurrent(null);
    // also reset review context
    dispatch({ type: "unset" });
    dispatch({ type: "remove" });
  }, [task, document, dispatch]);

  useEffect(() => {
    // on unmount, reset review context
    return () => {
      dispatch({ type: "unset" });
      dispatch({ type: "remove" });
    };
  }, [dispatch]);

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
        <section className="container-fluid overflow-auto position-relative flex-grow-1">
          {/* null task error, but should not be accessable without task */}
          <Activity mode={!task ? "visible" : "hidden"}>
            <div className="alert alert-warning" role="alert">
              {t("no_task_selected")}
            </div>
          </Activity>
          {task?.rules.rules.map((rule, i) => (
            <ExpectationRules
              key={`${hash}-rule-${rule.name}-${i}`}
              rule={rule}
              setCurrent={setCurrent}
              onSelect={onSelect}
              activeKey={current}
            />
          ))}
        </section>
      </article>
    </ReviewReset>
  );
};
