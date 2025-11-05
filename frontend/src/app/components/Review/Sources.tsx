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
import {
  isErrorData,
  type OptionalReviewData,
  type Source,
  type SourcesData,
  type SourceType,
} from "../../../lib/ReviewResponse";
import type { WritingTask } from "../../../lib/WritingTask";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";
import { checkReviewResponse, ReviewErrorData } from "./ReviewError";
import type { Optional } from "../../..";
import { check } from "better-auth";

/** Accordion component for displaying citations. */
const Citations: FC<
  AccordionProps & { citations?: Source[]; emptyText?: string }
> = ({ citations, emptyText, ...props }) => {
  const dispatch = useReviewDispatch();
  const id = useId();
  const { t } = useTranslation("review");

  if (!citations?.length && emptyText) {
    return <p>{emptyText}</p>;
  }

  return (
    <Accordion {...props}>
      {citations?.map(({ names, assessment, sent_ids }, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">
              <h6 className="d-inline">{t("sources.source")}</h6>{" "}
              <p className="d-inline">{names}</p>
            </div>
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "set", sentences: [sent_ids] })}
            onExit={() => dispatch({ type: "unset" })}
          >
            {assessment}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

/** Sources review tool component. */
export const Sources: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  // const review = useSourcesData();
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] = useState<OptionalReviewData<SourcesData>>(null);
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
      const response = await fetch("/api/v2/review/sources", {
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
    onSuccess: ({ input, data }: { input: string; data: SourcesData }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool: "sources", error });
      console.error("Error fetching Sources review:", error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  // When the document or writing task changes, fetch a new review
  useEffect(() => {
    if (!document) return;
    mutation.mutate({ document, writing_task });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [document, writing_task]);

  const [sources, setSources] = useState<Partial<Record<SourceType, Source[]>>>(
    {}
  );
  useEffect(() => {
    if (
      review &&
      "response" in review &&
      "sources" in review.response &&
      review.response.sources
    ) {
      const data = Object.groupBy(
        review.response.sources,
        ({ src_type }) => src_type
      );
      setSources(data);
    }
  }, [review]);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader title={t("sources.title")} instructionsKey="sources" />
        {!review || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("sources.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            {"response" in review ? (
              <section className="mb-3">
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("sources_insights")}</p>}
                  </Translation>
                </header>
                {review.response.issues.length <= 0 ? (
                  <Alert variant="info">{t("sources.no_issues")}</Alert>
                ) : (
                  <Accordion>
                    {review.response.issues.map(
                      ({ issue, suggestion, sent_ids }, i) => (
                        <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                          <Accordion.Header className="accordion-header-highlight">
                            <div>
                              <h6 className="d-inline">{t("sources.issue")}</h6>{" "}
                              <p className="d-inline">{issue}</p>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body
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
                      )
                    )}
                  </Accordion>
                )}
              </section>
            ) : null}
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("sources.types.title")}</h5>
                  <p>{t("sources.types.subtitle")}</p>
                </header>
                <section>
                  <h6>{t("sources.supportive.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.supporting}
                    emptyText={t("sources.supportive.null")}
                  />
                </section>
                <section>
                  <h6>{t("sources.hedged.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.hedged}
                    emptyText={t("sources.hedged.null")}
                  />
                </section>
                <section>
                  <h6>{t("sources.alternative.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.alternative}
                    emptyText={t("sources.alternative.null")}
                  />
                </section>
                <section>
                  <h6>{t("sources.neutral.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.neutral}
                    emptyText={t("sources.neutral.null")}
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
