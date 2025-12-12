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
import { Accordion, type AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../..";
import {
  Analysis,
  type CredibilityData,
  type CredibilityOutput,
  isErrorData,
  type OptionalReviewData,
} from "../../../lib/ReviewResponse";
import type { WritingTask } from "../../../lib/WritingTask";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  checkReviewResponse,
  ReviewErrorData,
} from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";

/** Accordion component for displaying sentence assessments. */
const SentenceAssessments: FC<
  AccordionProps & { assessments?: CredibilityOutput }
> = ({ assessments, ...props }) => {
  const dispatch = useReviewDispatch();
  const prefix = useId();
  return (
    <Translation ns="review">
      {(t) =>
        assessments?.length ? (
          <Accordion {...props}>
            {assessments.map(({ issue, suggestion, sent_ids }, i) => (
              <Accordion.Item
                key={`${prefix}-${i}`}
                eventKey={`${prefix}-${i}`}
              >
                <Accordion.Header className="accordion-header-highlight">
                  <div className="fex-grow-1">
                    <h6 className="d-inline">{t("credibility.assessment")}</h6>{" "}
                    <span>{issue}</span>
                  </div>
                  <AlertIcon
                    message={t("credibility.no_sentences")}
                    show={sent_ids.length === 0}
                  />
                </Accordion.Header>
                <Accordion.Body
                  className="pb-3"
                  onEntered={() =>
                    dispatch({
                      type: "set",
                      sentences: [sent_ids],
                    })
                  }
                  onExit={() => dispatch({ type: "unset" })}
                >
                  {suggestion}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <Alert variant="warning">{t("credibility.null")}</Alert>
        )
      }
    </Translation>
  );
};

/** Ethos review tool component. */
export const Credibility: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const dispatch = useReviewDispatch();
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] =
    useState<OptionalReviewData<CredibilityData>>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: Optional<WritingTask>;
    }) => {
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch("/api/v2/review/credibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: ({ input, data }: { input: string; data: CredibilityData }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "credibility", error });
      console.error("Error fetching Credibility review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  // When the document or writing task changes, fetch a new review
  useEffect(() => {
    if (!document) return;
    mutation.mutate({
      document,
      writing_task,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [document, writing_task]);

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
          title={t("credibility.title")}
          instructionsKey="credibility"
        />
        {!review || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("credibility.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("credibility_insights")}</p>}
                  </Translation>
                </header>
                <section>
                  <SentenceAssessments assessments={review.response} />
                </section>
              </section>
            ) : (
              <Alert variant="warning">{t("credibility.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};

/** Ethos review tool component. */
export const CredibilityPreview: FC<
  HTMLProps<HTMLDivElement> & {
    reviewID?: string;
    analysis?: Optional<Analysis>;
  }
> = ({ className, reviewID, analysis, ...props }) => {
  const { t } = useTranslation("review");
  const [review, setReview] = useState<OptionalReviewData<CredibilityData>>(
    (analysis as OptionalReviewData<CredibilityData>) ?? null
  );
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { id } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/preview/${id}/credibility`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: CredibilityData) => {
      dispatch({ type: "unset" });
      // dispatch({ type: "update", sentences:  });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "credibility", error });
      console.error("Error fetching Credibility review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    console.log("LogicalFlowPreview useEffect triggered.", reviewID, analysis);
    if (!reviewID) return;
    if (analysis && analysis.tool === "credibility") {
      console.log("Using pre-fetched Credibility analysis data.");
      setReview(analysis as OptionalReviewData<CredibilityData>);
      return;
    }
    console.log("Fetching Credibility analysis data.");
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
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader
          title={t("credibility.title")}
          instructionsKey="credibility"
        />
        {!review || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("credibility.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("credibility_insights")}</p>}
                  </Translation>
                </header>
                <section>
                  <SentenceAssessments assessments={review.response} />
                </section>
              </section>
            ) : (
              <Alert variant="warning">{t("credibility.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
