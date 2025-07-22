import classNames from "classnames";
import {
  type FC,
  type HTMLProps,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Accordion, Alert, type ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData, type LogicalFlowData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/global_coherence_icon.svg?react";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { useFileText } from "../FileUpload/FileUploadContext";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import { useMutation } from "@tanstack/react-query";
import type { WritingTask } from "../../../lib/WritingTask";

/** Button component for selecting the Logical Flow tool. */
export const LogicalFlowButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:logical_flow.title")}
      tooltip={t("instructions:logical_flow_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Logical Flow review tool component. */
export const LogicalFlow: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const document = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] = useState<LogicalFlowData | null>(null); // useLogicalFlowData();
  const id = useId();
  const dispatch = useContext(ReviewDispatchContext);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: WritingTask;
    }) => {
      const { document, writing_task } = data;
      abortControllerRef.current = new AbortController();
      const response = await fetch("/api/v2/review/logical_flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document, writing_task }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Logical Flow review");
      }
      return response.json();
    },
    onSuccess: ({ input, data }: { input: string; data: LogicalFlowData }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      setReview(data);
    },
    onError: (error) => {
      // TODO: handle error appropriately
      console.error("Error fetching Logical Flow review:", error);
    },
  });
  useEffect(() => {
    if (!document || !writing_task) return;
    // Fetch the review data for Logical Flow
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
          title={t("logical_flow.title")}
          instructionsKey="logical_flow"
        />
        {!review || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("logical_flow.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            <section>
              <header>
                <h5 className="text-primary">{t("insights")}</h5>
                <Translation ns="instructions">
                  {(t) => <p>{t("logical_flow_insights")}</p>}
                </Translation>
              </header>
              {"response" in review ? (
                <Accordion>
                  {review.response.map(
                    ({ issue, suggestion, sent_ids, para_ids }, i) => (
                      <Accordion.Item
                        key={`${id}-${i}`}
                        eventKey={`${id}-${i}`}
                      >
                        <Accordion.Header className="accordion-header-highlight">
                          <div className="flex-grow-1">
                            <h6 className="d-inline">
                              {t("logical_flow.issue")}
                            </h6>{" "}
                            <span>{issue}</span>
                          </div>
                          <AlertIcon
                            show={sent_ids.length + para_ids.length === 0}
                            message={t("logical_flow.no_sentences")}
                          />
                        </Accordion.Header>
                        <Accordion.Body
                          onEntered={() =>
                            dispatch({
                              type: "set",
                              sentences: [sent_ids],
                              paragraphs: para_ids,
                            })
                          }
                          onExit={() => dispatch({ type: "unset" })}
                        >
                          <h6 className="d-inline">
                            {t("logical_flow.suggestion")}
                          </h6>{" "}
                          <p className="d-inline">{suggestion}</p>
                        </Accordion.Body>
                      </Accordion.Item>
                    )
                  )}
                </Accordion>
              ) : null}
            </section>
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
