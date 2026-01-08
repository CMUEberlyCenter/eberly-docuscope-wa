import { useMutation } from "@tanstack/react-query";
import {
  type FC,
  type HTMLProps,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Accordion, Alert } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../..";
import {
  type CredibilityData,
  type OptionalReviewData,
} from "../../../lib/ReviewResponse";
import type { WritingTask } from "../../../lib/WritingTask";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import {
  ReviewToolCard,
  ReviewToolProps,
  useReviewDispatch,
} from "./ReviewContext";

const CredibilityContent: FC<ReviewToolProps<CredibilityData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");
  const dispatch = useReviewDispatch();
  const prefix = useId();
  return (
    <ReviewToolCard
      title={t("credibility.title")}
      instructionsKey={"credibility"}
      errorMessage={t("credibility.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("credibility_insights")}</p>}
            </Translation>
          </header>
          <section>
            {review.response?.length ? (
              <Accordion>
                {review.response.map(({ issue, suggestion, sent_ids }, i) => (
                  <Accordion.Item
                    key={`${prefix}-${i}`}
                    eventKey={`${prefix}-${i}`}
                  >
                    <Accordion.Header className="accordion-header-highlight">
                      <div className="fex-grow-1">
                        <h6 className="d-inline">
                          {t("credibility.assessment")}
                        </h6>{" "}
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
            )}
          </section>
        </section>
      ) : (
        <Alert variant="warning">{t("credibility.null")}</Alert>
      )}
    </ReviewToolCard>
  );
};
/** Ethos review tool component. */
export const Credibility: FC<HTMLProps<HTMLDivElement>> = ({ ...props }) => {
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
    <CredibilityContent
      isPending={mutation.isPending}
      review={review}
      {...props}
    />
  );
};

/** Ethos preview tool component. */
export const CredibilityPreview: FC<
  HTMLProps<HTMLDivElement> & {
    reviewID?: string;
    analysis?: OptionalReviewData<CredibilityData>;
  }
> = ({ reviewID, analysis, ...props }) => {
  const [review, setReview] =
    useState<OptionalReviewData<CredibilityData>>(analysis);
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
    if (!reviewID) return;
    if (analysis && analysis.tool === "credibility") {
      setReview(analysis as OptionalReviewData<CredibilityData>);
      return;
    }
    mutation.mutate({
      id: reviewID,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [reviewID, analysis]);

  return (
    <CredibilityContent
      isPending={mutation.isPending}
      review={review}
      {...props}
    />
  );
};
