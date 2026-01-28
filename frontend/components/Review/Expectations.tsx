import {
  faCircleExclamation,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import {
  Activity,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type HTMLProps,
} from "react";
import {
  Accordion,
  type AccordionItemProps,
  type ButtonProps,
} from "react-bootstrap";
import type {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { useTranslation } from "react-i18next";
import Icon from "../../assets/icons/expectations_icon.svg?react";
import { Optional } from "../../src";
import {
  ErrorDataError,
  isErrorData,
  isExpectationsData,
  isExpectationsDataSuggestionNone,
  OptionalReviewData,
  type ErrorData,
  type ExpectationsData,
} from "../../src/lib/ReviewResponse";
import {
  getIndexOfExpectation,
  WritingTask,
  type Rule,
} from "../../src/lib/WritingTask";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  checkReviewResponse,
  ReviewErrorData,
} from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { ReviewReset, useReviewDispatch } from "../ReviewContext/ReviewContext";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import style from "./Expectations.module.scss";

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

type ExpectationMutationProps = {
  expectation: Rule;
  expectationIndex?: number;
  eventKey?: AccordionEventKey;
  setCurrent?: (key: AccordionEventKey) => void;
};

type WrappedExpectationsDataResult = {
  input: string;
  data: ExpectationsData; // | ErrorData;
};
const isWrappedExpectationsData = (
  obj: unknown
): obj is WrappedExpectationsDataResult => {
  return (
    !!obj &&
    typeof obj === "object" &&
    "input" in obj &&
    typeof obj.input === "string" &&
    "data" in obj &&
    isExpectationsData(obj.data)
  );
};

/** Hook to create mutation for fetching expectation review data. */
function useExpectationsDataMutation({
  expectation,
  setCurrent,
  eventKey,
}: ExpectationMutationProps) {
  const dispatch = useReviewDispatch();
  const { task } = useWritingTask();
  const [document] = useFileText();
  const [errorData, setErrorData] = useState<ErrorData | null>(null);
  const [result, setResult] =
    useState<OptionalReviewData<ExpectationsData>>(null);
  const [taggedDocument, setTaggedDocument] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      setErrorData(null);
      setCurrent?.(""); // Close any open accordion item
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("canceling previous request");
      }
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      if (!document || !task) {
        throw new Error("Document or writing task is missing");
      }
      const response = await fetch("/api/v2/review/expectation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document,
          writing_task: task,
          expectation: expectation.name,
        }),
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      const result = await response.json();
      if (!result) {
        throw new Error("No data received from server");
      }
      if (isErrorData(result)) {
        throw new ErrorDataError(result);
      }
      if (isExpectationsData(result)) {
        throw new Error("Expected wrapped data, got raw data");
      }
      if ("data" in result && isErrorData(result.data)) {
        throw new ErrorDataError(result.data);
      }
      if (!isWrappedExpectationsData(result)) {
        throw new Error("Invalid data format received from server");
      }
      return result;
    },
    onSuccess: ({ data, input }) => {
      setResult(data);
      setTaggedDocument(input);
      dispatch({
        type: "set",
        sentences: [data.response.sent_ids],
      });
      setCurrent?.(eventKey); // open this accordion item
    },
    onError: (error) => {
      console.error("Error fetching expectation:", error);
      dispatch({ type: "unset" });
      if (error instanceof ErrorDataError) {
        setErrorData(error.data);
        return;
      }
      setErrorData({
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
      abortControllerRef.current?.abort("component unmounting");
      abortControllerRef.current = null;
    };
  }, []);
  useEffect(() => {
    setCurrent?.(null);
    dispatch({ type: "unset" });
    dispatch({ type: "remove" });
    return () => {
      abortControllerRef.current?.abort("component dependencies changing");
      abortControllerRef.current = null;
      dispatch({ type: "unset" });
      dispatch({ type: "remove" });
    };
  }, [task, document, dispatch]);

  return {
    taggedDocument,
    result,
    errorData,
    isPending: mutation.isPending,
    isIdle: mutation.isIdle,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    mutate: mutation.mutate,
    error: mutation.error,
  };
}

