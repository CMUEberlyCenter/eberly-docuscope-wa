import {
  OnTopicDataTools,
  OnTopicVisualization,
} from "@cmu-eberly-center/eberly-ontopic-visualization";
import { faSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useState } from "react";
import { Alert, Card } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Trans, Translation, useTranslation } from "react-i18next";
import { cleanAndRepairSentenceData } from "../../../lib/OnTopicData";
import SentencesIcon from "../../assets/icons/show_sentence_density_icon.svg?react";
import { useOnTopicData, useReview } from "../../service/review.service";
import { highlightSentence } from "../../service/topic.service";
import { Loading } from "../Loading/Loading";
import { ReviewReset } from "./ReviewContext";

export const SentencesTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span className="text-dark">
        <SentencesIcon /> {t("sentences.title")}
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

const Legend: FC = () => {
  const { t } = useTranslation("review");
  return (
    <div
      className="border rounded p-1 px-3 d-inline-flex flex-row flex-wrap"
      style={{ columnGap: "3rem" }}
    >
      <div>
        <FontAwesomeIcon icon={faSquare} style={{ color: "green" }} />{" "}
        {t("sentences.legend.noun")}
      </div>
      <div>
        <FontAwesomeIcon icon={faSquare} style={{ color: "red" }} />{" "}
        {t("sentences.legend.action")}
      </div>
      <div>
        <FontAwesomeIcon icon={faSquare} style={{ color: "blue" }} />{" "}
        {t("sentences.legend.passive")}
      </div>
    </div>
  );
};

const dataTools = new OnTopicDataTools();

export const Sentences: FC = () => {
  const { t } = useTranslation("review");
  const data = useOnTopicData();
  const review = useReview();
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [sentenceDetails, setSentenceDetails] = useState<string | null>(null);
  const [htmlSentences, setHtmlSentences] = useState<null | string[][]>(null);
  useEffect(
    () => setHtmlSentences(cleanAndRepairSentenceData(data?.response)),
    [data]
  );
  const [textData, setTextData] = useState(dataTools.getInitialData());

  useEffect(() => {
    setParagraphIndex(-1);
    setSentenceIndex(-1);
    setTextData({ plain: review.text, sentences: data?.response.clarity });
  }, [review, data]);

  useEffect(() => {
    if (paragraphIndex < 0 || sentenceIndex < 0) {
      setSentenceDetails(null);
    } else {
      setSentenceDetails(
        htmlSentences
          ?.at(paragraphIndex)
          ?.at(sentenceIndex)
          ?.replaceAll('\\"', '"') ?? null
      );
    }
  }, [htmlSentences, paragraphIndex, sentenceIndex]);

  const onHandleSentence = (paragraph: number, sentence: number) => {
    highlightSentence(paragraph, sentence);
    setParagraphIndex(paragraph);
    setSentenceIndex(sentence);
    // TODO text highlighting
  };

  return (
    <ReviewReset>
      <div className="overflow-auto">
        <h4>{t("sentences.title")}</h4>
        {!data ? (
          <Loading />
        ) : (
          <ErrorBoundary FallbackComponent={ClarityErrorFallback}>
            {/* {data.datetime && (
              <Card.Subtitle className="text-center">
                {new Date(data.datetime).toLocaleString()}
              </Card.Subtitle>
            )} */}
            <Legend />
            <div className="py-1">
              {sentenceDetails ? (
                <div dangerouslySetInnerHTML={{ __html: sentenceDetails }} />
              ) : (
                <p>{t("sentences.select")}</p>
              )}
            </div>
            <OnTopicVisualization
              mode="SENTENCE"
              singlepane={true}
              onFlip={() => undefined}
              onHandleTopic={() => undefined}
              onHandleSentence={onHandleSentence}
              loading={false}
              invalidated={false}
              textdata={textData}
              highlight={"#E2D2BB"}
            />
            <Card>
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
            </Card>
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
