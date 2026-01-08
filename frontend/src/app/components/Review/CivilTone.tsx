import { useMutation } from "@tanstack/react-query";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type HTMLProps,
} from "react";
import { Accordion } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../..";
import {
  type CivilToneData,
  type OptionalReviewData,
} from "../../../lib/ReviewResponse";
import type { WritingTask } from "../../../lib/WritingTask";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import {
  PreviewCardProps,
  ReviewToolCard,
  ReviewToolContentProps,
  useReviewDispatch,
} from "./ReviewContext";

const CivilToneContent: FC<ReviewToolContentProps<CivilToneData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");
  const id = useId();
  const dispatch = useReviewDispatch();
  return (
    <ReviewToolCard
      title={t("civil_tone.title")}
      instructionsKey={"civil_tone"}
      errorMessage={t("civil_tone.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("civil_tone_insights")}</p>}
            </Translation>
          </header>
          {review.response.length ? (
            <Accordion>
              {review.response.map(
                ({ text, assessment, suggestion, sent_id }, i) => (
                  <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                    <Accordion.Header className="accordion-header-highlight">
                      <h6 className="d-inline">{t("civil_tone.prefix")}</h6>{" "}
                      <q>{text}</q>
                    </Accordion.Header>
                    <Accordion.Body
                      className="pb-3"
                      onEntered={() =>
                        dispatch({
                          type: "set",
                          sentences: [[sent_id]],
                        })
                      }
                      onExit={() => dispatch({ type: "unset" })}
                    >
                      <div>
                        <h6 className="d-inline">{t("civil_tone.issue")}</h6>{" "}
                        <p className="d-inline">{assessment}</p>
                      </div>
                      <div>
                        <h6 className="d-inline">
                          {t("civil_tone.suggestion")}
                        </h6>{" "}
                        <p className="d-inline">{suggestion}</p>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                )
              )}
            </Accordion>
          ) : (
            <div className="alert alert-info">{t("civil_tone.null")}</div>
          )}
        </section>
      ) : null}
    </ReviewToolCard>
  );
};

/** Civil Tone review tool component. */
export const CivilTone: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] = useState<OptionalReviewData<CivilToneData>>(null);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: Optional<WritingTask>;
    }) => {
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch("/api/v2/review/civil_tone", {
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
    onSuccess: ({ input, data }: { input: string; data: CivilToneData }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "civil_tone", error });
      console.error("Error fetching Civil Tone review:", error);
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
    <CivilToneContent
      isPending={mutation.isPending}
      review={review}
      {...props}
    />
  );
};

/** Civil Tone preview component. */
export const CivilTonePreview: FC<PreviewCardProps<CivilToneData>> = ({
  analysis,
  reviewID,
  ...props
}) => {
  const [review, setReview] =
    useState<OptionalReviewData<CivilToneData>>(analysis);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { id } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/preview/${id}/civil_tone`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: CivilToneData) => {
      dispatch({ type: "unset" });
      // dispatch({ type: "update", sentences:  });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "civil_tone", error });
      console.error("Error fetching Civil Tone review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    if (!reviewID) return;
    if (analysis && analysis.tool === "civil_tone") {
      setReview(analysis as OptionalReviewData<CivilToneData>);
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
    <CivilToneContent
      isPending={mutation.isPending}
      review={review}
      {...props}
    />
  );
};
