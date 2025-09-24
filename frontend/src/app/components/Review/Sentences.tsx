import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import { type FC, type HTMLProps, useEffect, useRef, useState } from "react";
import { Alert, type ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import {
  type ClarityData,
  cleanAndRepairSentenceData,
} from "../../../lib/OnTopicData";
import {
  isErrorData,
  type OnTopicReviewData,
  type OptionalReviewData,
} from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/sentence_density_icon.svg?react";
import { highlightSentence } from "../../service/topic.service";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import "./Sentences.scss";

/** Button component for selecting the Sentences tool. */
export const SentencesButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("sentences.title")}
      tooltip={it("sentence_density_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Error feedback component for clarity tool. */
const ClarityErrorFallback: FC<{ error?: Error }> = ({ error }) => {
  const { t } = useTranslation("review");
  return (
    <Alert variant="danger">
      <p>{t("sentences.error")}</p>
      <pre>{error?.message}</pre>
    </Alert>
  );
};

type SentenceIconProps = HTMLProps<HTMLSpanElement>;
/** Icons component for topic text, a square. */
const TopicTextIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "topic-text-icon")}>
    ■
  </span>
);
/** Icons component for active verbs, a triangle. */
const ActiveVerbIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "active-verb-icon")}>
    ▲
  </span>
);
/** Icons component for be verbs, a circle. */
const BeVerbIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "be-verb-icon")}>
    ●
  </span>
);

/** Legend component for sentence icons. */
const Legend: FC = () => {
  const { t } = useTranslation("review");
  return (
    <div
      className="p-1 px-3 d-inline-flex flex-row flex-wrap"
      style={{ columnGap: "3rem" }}
    >
      <div className="topic-text">
        <TopicTextIcon />{" "}
        <span className="topic-text">{t("sentences.legend.noun")}</span>
      </div>
      <div>
        <ActiveVerbIcon />{" "}
        <span className="active-verb">{t("sentences.legend.action")}</span>
      </div>
      <div>
        <BeVerbIcon />{" "}
        <span className="be-verb">{t("sentences.legend.passive")}</span>
      </div>
    </div>
  );
};

/** Sentences review tool component. */
export const Sentences: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [data, setData] = useState<OptionalReviewData<OnTopicReviewData>>(null);
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [sentenceDetails, setSentenceDetails] = useState<string | null>(null);
  const [htmlSentences, setHtmlSentences] = useState<null | string[][]>(null);
  const [textData, setTextData] = useState<ClarityData | undefined>();

  // Get the ontopic prose and send it to the context, ReviewContext handles "remove".
  // const ontopicProse = useOnTopicProse();
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { document: string }) => {
      const { document } = data;
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch("/api/v2/review/ontopic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to update sentences");
      }
      return response.json();
    },
    onSuccess: (data: OnTopicReviewData) => {
      setData(data);
      if (data.response.html)
        dispatch({ type: "update", sentences: data.response.html });
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
    onError: (error) => {
      console.error("Error fetching Sentences review:", error);
      setData({ tool: "ontopic", error: { message: error.message } });
    },
  });
  useEffect(() => {
    if (!document || !writing_task) return;
    // Fetch the review data for Sentences
    dispatch({ type: "remove" });
    mutation.mutate({
      document,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [document, writing_task]);
  // useEffect(() => {
  //   if (ontopicProse) dispatch({ type: "update", sentences: ontopicProse });
  // }, [ontopicProse]);

  useEffect(
    () =>
      setHtmlSentences(
        !isErrorData(data) ? cleanAndRepairSentenceData(data?.response) : null
      ),
    [data]
  );

  useEffect(() => {
    setParagraphIndex(-1);
    setSentenceIndex(-1);
    setTextData(!isErrorData(data) ? data?.response.clarity : undefined);
  }, [data]);

  useEffect(() => {
    if (paragraphIndex < 0 || sentenceIndex < 0) {
      setSentenceDetails(null);
    } else {
      setSentenceDetails(
        htmlSentences
          ?.at(paragraphIndex - 1)
          ?.at(sentenceIndex - 1)
          ?.replaceAll('\\"', '"') ?? null
      );
    }
  }, [htmlSentences, paragraphIndex, sentenceIndex]);

  const onHandleSentence = (paragraph: number, sentence: number) => {
    if (paragraph === paragraphIndex && sentence === sentenceIndex) {
      setParagraphIndex(-1);
      setSentenceIndex(-1);
      highlightSentence(-1, -1);
    } else {
      highlightSentence(paragraph - 1, sentence - 1);
      setParagraphIndex(paragraph);
      setSentenceIndex(sentence);
    }
    // TODO text highlighting
  };

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid sentences overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader title={t("sentences.title")} instructionsKey="clarity" />
        {!data || mutation.isPending ? (
          <Loading />
        ) : (
          <ErrorBoundary FallbackComponent={ClarityErrorFallback}>
            {/* {data.datetime && (
              <Card.Subtitle className="text-center">
                {new Date(data.datetime).toLocaleString()}
              </Card.Subtitle>
            )} */}
            {isErrorData(data) ? <ReviewErrorData data={data} /> : null}
            <Legend />
            <div className="py-1 overflow-auto sentence-display mb-1">
              {sentenceDetails ? (
                <div dangerouslySetInnerHTML={{ __html: sentenceDetails }} />
              ) : (
                <p>{t("sentences.select")}</p>
              )}
            </div>
            {
              <div className="overflow-auto w-100 h-100">
                <table className="sentence-data align-middle table-hover w-100">
                  <tbody>
                    {textData?.map((sentence, i) =>
                      typeof sentence === "string" ? (
                        <tr key={`p${i}`}>
                          <td className="paragraph-count" colSpan={3}>
                            &nbsp;
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={`p${sentence.at(0)}-s${sentence.at(1)}`}
                          className={classNames(
                            "selectable",
                            paragraphIndex === sentence.at(0) &&
                              sentenceIndex === sentence.at(1)
                              ? "table-active"
                              : ""
                          )}
                          onClick={() =>
                            onHandleSentence(sentence[0], sentence[1])
                          }
                        >
                          <td className="text-end">
                            {sentence[2].sent_analysis.NPS.slice(
                              0,
                              sentence[2].sent_analysis.L_NPS
                            ).map((np, j) => (
                              <TopicTextIcon key={`s${i}-lnp${j}`} title={np} />
                            ))}
                          </td>
                          <td className="text-center">
                            {sentence[2].sent_analysis.BE_VERB ? (
                              <BeVerbIcon
                                title={sentence[2].sent_analysis.TOKENS.filter(
                                  ({ is_root }) => is_root
                                )
                                  .map(({ text }) => text)
                                  .join(" ")}
                              />
                            ) : (
                              <ActiveVerbIcon
                                title={sentence[2].sent_analysis.TOKENS.filter(
                                  ({ is_root }) => is_root
                                )
                                  .map(({ text }) => text)
                                  .join(" ")}
                              />
                            )}
                          </td>
                          <td className="text-start">
                            {sentence[2].sent_analysis.NPS.slice(
                              -sentence[2].sent_analysis.R_NPS
                            ).map((np, j) => (
                              <TopicTextIcon key={`s${i}-rnp${j}`} title={np} />
                            ))}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            }
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
