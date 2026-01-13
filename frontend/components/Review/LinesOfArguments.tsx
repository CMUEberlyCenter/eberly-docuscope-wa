import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import {
  type FC,
  type HTMLProps,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  type AccordionProps,
  Alert,
  type ButtonProps,
} from "react-bootstrap";
import type {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../src";
import {
  type Claim as ClaimProps,
  isErrorData,
  type LinesOfArgumentsData,
  type OptionalReviewData,
} from "../../src/lib/ReviewResponse";
import type { WritingTask } from "../../src/lib/WritingTask";
import Icon from "../../assets/icons/list_arguments_icon.svg?react";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  checkReviewResponse,
  ReviewErrorData,
} from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import {
  PreviewCardProps,
  ReviewReset,
  useReviewDispatch,
} from "./ReviewContext";

/** Button component for selecting the Lines Of Arguments tool. */
export const LinesOfArgumentsButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:lines_of_arguments.title")}
      tooltip={t("instructions:lines_of_arguments_scope_note")}
      icon={<Icon />}
    />
  );
};

type ClaimsProps = AccordionProps & {
  claims?: ClaimProps[] | null;
};

/** Component for displaying a list of Claims. */
const Claims: FC<ClaimsProps> = ({ claims, ...props }) => {
  const dispatch = useReviewDispatch();
  const prefix = useId();

  return (
    <Translation ns={"review"}>
      {(t) =>
        claims?.length ? (
          <Accordion {...props}>
            {claims.map(
              (
                {
                  claim,
                  support,
                  claim_sent_ids,
                  support_sent_ids,
                  suggestion,
                  impact,
                },
                i
              ) => (
                <Accordion.Item
                  key={`${prefix}-${i}`}
                  eventKey={`${prefix}-${i}`}
                >
                  <Accordion.Header className="accordion-header-highlight">
                    <div className="flex-grow-1">
                      <h6 className="d-inline">
                        {t("lines_of_arguments.claim")}
                      </h6>{" "}
                      <span>{claim}</span>
                    </div>
                    <AlertIcon
                      message={t("lines_of_arguments.no_sentences")}
                      show={
                        (claim_sent_ids ?? []).length +
                          (support_sent_ids ?? []).length ===
                        0
                      }
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    className="p-0 pb-3"
                    onEntered={() =>
                      dispatch({
                        type: "set",
                        sentences: [
                          claim_sent_ids ?? [],
                          support_sent_ids ?? [],
                        ],
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    {/* {support && typeof support === "string" ? (
                      <div
                        className={classNames(
                          "p-3 pb-2",
                          (support_sent_ids ?? []).length &&
                          "highlight highlight-1"
                        )}
                      >
                        <h6 className="d-inline">
                          {t("lines_of_arguments.support")}
                        </h6>{" "}
                        <span>{support}</span>
                      </div>
                    ) : null} */}
                    {support && Array.isArray(support) ? (
                      <div
                        className={classNames(
                          "p-3 pb-2",
                          (support_sent_ids ?? []).length &&
                            "highlight highlight-1"
                        )}
                      >
                        <h6>{t("lines_of_arguments.support")}</h6>
                        <ul>
                          {support.map((s, k) => (
                            <li key={`${i}-${k}`}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="m-3 mt-2">
                      <h6>{t("lines_of_arguments.suggestions")}</h6>
                      {suggestion || impact ? (
                        <ul>
                          {suggestion ? (
                            <li key={`${i}-suggestion`}>{suggestion}</li>
                          ) : null}
                          {impact ? (
                            <li key={`${i}-impact`}>{impact}</li>
                          ) : null}
                        </ul>
                      ) : (
                        <p>{t("lines_of_arguments.no_suggestions")}</p>
                      )}
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              )
            )}
          </Accordion>
        ) : (
          <Alert variant="warning">{t("lines_of_arguments.null")}</Alert>
        )
      }
    </Translation>
  );
};

/**
 * Component for displaying the results of Lines of Arguments review.
 */
export const LinesOfArguments: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] =
    useState<OptionalReviewData<LinesOfArgumentsData>>(null);
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: Optional<WritingTask>;
    }) => {
      const { document, writing_task } = data;
      abortControllerRef.current = new AbortController();
      setReview(null);
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch("/api/v2/review/lines_of_arguments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document, writing_task }),
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: ({
      input,
      data,
    }: {
      input: string;
      data: LinesOfArgumentsData;
    }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "lines_of_arguments", error });
      console.error("Error fetching Lines of Arguments review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  // When the document or writing task changes, fetch a new review
  useEffect(() => {
    if (!document) return;
    setCurrent(null);
    // Fetch the review data for Lines of Arguments
    mutation.mutate({ document, writing_task });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [document, writing_task]);
  useEffect(() => {
    if (
      !current &&
      review &&
      "response" in review &&
      review?.response?.sent_ids
    ) {
      dispatch({ type: "set", sentences: [review.response.sent_ids ?? []] });
    }
  }, [current, review, dispatch]);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1 h-100"
        )}
      >
        <ToolHeader
          title={t("lines_of_arguments.title")}
          instructionsKey="lines_of_arguments"
        />
        {mutation.isPending || !review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("lines_of_arguments.error")}</Alert>
            }
          >
            {/* {review.datetime && (
            <Card.Subtitle className="text-center">
              {new Date(review.datetime).toLocaleString()}
            </Card.Subtitle>
          )} */}
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("lines_of_arguments_insights")}</p>}
                  </Translation>
                </header>
                <section className="mt-3">
                  {review.response.thesis ? (
                    <div>
                      <h6 className="d-inline">
                        {t("lines_of_arguments.main")}
                      </h6>{" "}
                      <p
                        className={classNames(
                          "d-inline",
                          !current ? "highlight highlight-0" : ""
                        )}
                      >
                        {review.response.thesis}
                      </p>
                    </div>
                  ) : null}
                  {"strategies" in review.response &&
                  Array.isArray(review.response.strategies) ? (
                    <section className="mt-3">
                      <h6>{t("lines_of_arguments.strategies")}</h6>
                      <ul>
                        {review.response.strategies.map((strat, i) => (
                          <li key={`loa-strat-${i}`}>{strat}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <Claims
                    onSelect={onSelect}
                    activeKey={current}
                    claims={review.response.claims}
                  />
                  {!review.response.thesis &&
                  !review.response.strategies?.length &&
                  !review.response.claims?.length ? (
                    <Alert variant="warning">
                      {t("lines_of_arguments.null")}
                    </Alert>
                  ) : null}
                </section>
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};

export const LinesOfArgumentsPreview: FC<
  PreviewCardProps<LinesOfArgumentsData>
> = ({ className, reviewID, analysis, ...props }) => {
  const { t } = useTranslation("review");
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);
  const [review, setReview] = useState<
    OptionalReviewData<LinesOfArgumentsData>
  >((analysis as OptionalReviewData<LinesOfArgumentsData>) ?? null);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { id } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/preview/${id}/lines_of_arguments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: LinesOfArgumentsData) => {
      dispatch({ type: "unset" });
      // dispatch({ type: "update", sentences:  });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "lines_of_arguments", error });
      console.error("Error fetching Lines of Arguments review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    console.log("LogicalFlowPreview useEffect triggered.", reviewID, analysis);
    if (!reviewID) return;
    if (analysis && analysis.tool === "lines_of_arguments") {
      console.log("Using pre-fetched Lines of Arguments analysis data.");
      setReview(analysis as OptionalReviewData<LinesOfArgumentsData>);
      return;
    }
    console.log("Fetching Lines of Arguments analysis data.");
    mutation.mutate({
      id: reviewID,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [reviewID, analysis]);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1 h-100"
        )}
      >
        <ToolHeader
          title={t("lines_of_arguments.title")}
          instructionsKey="lines_of_arguments"
        />
        {mutation.isPending || !review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("lines_of_arguments.error")}</Alert>
            }
          >
            {/* {review.datetime && (
            <Card.Subtitle className="text-center">
              {new Date(review.datetime).toLocaleString()}
            </Card.Subtitle>
          )} */}
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("lines_of_arguments_insights")}</p>}
                  </Translation>
                </header>
                <section className="mt-3">
                  {review.response.thesis ? (
                    <div>
                      <h6 className="d-inline">
                        {t("lines_of_arguments.main")}
                      </h6>{" "}
                      <p
                        className={classNames(
                          "d-inline",
                          !current ? "highlight highlight-0" : ""
                        )}
                      >
                        {review.response.thesis}
                      </p>
                    </div>
                  ) : null}
                  {"strategies" in review.response &&
                  Array.isArray(review.response.strategies) ? (
                    <section className="mt-3">
                      <h6>{t("lines_of_arguments.strategies")}</h6>
                      <ul>
                        {review.response.strategies.map((strat, i) => (
                          <li key={`loa-strat-${i}`}>{strat}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <Claims
                    onSelect={onSelect}
                    activeKey={current}
                    claims={review.response.claims}
                  />
                  {!review.response.thesis &&
                  !review.response.strategies?.length &&
                  !review.response.claims?.length ? (
                    <Alert variant="warning">
                      {t("lines_of_arguments.null")}
                    </Alert>
                  ) : null}
                </section>
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
