/**
  Here is a brief summary of what the icons mean.

      Dark circle — At least one sentence in the paragraph includes the word (topic) on the left side of the main verb of the sentence.
      Hollow circle — All of the instances of the word (topic) in the paragraph are on the right side of the sentences.
      Dot on the shoulder — If the word (topic) appears in the first sentence of the paragraph a small dot is added to the icon. The dot can bee added to (1) or (2) above. 

  So, there are 4 possible icons.

  When topic clusters (groups of words/topics) are used, (1) and (2) above can be show at a much smaller size. These small icons are used if a topic does not satisfy the requirement for Global Topic.

  The following is a brief definition of global and local topics.

  A topic is a global topic if:

      it appears in 2 or more paragraphs, AND
      it appears at least once on the left side of the main verb in a sentence, AND
      it is also a Local Topic. 

  A topic is a local topic in a given paragraph if:

      it appears in 2 or more sentences within the paragraph, AND
      it appears at least once on the left side of the main verb in a sentence within the paragraph. 

 */

import { FC, useCallback, useEffect, useId, useState } from "react";
import { Alert, Button, Card, Col, Container, Row } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import { useOnTopicData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { ErrorBoundary } from "react-error-boundary";
import { t } from "i18next";
import { highlightParagraph, highlightSentence, highlightTopic } from "../../service/topic.service";

type IndicatorIconProps = {
  unit: {
    is_left: boolean;
    is_topic_sent: boolean;
  } | null;
};
/** Component for rendering the appropriate icon. */
const IndicatorIcon: FC<IndicatorIconProps> = ({
  unit,
}: IndicatorIconProps) => {
  if (unit === null) return undefined;
  if (unit.is_left) {
    return unit.is_topic_sent ? <DotSolidCircle /> : <SolidCircle />;
  }
  return unit.is_topic_sent ? <DotOutlineCircle /> : <OutlineCircle />;
};

/** Solid circle icon component. */
const SolidCircle: FC = () => (
  <Translation ns={'review'}>{(t) =>
    <i
      className="fa-solid fa-circle text-organization"
      title={t('organization.legend.before_verb')}
      aria-description={t('organization.legend.solid_circle')}
    ></i>}
  </Translation>
);

/** Solid cirle with annotation dot icon component. */
const DotSolidCircle: FC = () => (
  <Translation ns={'review'}>{(t) => (
    <span
      className="text-nowrap text-organization"
      title={t('organization.legend.before_topic')}
      aria-description={t('organization.legend.dot_solid_circle')}
    >
      <i
        className="fa-solid fa-circle"
        style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
      ></i>
      <i className="fa-solid fa-circle"></i>
    </span>)}
  </Translation>
);

/** Circle outline icon component. */
const OutlineCircle: FC = () => (
  <Translation ns={'review'}>{t => (
    <i
      className="fa-regular fa-circle text-organization"
      title={t('organizaion.legend.after_verb')}
      aria-description={t('organization.legend.empty_circle')}
    ></i>)}
  </Translation>
);

/** Circle outline with annotation dot icon component. */
const DotOutlineCircle: FC = () => (
  <span
    className="text-nowrap text-organization"
    title={t('organization.legend.after_topic')}
    aria-description={t('organization.legend.dot_outline_circle')}>
    <i
      className="fa-solid fa-circle"
      style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
    ></i>
    <i className="fa-regular fa-circle"></i>
  </span>
);

/** Legend for data representation for these tools. */
const Legend: FC = () => {
  const { t } = useTranslation('review');
  return (
    <Container className="border p-2">
      <Row xs={"auto"} md={"auto"} lg={2}>
        <Col>
          <SolidCircle /> {t('organization.legend.before_verb')}
        </Col>
        <Col>
          <DotSolidCircle /> {t('organization.legend.before_topic')}
        </Col>
        <Col>
          <OutlineCircle /> {t('organization.legend.after_verb')}
        </Col>
        <Col>
          <DotOutlineCircle /> {t('organization.legend.after_topic')}
        </Col>
        <Col>
          <span className="btn btn-outline-dark" title={t('organization.legend.boxed_number')}>
            1
          </span>{" "}
          {t('organization.legend.location')}
        </Col>
      </Row>
    </Container>
  )
};

const OrganizationErrorFallback: FC<{ error?: Error }> = ({
  error
}) => {
  const { t } = useTranslation('review');
  return (
    <Alert variant="danger">
      <p>{t('organization.error')}</p>
      <pre>{error?.message}</pre>
    </Alert>
  )
};

const CoherenceErrorFallback: FC<{ error?: Error }> = ({ error }) => {
  const { t } = useTranslation('review');
  return (
    <tr>
      <td>
        <Alert color="warning">
          {t('organizaion.error')}
          {error?.message}
        </Alert>
      </td>
    </tr>
  );
};


export const Organization: FC = () => {
  const toggleId = useId();
  const { t } = useTranslation('review');
  const data = useOnTopicData();
  const [showToggle, setShowToggle] = useState(true);
  const [paragraphRange, setParagraphRange] = useState<number[]>([]);
  const [selectedParagraph, setSelectedParagraph] = useState(-1);
  const [selectedSentence, setSelectedSentence] = useState(-1);
  useEffect(() => {
    setParagraphRange([...Array(data?.response.coherence?.num_paras ?? 0).keys()]);
    setSelectedParagraph(-1);
    setSelectedSentence(-1);
  }, [data]);

  useEffect(() => {
    setSelectedSentence(-1);
    highlightParagraph(selectedParagraph);
  }, [selectedParagraph]);
  useEffect(
    () => highlightSentence(selectedParagraph, selectedSentence),
    [selectedParagraph, selectedSentence]
  );
  const onTopicParagraphClick = useCallback(
    (index: number, paragraph: number, topic: string) => {
      const topics = data?.response.coherence?.data[index].topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, -1, topics.length ? topics : [topic]);
    },
    [data]
  );
  const onTopicClick = useCallback(
    (paragraph: number, sentence: number) => {
      const topics = data?.response.coherence?.data[paragraph].topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, sentence, topics);
    },
    [data]
  );

  return (
    <Card>
      <Card.Body>
        <Card.Title className="text-center">
          {t('organization.title')}
        </Card.Title>
        {!data ? (
          <Loading />
        ) : (
          <ErrorBoundary FallbackComponent={OrganizationErrorFallback}>
            <Legend />
            <Card.Text>
              {t('organization.description')}
            </Card.Text>
            <Card className="mb-1">
              <Card.Header className="d-flex justify-content-between">
                <span>{t('organization.coherence.title')}</span>
                <div
                  className="d-flex align-items-start"
                  onChange={() => setShowToggle(!showToggle)}
                >
                  <label className="form-check-label me-1" htmlFor={toggleId}>
                    {t('organization.coherence.topic_only')}
                  </label>
                  <div className="form-check form-switch">
                    <input
                      onChange={() => { }}
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id={toggleId}
                      checked={showToggle}
                    />
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <table>
                  <tbody>
                    <tr>
                      <td>{t('organization.coherence.paragraphs')}</td>
                      <td>
                        <div className="d-flex flex-row">
                          {paragraphRange.map((i) => (
                            <Button
                              size="sm"
                              variant="outline-dark"
                              key={`key-paragraph-${i}`}
                              active={i === selectedParagraph}
                              onClick={() =>
                                setSelectedParagraph(
                                  i === selectedParagraph ? -1 : i
                                )
                              }
                            >
                              {`${i + 1}`}
                            </Button>
                          ))}
                          <div
                            key="key-paragraph-padding"
                            className="flex-grow-1"
                          ></div>
                        </div>
                      </td>
                    </tr>
                    {/* Visualization Topics */}
                    <ErrorBoundary
                      FallbackComponent={CoherenceErrorFallback}>
                      {data?.response.coherence?.error
                        ? null
                        : data?.response.coherence?.data
                          .filter(
                            ({ is_topic_cluster }) =>
                              is_topic_cluster || !showToggle
                          )
                          .map(({ topic, is_non_local, paragraphs }, i) => {
                            const topi = topic.at(2) ?? "";
                            const [left, right] = ["l", "r"].map((lr) =>
                              is_non_local ? lr : lr.toUpperCase()
                            );
                            const paraIconClass = is_non_local
                              ? "topic-icon-small"
                              : "topic-icon-large";
                            return (
                              <tr key={`topic-paragraph-key-${i}`}>
                                <td style={{ width: "150px" }}>
                                  <Button
                                    className="w-100"
                                    variant="outline-dark"
                                    onClick={() =>
                                      highlightTopic(selectedParagraph, i, topic)
                                    }
                                  >
                                    {topi.replaceAll("_", " ")}
                                  </Button>
                                </td>
                                <td>
                                  <div className="d-flex flex-row">
                                    {paragraphs.map((paraType, j) => {
                                      const paraContent = `${paraType?.is_left ? left : right
                                        }${paraType?.is_topic_sent ? "" : "*"}`;
                                      return (
                                        <div
                                          key={`topic-key-${i}-${j}`}
                                          className="topic-type-default"
                                          onClick={() =>
                                            onTopicParagraphClick(i, j, topi)
                                          }
                                        >
                                          {paraType ? (
                                            <span
                                              title={paraContent}
                                              className={paraIconClass}
                                            >
                                              <IndicatorIcon unit={paraType} />
                                            </span>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      {/* {visualizationGlobal} */}
                      {selectedParagraph < 0 ? null : (
                        <>
                          <tr>
                            <td colSpan={2} className="topic-separator">
                              {t('organization.coherence.sentences_in_paragraph', {paragraph: selectedParagraph + 1})}
                            </td>
                          </tr>
                          <tr>
                            <td>{t('organization.coherence.sentences')}</td>
                            <td>
                              <div className="d-flex flex-row">
                                {data?.response.local
                                  ?.at(selectedParagraph)
                                  ?.data.at(0)
                                  ?.sentences.map((_sentence, i) => (
                                    <Button
                                      key={`key-sentence-${i}`}
                                      variant="outline-dark"
                                      active={selectedSentence === i}
                                      data-sentence={i}
                                      onClick={() =>
                                        setSelectedSentence(
                                          selectedSentence === i ? -1 : i
                                        )
                                      }
                                    >
                                      {i + 1}
                                    </Button>
                                  ))}
                                <div
                                  key="key-sentence-padding"
                                  className="flex-grow-1"
                                ></div>
                              </div>
                            </td>
                          </tr>
                          {data?.response.local
                            ?.at(selectedParagraph)
                            ?.data.filter((topic) => !!topic)
                            .map(({ topic, is_non_local, sentences }, i) => {
                              const topi = topic.at(2) ?? "";
                              const [left, right] = ["l", "r"].map((lr) =>
                                is_non_local ? lr : lr.toUpperCase()
                              );
                              const iconClass = is_non_local
                                ? "topic-icon-small"
                                : "topic-icon-large";
                              return (
                                <tr key={`topic-sentence-key-${i}`}>
                                  <td style={{ width: "150px" }}>
                                    <Button
                                      className="w-100"
                                      variant="outline-dark"
                                      onClick={() =>
                                        onTopicClick(selectedParagraph, i)
                                      }
                                    >
                                      {topi.replaceAll("_", " ")}
                                    </Button>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-row">
                                      {sentences.map((sentence, j) => {
                                        const content = `${sentence?.is_left ? left : right
                                          }${sentence?.is_topic_sent ? "" : "*"}`;
                                        return (
                                          <div
                                            key={`topic-sentence-key-${i}-${j}`}
                                            className="topic-type-default"
                                            onClick={() =>
                                              onTopicParagraphClick(i, j, topi)
                                            }
                                          >
                                            {sentence ? (
                                              <span
                                                title={content}
                                                className={iconClass}
                                              >
                                                <IndicatorIcon unit={sentence} />
                                              </span>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </>
                      )}
                    </ErrorBoundary>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </ErrorBoundary>
        )}
      </Card.Body>
    </Card >
  );
}