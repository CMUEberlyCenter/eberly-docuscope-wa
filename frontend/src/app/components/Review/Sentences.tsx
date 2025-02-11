import classNames from "classnames";
import { FC, HTMLProps, useEffect, useState } from "react";
import { Alert, ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  ClarityData,
  cleanAndRepairSentenceData,
} from "../../../lib/OnTopicData";
import { isErrorData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/show_sentence_density_icon.svg?react";
import { useOnTopicData, useReview } from "../../service/review.service";
import { highlightSentence } from "../../service/topic.service";
import { Loading } from "../Loading/Loading";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import "./Sentences.scss";

export const SentencesButton: FC<ButtonProps> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <ToolButton
        {...props}
        title={t("sentences.title")}
        tooltip={t("sentences.tooltip")}
        icon={<Icon />}
      />
    )}
  </Translation>
);
export const SentencesTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        <Icon /> {t("sentences.title")}
      </span>
    )}
  </Translation>
);

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

type TextData = {
  plain: string;
  sentences?: ClarityData;
};

export const Sentences: FC = () => {
  const { t } = useTranslation("review");
  const data = useOnTopicData();
  const review = useReview();
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [sentenceDetails, setSentenceDetails] = useState<string | null>(null);
  const [htmlSentences, setHtmlSentences] = useState<null | string[][]>(null);
  useEffect(
    () =>
      setHtmlSentences(
        !isErrorData(data) ? cleanAndRepairSentenceData(data?.response) : null
      ),
    [data]
  );
  const [textData, setTextData] = useState<TextData>({ plain: "" });

  useEffect(() => {
    setParagraphIndex(-1);
    setSentenceIndex(-1);
    setTextData({
      plain: review.segmented,
      sentences: !isErrorData(data) ? data?.response.clarity : undefined,
    });
  }, [review, data]);

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
      <article className="container-fluid sentences d-flex flex-column h-100">
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
                    {textData.sentences?.map((sentence, i) =>
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
            {/* <OnTopicVisualization
              mode="SENTENCE"
              singlepane={true}
              onFlip={() => undefined}
              onHandleTopic={() => undefined}
              onHandleSentence={onHandleSentence}
              loading={false}
              invalidated={false}
              textdata={textData}
              highlight={"#E2D2BB"}
            /> */}
            {/* <Card>
              <Card.Body>
                <p>
                  <Trans
                    t={t}
                    i18nKey={"sentences.details.overview"}
                    components={{ b: <b /> }}
                  />
                </p>
                <p>
                  <Trans
                    t={t}
                    i18nKey={"sentences.details.description"}
                    components={{ b: <b /> }}
                  />
                </p>
                <p>
                  <Trans
                    t={t}
                    i18nKey={"sentences.details.read_aloud"}
                    components={{ b: <b /> }}
                  />
                </p>
                <p>
                  <Trans
                    t={t}
                    i18nKey={"sentences.details.passive"}
                    components={{ b: <b /> }}
                  />
                </p>
              </Card.Body>
            </Card> */}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