function useExpectationsSnapshotMutation(snapshotID: string) {
  return function ({
    expectationIndex,
    setCurrent,
    eventKey,
  }: ExpectationMutationProps) {
    const dispatch = useReviewDispatch();
    const [errorData, setErrorData] = useState<ErrorData | null>(null);
    const [taggedDocument] = useState<string>("");
    const [result, setResult] =
      useState<OptionalReviewData<ExpectationsData>>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const mutation = useMutation({
      mutationFn: async () => {
        setErrorData(null);
        setCurrent?.(""); // Close any open accordion item
        if (
          !snapshotID ||
          expectationIndex === undefined ||
          expectationIndex < 0
        )
          throw new Error("Invalid preview parameters");
        if (abortControllerRef.current) {
          abortControllerRef.current.abort("canceling previous request");
        }
        abortControllerRef.current = new AbortController();
        dispatch({ type: "unset" }); // probably not needed, but just in case
        dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
        const response = await fetch(
          `/api/v2/snapshot/${snapshotID}/expectation/${expectationIndex}`,
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
        setResult(data);
        dispatch({ type: "set", sentences: [data.response.sent_ids] });
        setCurrent?.(eventKey); // open this accordion item
      },
      onError: (error) => {
        console.error("Error fetching expectation preview:", error);
        dispatch({ type: "unset" });
        if (error instanceof ErrorDataError) {
          setErrorData(error.data);
          return;
        }
        setErrorData({
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
    return {
      taggedDocument,
      result,
      errorData,
      isPending: mutation.isPending,
      isIdle: mutation.isIdle,
      isError: mutation.isError,
      isSuccess: mutation.isSuccess,
      mutate: mutation.mutate,
      error: mutation.error,
    };
  };
}

const ExpectationsDataContext = createContext<
  | typeof useExpectationsDataMutation
  | ReturnType<typeof useExpectationsSnapshotMutation>
  | null
>(null);
const ExpectationsSnapshotContext = createContext<
  Map<string, OptionalReviewData<ExpectationsData>>
>(new Map());
const WritingTaskContext = createContext<Optional<WritingTask>>(null);
const FileHashContext = createContext<string>("null");
/** Simple hash function for strings, no cryptographic guarantees. */
function simpleHashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char; // A common pattern for combining hash values
    hash |= 0; // Ensure the hash remains a 32-bit integer
  }
  return hash.toString();
}

export const ExpectationsDataProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { task } = useWritingTask();
  const [document] = useFileText();
  /** Document hash to force rerender of expectation on change of document. */
  const [hash, setHash] = useState<string>("null");
  useEffect(() => {
    // compute hash of document for use in keys
    setHash(simpleHashString(document || ""));
  }, [document]);

  return (
    <ExpectationsDataContext.Provider value={useExpectationsDataMutation}>
      <ExpectationsSnapshotContext.Provider value={new Map()}>
        <WritingTaskContext.Provider value={task}>
          <FileHashContext.Provider value={hash}>
            {children}
          </FileHashContext.Provider>
        </WritingTaskContext.Provider>
      </ExpectationsSnapshotContext.Provider>
    </ExpectationsDataContext.Provider>
  );
};

export const ExpectationSnapshotProvider: FC<{
  children: React.ReactNode;
  snapshotID: string;
  task?: WritingTask;
  analysis?: OptionalReviewData<ExpectationsData[]>;
}> = ({ analysis, children, snapshotID, task }) => {
  const mutationFactory = useExpectationsSnapshotMutation(snapshotID);
  const [analyses, setAnalyses] = useState(
    new Map(
      analysis && !isErrorData(analysis)
        ? analysis.map((a) => [a.expectation, a])
        : []
    )
  );

  useEffect(() => {
    setAnalyses(
      new Map(
        analysis && !isErrorData(analysis)
          ? analysis.map((a) => [a.expectation, a])
          : []
      )
    ); // reset to clear any old data
  }, [analysis]);
  return (
    <ExpectationsDataContext.Provider value={mutationFactory}>
      <ExpectationsSnapshotContext.Provider value={analyses}>
        <WritingTaskContext.Provider value={task ?? null}>
          <FileHashContext.Provider value={snapshotID}>
            {children}
          </FileHashContext.Provider>
        </WritingTaskContext.Provider>
      </ExpectationsSnapshotContext.Provider>
    </ExpectationsDataContext.Provider>
  );
};

type ExpectationRuleProps = AccordionItemProps & {
  rule: Rule;
  ruleIdx: number;
  setCurrent?: (key: AccordionEventKey) => void;
};
/** Component for rendering individual expectation rules in snapshot mode. */
const ExpectationRule: FC<ExpectationRuleProps> = ({
  eventKey,
  rule,
  ruleIdx,
  setCurrent,
  ...props
}) => {
  const dispatch = useReviewDispatch();

  const mutation = useContext(ExpectationsDataContext)?.({
    eventKey,
    expectation: rule,
    expectationIndex: ruleIdx,
    setCurrent,
  });
  if (!mutation) {
    throw new Error(
      "ExpectationRule must be used within an ExpectationsDataContext.Provider"
    );
  }

  // set tagged document so that highlights work.
  useEffect(() => {
    if (mutation.taggedDocument) {
      dispatch({ type: "update", sentences: mutation.taggedDocument });
    }
  }, [mutation.taggedDocument, dispatch]);

  if (mutation.isSuccess) {
    return (
      <LoadedExpectationRule
        analysis={mutation.result}
        eventKey={eventKey}
        rule={rule}
        setDocument={() => {
          if (mutation.taggedDocument) {
            dispatch({ type: "update", sentences: mutation.taggedDocument });
          }
        }}
      />
    );
  }

  return (
    <Accordion.Item eventKey={eventKey} {...props}>
      {mutation.isIdle ? (
        <div
          role="button"
          className={style["fake-accordion-button"]}
          onClick={() => mutation.mutate()}
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
            <ReviewErrorData data={mutation.errorData!} />
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
    setDocument?: () => void;
  }
> = ({ analysis, eventKey, rule, setDocument, ...props }) => {
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
          setDocument?.();
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

/** Content Expectations tool component. */
export const Expectations: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const { t: te } = useTranslation("expectations");

  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) => {
    setCurrent(eventKey);
  };
  const analyses = useContext(ExpectationsSnapshotContext);
  const task = useContext(WritingTaskContext);
  const id = useContext(FileHashContext);

  const dispatch = useReviewDispatch();
  useEffect(() => {
    // this gets the current to reset on tool change.
    setCurrent(null);
  }, [task, dispatch]);

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
              {te("expectations:error.no_task")}
            </div>
          </Activity>
          {task?.rules.rules.map((rule, i) => (
            <section key={`${id}-rule-${rule.name}-${i}`}>
              <h5 className="mb-0">{rule.name}</h5>
              <Accordion
                className="mb-3"
                onSelect={onSelect}
                activeKey={current}
              >
                <>
                  {rule.children.map((rule, j) =>
                    analyses.has(rule.name) ? (
                      <LoadedExpectationRule
                        analysis={analyses.get(rule.name)}
                        eventKey={`${id}-expectation-${i}-${j}`}
                        rule={rule}
                        key={`${id}-expectation-${i}-${j}`}
                      />
                    ) : (
                      <ExpectationRule
                        rule={rule}
                        ruleIdx={getIndexOfExpectation(task, rule)}
                        key={`${id}-expectation-${i}-${j}`}
                        eventKey={`${id}-expectation-${i}-${j}`}
                        setCurrent={setCurrent}
                      />
                    )
                  )}
                </>
              </Accordion>
            </section>
          ))}
        </section>
      </article>
    </ReviewReset>
  );
};
