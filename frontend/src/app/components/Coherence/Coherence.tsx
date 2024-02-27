/**
 * @fileoverview Contents of the Coherence tool.
 *
 * The top has a legend for interpreting this tool's symbols.
 */
import { FC, useCallback, useEffect, useId, useState } from "react";
import { Alert, Button, Card, Col, Container, Row } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useOnTopic } from "../../service/onTopic.service";
import {
  highlightParagraph,
  highlightSentence,
  highlightTopic,
} from "../../service/topic.service";
import TabTitle from "../TabTitle/TabTitle";
import "./Coherence.scss";

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
  <i
    className="fa-solid fa-circle text-legend"
    title="Topic before the main verb"
    aria-description="A filled circle."
  ></i>
);

/** Solid cirle with annotation dot icon component. */
const DotSolidCircle: FC = () => (
  <span
    className="text-nowrap"
    title="Topic before the main verb of a topic sentence"
    aria-description="A solid circle with a small circle in the upper left corner."
  >
    <i
      className="fa-solid fa-circle text-legend"
      style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
    ></i>
    <i className="fa-solid fa-circle text-legend"></i>
  </span>
);

/** Circle outline icon component. */
const OutlineCircle: FC = () => (
  <i
    className="fa-regular fa-circle text-legend"
    title="Topic after the main verb"
    aria-description="An empty circle."
  ></i>
);

/** Circle outline with annotation dot icon component. */
const DotOutlineCircle: FC = () => (
  <span
    className="text-nowrap"
    title="Topic after the main verb of a topic sentence"
    aria-description="A empty circle with a small circle in the upper left corner."
  >
    <i
      className="fa-solid fa-circle text-legend"
      style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
    ></i>
    <i className="fa-regular fa-circle text-legend"></i>
  </span>
);

/** Legend for data representation for these tools. */
const Legend: FC = () => (
  <Container className="border p-2">
    <Row xs={"auto"} md={"auto"} lg={2}>
      <Col>
        <SolidCircle /> Topic before the main verb
      </Col>
      <Col>
        <DotSolidCircle /> Topic before the main verb of a topic sentence
      </Col>
      <Col>
        <OutlineCircle /> Topic after the main verb
      </Col>
      <Col>
        <span className="btn btn-outline-secondary" title="A boxed number.">
          1
        </span>{" "}
        Paragraph/Sentence number
      </Col>
    </Row>
  </Container>
);

/**
 * Coherence tool component
 * @component
 */
const Coherence: FC = () => {
  const toggleId = useId();
  const [showToggle, setShowToggle] = useState(true);
  const data = useOnTopic();
  const [paragraphRange, setParagraphRange] = useState<number[]>([]);
  const [selectedParagraph, setSelectedParagraph] = useState(-1);
  const [selectedSentence, setSelectedSentence] = useState(-1);
  useEffect(() => {
    setParagraphRange([...Array(data?.coherence?.num_paras ?? 0).keys()]);
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
      const topics = data?.coherence?.data[index].topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, -1, topics.length ? topics : [topic]);
    },
    [data]
  );
  const onTopicClick = useCallback(
    (paragraph: number, sentence: number) => {
      const topics = data?.coherence?.data[paragraph].topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, sentence, topics);
    },
    [data]
  );

  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Create Flow in Your Writing</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <Legend />
        <Card.Text>
          The Coherence Panel charts the flow of your topic clusters across and
          within paragraphs. Dark circles indicate that a particular topic
          cluster is prominently discussed in a particular paragraph. White
          circles and gaps indicate that a particular topic cluster is mentioned
          but not prominently or not mentioned at all in the paragraph. Study
          the visualization for dark/white circles and gaps and see if the
          shifts in topic clusters and their prominence fits a writing plan your
          readers can easily follow.
        </Card.Text>
        <Card className="mb-1">
          <Card.Header className="d-flex justify-content-between">
            <span>Coherence across paragraphs</span>
            <div
              className="d-flex align-items-start"
              onChange={() => setShowToggle(!showToggle)}
            >
              <label className="form-check-label me-1" htmlFor={toggleId}>
                Show only topic clusters:
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
          <Card.Body className="overflow-auto">
            <table>
              <tbody>
                <tr>
                  <td>Paragraphs:</td>
                  <td>
                    <div className="d-flex flex-row">
                      {paragraphRange.map((i) => (
                        <Button size="sm"
                          variant="outline-secondary"
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
                <ErrorBoundary fallback={<tr><td><Alert color="warning">Error loading coherence data!</Alert></td></tr>}>
                  {data?.coherence?.error
                    ? null
                    : data?.coherence?.data
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
                                variant="outline-secondary"
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
                          Coherence across sentences in paragraph:{" "}
                          {selectedParagraph + 1}
                        </td>
                      </tr>
                      <tr>
                        <td>Sentences:</td>
                        <td>
                          <div className="d-flex flex-row">
                            {data?.local
                              ?.at(selectedParagraph)
                              ?.data.at(0)
                              ?.sentences.map((sentence, i) => (
                                <Button
                                  key={`key-sentence-${i}`}
                                  variant="outline-secondary"
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
                      {data?.local
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
                                  variant="outline-secondary"
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
        {/* <Card>  Currently unused
          <Card.Header>Topic Cluster</Card.Header>
          <Card.Body> {detail} </Card.Body>
        </Card> */}
      </Card.Body>
    </Card>
  );
};

export default Coherence;
