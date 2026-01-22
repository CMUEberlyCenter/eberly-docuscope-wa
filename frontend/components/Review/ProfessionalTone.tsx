import { useMutation } from "@tanstack/react-query";
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
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../src";
import {
  type OptionalReviewData,
  type ProfessionalToneData,
  type ProfessionalToneOutput,
} from "../../src/lib/ReviewResponse";
import type { WritingTask } from "../../src/lib/WritingTask";
import Icon from "../../assets/icons/professional_tone_icon.svg?react";
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

/** Button component for selecting the Professional Tone tool. */
export const ProfessionalToneButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:professional_tone.title")}
      tooltip={t("instructions:professional_tone_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Component for displaying sentence tone issues. */
const SentenceToneIssues: FC<
  AccordionProps & { issues: ProfessionalToneOutput }
> = ({ issues, ...props }) => {
  const dispatch = useReviewDispatch();
  const id = useId();
  const { t } = useTranslation("review");

  if (issues.length <= 0) {
    return <Alert variant="info">{t("professional_tone.null")}</Alert>;
  }
  return (
    <Accordion {...props}>
      {issues.map(({ text, sent_id, issue, suggestion }, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            <span>
              <h6 className="d-inline">{t("professional_tone.text")}</h6>{" "}
              <q>{text}</q>
            </span>
          </Accordion.Header>
          <Accordion.Body
            className="p-0 pb-3"
            onEntered={() =>
              dispatch({
                type: "set",
                sentences: [[sent_id]],
              })
            }
            onExit={() => dispatch({ type: "unset" })}
          >
            <div className="highlight highlight-1 p-3 pb-2">
              <h6 className="d-inline">{t("professional_tone.issue")}</h6>{" "}
              <p className="d-inline">{issue}</p>
            </div>
            <div className="p-3">
              <h6 className="d-inline">{t("professional_tone.suggestion")}</h6>{" "}
              <p className="d-inline">{suggestion}</p>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

const Content: FC<ReviewToolContentProps<ProfessionalToneData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");

  return (
    <ReviewToolCard
      title={t("professional_tone.title")}
      instructionsKey={"professional_tone"}
      errorMessage={t("professional_tone.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("professional_tone_insights")}</p>}
            </Translation>
          </header>
          <section>
            <h5>{t("professional_tone.confidence")}</h5>
            <SentenceToneIssues
              issues={review.response.filter(
                ({ tone_type }) => tone_type === "confidence"
              )}
            />
          </section>
          <section>
            <h5>{t("professional_tone.subjectivity")}</h5>
            <SentenceToneIssues
              issues={review.response.filter(({ tone_type }) =>
                ["subjective", "subjectivity"].includes(tone_type)
              )}
            />
          </section>
          <section>
            <h5>{t("professional_tone.sentiment")}</h5>
            <SentenceToneIssues
              issues={review.response.filter(
                ({ tone_type }) => tone_type === "emotional"
              )}
            />
          </section>
        </section>
      ) : null}
    </ReviewToolCard>
  );
};

/** Professional Tone review tool component. */
export const ProfessionalTone: FC<HTMLProps<HTMLDivElement>> = ({
  ...props
}) => {
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] =
    useState<OptionalReviewData<ProfessionalToneData>>(null);
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
      const response = await fetch("/api/v2/review/professional_tone", {
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
      data: ProfessionalToneData;
    }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "professional_tone", error });
      console.error("Error fetching Professional Tone review:", error);
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

  return <Content review={review} isPending={mutation.isPending} {...props} />;
};

export const ProfessionalTonePreview: FC<
  PreviewCardProps<ProfessionalToneData>
> = ({ reviewID, analysis, ...props }) => {
  const [review, setReview] =
    useState<OptionalReviewData<ProfessionalToneData>>(analysis);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { id } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/snapshot/${id}/professional_tone`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: ProfessionalToneData) => {
      dispatch({ type: "unset" });
      // dispatch({ type: "update", sentences:  });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "professional_tone", error });
      console.error("Error fetching Professional Tone review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  useEffect(() => {
    console.log(
      "ProfessionalTonePreview useEffect triggered.",
      reviewID,
      analysis
    );
    if (!reviewID) return;
    if (analysis && analysis.tool === "professional_tone") {
      console.log("Using pre-fetched Professional Tone analysis data.");
      setReview(analysis as OptionalReviewData<ProfessionalToneData>);
      return;
    }
    console.log("Fetching Professional Tone analysis data.");
    mutation.mutate({
      id: reviewID,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [reviewID, analysis]);

  return <Content review={review} isPending={mutation.isPending} {...props} />;
};
