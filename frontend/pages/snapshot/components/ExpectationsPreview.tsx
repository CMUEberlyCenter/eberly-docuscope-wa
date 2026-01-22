import {
  faCircleExclamation,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import { Activity, FC, useEffect, useRef, useState } from "react";
import { Accordion, AccordionItemProps } from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { useTranslation } from "react-i18next";
import { AlertIcon } from "../../../components/AlertIcon/AlertIcon";
import {
  checkReviewResponse,
  ReviewErrorData,
} from "../../../components/ErrorHandler/ErrorHandler";
import { LoadingSmall } from "../../../components/Loading/LoadingSmall";
import style from "../../../components/Review/Expectations.module.scss";
import {
  PreviewCardProps,
  ReviewReset,
  useReviewDispatch,
} from "../../../components/Review/ReviewContext";
import { ToolHeader } from "../../../components/ToolHeader/ToolHeader";
import {
  ErrorData,
  ErrorDataError,
  ExpectationsData,
  isErrorData,
  isExpectationsDataSuggestionNone,
  OptionalReviewData,
} from "../../../src/lib/ReviewResponse";
import {
  getIndexOfExpectation,
  Rule,
  WritingTask,
} from "../../../src/lib/WritingTask";

type ExpectationRulePreviewProps = AccordionItemProps & {
  previewId: string;
  rule: Rule;
  ruleIdx: number;
  setCurrent?: (key: AccordionEventKey) => void;
};
/** Component for rendering individual expectation rules in preview mode. */
const ExpectationRulePreview: FC<ExpectationRulePreviewProps> = ({
  eventKey,
  previewId,
  rule,
  ruleIdx,
  setCurrent,
  ...props
}) => {
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<ErrorData | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: { id: string; idx: number }) => {
      setError(null);
      setCurrent?.(""); // Close any open accordion item
      const { id, idx } = data;
      if (!id || idx < 0) throw new Error("Invalid preview parameters");
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(
        `/api/v2/snapshot/${id}/expectation/${idx}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current.signal,
        }
      );
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: ExpectationsData) => {
      if (isErrorData(data)) {
        throw new ErrorDataError(data);
      }
      dispatch({ type: "set", sentences: [data.response.sent_ids] });
      setCurrent?.(eventKey); // open this accordion item
    },
    onError: (error) => {
      console.error("Error fetching expectation preview:", error);
      dispatch({ type: "unset" });
      if (error instanceof ErrorDataError) {
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
    return () => abortControllerRef.current?.abort();
  }, []);

  if (mutation.isSuccess) {
    return (
      <LoadedExpectationRule
        analysis={mutation.data}
        eventKey={eventKey}
        rule={rule}
      />
    );
  }

  return (
    <Accordion.Item eventKey={eventKey} {...props}>
      {mutation.isIdle ? (
        <div
          role="button"
          className={style["fake-accordion-button"]}
          onClick={() => mutation.mutate({ id: previewId, idx: ruleIdx })}
          aria-disabled={!previewId || ruleIdx < 0}
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
    </Accordion.Item>
  );
};

const LoadedExpectationRule: FC<
  AccordionItemProps & {
    analysis: OptionalReviewData<ExpectationsData>;
    eventKey: AccordionEventKey;
    rule: Rule;
  }
> = ({ analysis, eventKey, rule, ...props }) => {
  const dispatch = useReviewDispatch();
  const { t } = useTranslation("expectations");

  if (!analysis) return null;

  if (isErrorData(analysis)) {
    return (
      <Accordion.Item {...props} eventKey={eventKey}>
        <Accordion.Header className="accordion-header-highlight">
          <div className="flex-grow-1">{rule.name}</div>
          <FontAwesomeIcon icon={faCircleExclamation} className="text-danger" />
        </Accordion.Header>
        <Accordion.Body
          onEntered={() => dispatch({ type: "unset" })}
          onExit={() => dispatch({ type: "unset" })}
        >
          <ReviewErrorData data={analysis} />
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  if (isExpectationsDataSuggestionNone(analysis)) {
    return (
      <Accordion.Item {...props} eventKey={eventKey}>
        <div className={style["fake-accordion-button"]}>
          <div className="flex-grow-1">{analysis.expectation}</div>
          <AlertIcon message={t("warning")} show={true} />
        </div>
      </Accordion.Item>
    );
  }

  return (
    <Accordion.Item {...props} eventKey={eventKey}>
      <Accordion.Header className="accordion-header-highlight">
        <div className="flex-grow-1">{analysis.expectation}</div>
        <AlertIcon
          message={t("no_sentences")}
          show={analysis.response.sent_ids.length === 0}
        />
      </Accordion.Header>
      <Accordion.Body
        onEntered={() => {
          dispatch({
            sentences: [analysis.response.sent_ids],
            type: "set",
          });
        }}
        onExit={() => dispatch({ type: "unset" })}
      >
        {analysis.response.assessment ? (
          <div>
            <h6 className="d-inline">{t("assessment")}</h6>{" "}
            <span>{analysis.response.assessment}</span>
          </div>
        ) : null}
        <div>
          <h6 className="d-inline">{t("suggestion")}</h6>{" "}
          <span>{analysis.response.suggestion || t("no_suggestions")}</span>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export const ExpectationsPreview: FC<
  PreviewCardProps<ExpectationsData[]> & { task: WritingTask }
> = ({ reviewID = "no-id", analysis, task, className, ...props }) => {
  const { t } = useTranslation("review");
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) => {
    setCurrent(eventKey);
  };
  const [analyses, setAnalyses] = useState<
    Record<string, OptionalReviewData<ExpectationsData>>
  >({});
  const updateAnalyses = (data: ExpectationsData) => {
    setAnalyses((prev) => ({
      ...prev,
      [data.expectation]: data,
    }));
  };

  useEffect(() => {
    setCurrent(null);
    if (analysis && !isErrorData(analysis)) {
      analysis.forEach(updateAnalyses);
    }
  }, [analysis]);

  const dispatch = useReviewDispatch();
  useEffect(() => {
    // this gets the current to reset on tool change.
    setCurrent(null);
  }, [task, reviewID, dispatch]);

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
          {isErrorData(analysis) ? (
            <ReviewErrorData data={analysis} />
          ) : (
            task?.rules.rules.map((rule, i) => (
              <section key={`${reviewID}-rule-${rule.name}-${i}`}>
                <h5 className="mb-0">{rule.name}</h5>
                <Accordion
                  className="mb-3"
                  onSelect={onSelect}
                  activeKey={current}
                >
                  <>
                    {rule.children.map((rule, j) =>
                      analyses[rule.name] ? (
                        <LoadedExpectationRule
                          analysis={analyses[rule.name]}
                          eventKey={`${reviewID}-expectation-${i}-${j}`}
                          rule={rule}
                          key={`${reviewID}-expectation-${i}-${j}`}
                        />
                      ) : (
                        <ExpectationRulePreview
                          previewId={reviewID}
                          rule={rule}
                          ruleIdx={getIndexOfExpectation(task, rule)}
                          key={`${reviewID}-expectation-${i}-${j}`}
                          eventKey={`${reviewID}-expectation-${i}-${j}`}
                          setCurrent={setCurrent}
                        />
                      )
                    )}
                  </>
                </Accordion>
              </section>
            ))
          )}
        </section>
      </article>
    </ReviewReset>
  );
};
