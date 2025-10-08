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
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import type { Optional } from "../../..";
import {
  isErrorData,
  type OptionalReviewData,
  type ProfessionalToneData,
  type ProfessionalToneOutput,
} from "../../../lib/ReviewResponse";
import type { WritingTask } from "../../../lib/WritingTask";
import Icon from "../../assets/icons/professional_tone_icon.svg?react";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

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

/** Professional Tone review tool component. */
export const ProfessionalTone: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
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
      if (!response.ok) {
        throw new Error("Failed to fetch Professional Tone review");
      }
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
          title={t("professional_tone.title")}
          instructionsKey="professional_tone"
        />
        {!review || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("professional_tone.error")}</Alert>
            }
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
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
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
