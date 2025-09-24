import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type HTMLProps,
} from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  isErrorData,
  type CivilToneData,
  type OptionalReviewData,
} from "../../../lib/ReviewResponse";
import type { WritingTask } from "../../../lib/WritingTask";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

/** Civil Tone Tool component. */
export const CivilTone: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] = useState<OptionalReviewData<CivilToneData>>(null);
  // const review = useCivilToneData();
  const id = useId();
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: WritingTask;
    }) => {
      const { document, writing_task } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch("/api/v2/review/civil_tone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document, writing_task }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Civil Tone review");
      }
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

  useEffect(() => {
    if (!document || !writing_task) return;
    // Fetch the review data for Civil Tone
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
          title={t("civil_tone.title")}
          instructionsKey="civil_tone"
        />
        {!review || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("civil_tone.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
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
                        <Accordion.Item
                          key={`${id}-${i}`}
                          eventKey={`${id}-${i}`}
                        >
                          <Accordion.Header className="accordion-header-highlight">
                            <h6 className="d-inline">
                              {t("civil_tone.prefix")}
                            </h6>{" "}
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
                              <h6 className="d-inline">
                                {t("civil_tone.issue")}
                              </h6>{" "}
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
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
