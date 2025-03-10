import classNames from "classnames";
import { FC, HTMLProps, useContext, useEffect, useState } from "react";
import { Alert, ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import {
  ClarityData,
  cleanAndRepairSentenceData,
} from "../../../lib/OnTopicData";
import { isErrorData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/sentence_density_icon.svg?react";
import { useOnTopicData, useOnTopicProse } from "../../service/review.service";
import { highlightSentence } from "../../service/topic.service";
import { Loading } from "../Loading/Loading";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import "./Sentences.scss";

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
const TopicTextIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "topic-text-icon")}>
    ■
  </span>
);
const ActiveVerbIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "active-verb-icon")}>
    ▲
  </span>
);
const BeVerbIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "be-verb-icon")}>
    ●
  </span>
);

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

export const Sentences: FC = () => {
  const { t } = useTranslation("review");
  const data = useOnTopicData();
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [sentenceDetails, setSentenceDetails] = useState<string | null>(null);
  const [htmlSentences, setHtmlSentences] = useState<null | string[][]>(null);
  const [textData, setTextData] = useState<ClarityData | undefined>();

  // Get the ontopic prose and send it to the context, ReviewContext handles "remove".
  const ontopicProse = useOnTopicProse();
  const dispatch = useContext(ReviewDispatchContext);
  useEffect(() => {
    if (ontopicProse) dispatch({ type: "update", sentences: ontopicProse });
  }, [ontopicProse]);

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
      <article className="container-fluid sentences overflow-auto d-flex flex-column flex-grow-1">
        <ToolHeader title={t("sentences.title")} instructionsKey="clarity" />
        {!data ? (
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
                            {sentence[2].NPS.slice(0, sentence[2].L_NPS).map(
                              (np, j) => (
                                <TopicTextIcon
                                  key={`s${i}-lnp${j}`}
                                  title={np}
                                />
                              )
                            )}
                          </td>
                          <td className="text-center">
                            {sentence[2].BE_VERB ? (
                              <BeVerbIcon />
                            ) : (
                              <ActiveVerbIcon />
                            )}
                          </td>
                          <td className="text-start">
                            {sentence[2].NPS.slice(-sentence[2].R_NPS).map(
                              (np, j) => (
                                <TopicTextIcon
                                  key={`s${i}-rnp${j}`}
                                  title={np}
                                />
                              )
                            )}
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
