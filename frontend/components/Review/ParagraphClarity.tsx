import { useMutation } from "@tanstack/react-query";
import {
  type FC,
  type HTMLProps,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Accordion, type ButtonProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../src";
import {
  type OptionalReviewData,
  type ParagraphClarityData,
} from "../../src/lib/ReviewResponse";
import type { WritingTask } from "../../src/lib/WritingTask";
import Icon from "../../assets/icons/paragraph_clarity_icon.svg?react";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { ToolButton } from "../ToolButton/ToolButton";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import {
  PreviewCardProps,
  ReviewToolCard,
  ReviewToolContentProps,
  useReviewDispatch,
} from "./ReviewContext";

/** Button component for selecting the Paragraph Clarity tool. */
export const ParagraphClarityButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:paragraph_clarity.title")}
      tooltip={t("instructions:paragraph_clarity_scope_note")}
      icon={<Icon />}
    />
  );
};

const ParagraphClarityContent: FC<
  ReviewToolContentProps<ParagraphClarityData>
> = ({ review, ...props }) => {
  const { t } = useTranslation("review");
  const id = useId();
  const dispatch = useReviewDispatch();
  return (
    <ReviewToolCard
      title={t("paragraph_clarity.title")}
      instructionsKey={"paragraph_clarity"}
      errorMessage={t("paragraph_clarity.error")}
      review={review}
      {...props}
    >
      <section>
        <header>
          <h5 className="text-primary">{t("insights")}</h5>
          <Translation ns="instructions">
            {(t) => <p>{t("paragraph_clarity_insights")}</p>}
          </Translation>
        </header>
        {review && "response" in review ? (
          <Accordion>
            {review.response.map(
              ({ issue, suggestion, sent_ids, para_id }, i) => (
                <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                  <Accordion.Header className="accordion-header-highlight">
                    <div className="flex-grow-1">{issue}</div>
                    <AlertIcon
                      show={sent_ids.length === 0 && !para_id}
                      message={t("logical_flow.no_sentences")}
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    onEntered={() =>
                      dispatch({
                        type: "set",
                        sentences: [sent_ids],
                        paragraphs: [para_id],
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    <h6 className="d-inline">
                      {t("paragraph_clarity.suggestion")}
                    </h6>{" "}
                    <p className="d-inline">{suggestion}</p>
                  </Accordion.Body>
                </Accordion.Item>
              )
            )}
          </Accordion>
        ) : null}
      </section>
    </ReviewToolCard>
  );
};

/** Paragraph Clarity review tool component. */
export const ParagraphClarity: FC<HTMLProps<HTMLDivElement>> = ({
  ...props
}) => {
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] =
    useState<OptionalReviewData<ParagraphClarityData>>(null);

  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: Optional<WritingTask>;
    }) => {
      const { document, writing_task } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch("/api/v2/review/paragraph_clarity", {
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
      data: ParagraphClarityData;
    }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "paragraph_clarity", error });
      console.error("Error fetching Paragraph Clarity review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  // When the document or writing task changes, fetch a new review
  useEffect(() => {
    if (!document) return;
    // Fetch the review data for Paragraph Clarity
    mutation.mutate({ document, writing_task });
    // TODO error handling
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [document, writing_task]);

  return (
    <ParagraphClarityContent
      review={review}
      isPending={mutation.isPending}
      {...props}
    />
  );
};

export const ParagraphClarityPreview: FC<
  PreviewCardProps<ParagraphClarityData>
> = ({ reviewID, analysis, ...props }) => {
  const [review, setReview] =
    useState<OptionalReviewData<ParagraphClarityData>>(analysis);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { id } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/snapshot/${id}/paragraph_clarity`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: ParagraphClarityData) => {
      dispatch({ type: "unset" });
      // dispatch({ type: "update", sentences:  });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "paragraph_clarity", error });
      console.error("Error fetching Paragraph Clarity review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    if (!reviewID) return;
    if (analysis && analysis.tool === "paragraph_clarity") {
      setReview(analysis as OptionalReviewData<ParagraphClarityData>);
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
    <ParagraphClarityContent
      review={review}
      isPending={mutation.isPending}
      {...props}
    />
  );
};
