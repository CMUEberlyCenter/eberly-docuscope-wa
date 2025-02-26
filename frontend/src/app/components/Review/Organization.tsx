/**
  Here is a brief summary of what the icons mean.

      Disc — At least one sentence in the paragraph includes the word (topic) on the left side of the main verb of the sentence.
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
import classNames from "classnames";
import DT from "datatables.net-dt";
import "datatables.net-fixedcolumns-dt";
import DataTable from "datatables.net-react";
import { FC, HTMLProps, useCallback, useEffect, useState } from "react";
import { Alert, Button, Col, Container, Row } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import { useOnTopicData } from "../../service/review.service";
import { clearAllHighlights } from "../../service/topic.service";
import { Loading } from "../Loading/Loading";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import "./Organization.scss";
import { ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

DataTable.use(DT);

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
    return unit.is_topic_sent ? (
      <DotSolidCircle />
    ) : (
      <SolidCircle style={{ marginLeft: "0.3rem" }} />
    );
  }
  return unit.is_topic_sent ? (
    <DotOutlineCircle />
  ) : (
    <OutlineCircle style={{ marginLeft: "0.3rem" }} />
  );
};

/** Solid circle icon component. */
const SolidCircle: FC<HTMLProps<HTMLSpanElement>> = ({
  style,
  className,
  ...props
}) => (
  <Translation ns={"review"}>
    {(t) => (
      <i
        {...props}
        className={classNames(
          "fa-solid fa-circle text-organization",
          className
        )}
        style={{ ...style, fontSize: "1rem" }}
        title={t("organization.legend.before_verb")}
        aria-description={t("organization.legend.solid_circle")}
      ></i>
    )}
  </Translation>
);

/** Solid cirle with annotation dot icon component. */
const DotSolidCircle: FC<HTMLProps<HTMLSpanElement>> = ({
  className,
  ...props
}) => (
  <Translation ns={"review"}>
    {(t) => (
      <span
        {...props}
        className={classNames("text-nowrap text-organization", className)}
        title={t("organization.legend.before_topic")}
        aria-description={t("organization.legend.dot_solid_circle")}
      >
        <i
          className="fa-solid fa-circle"
          style={{ fontSize: "0.3rem", transform: "translateY(-0.75rem)" }}
        ></i>
        <i className="fa-solid fa-circle" style={{ fontSize: "1rem" }}></i>
      </span>
    )}
  </Translation>
);

/** Circle outline icon component. */
const OutlineCircle: FC<HTMLProps<HTMLSpanElement>> = ({
  style,
  className,
  ...props
}) => (
  <Translation ns={"review"}>
    {(t) => (
      <i
        {...props}
        className={classNames(
          "fa-regular fa-circle text-organization",
          className
        )}
        style={{ ...style, fontSize: "1rem" }}
        title={t("organization.legend.after_verb")}
        aria-description={t("organization.legend.empty_circle")}
      ></i>
    )}
  </Translation>
);

/** Circle outline with annotation dot icon component. */
const DotOutlineCircle: FC<HTMLProps<HTMLSpanElement>> = ({
  className,
  ...props
}) => (
  <Translation ns={"review"}>
    {(t) => (
      <span
        {...props}
        className={classNames("text-nowrap text-organization", className)}
        title={t("organization.legend.after_topic")}
        aria-description={t("organization.legend.dot_outline_circle")}
      >
        <i
          className="fa-solid fa-circle"
          style={{ fontSize: "0.3rem", transform: "translateY(-0.75rem)" }}
        ></i>
        <i className="fa-regular fa-circle" style={{ fontSize: "1rem" }}></i>
      </span>
    )}
  </Translation>
);

/** Legend for data representation for these tools. */
const Legend: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <Container>
        <Row xs={"auto"} md={"auto"} lg={2}>
          <Col>
            <SolidCircle /> {t("organization.legend.before_verb")}
          </Col>
          <Col>
            <DotSolidCircle /> <DotOutlineCircle />{" "}
            {t("organization.legend.topic")}
          </Col>
          <Col>
            <OutlineCircle /> {t("organization.legend.after_verb")}
          </Col>
          <Col>
            <span
              className="fake-btn border rounded border-primary text-center text-primary"
              // className="border rounded border-primary text-center px-2 text-primary"
              // className="btn btn-primary btn-sm"
              title={t("organization.legend.boxed_number")}
            >
              1
            </span>{" "}
            {t("organization.legend.location")}
          </Col>
        </Row>
      </Container>
    )}
  </Translation>
);

const OrganizationErrorFallback: FC<{ error?: Error }> = ({ error }) => (
  <Translation ns={"review"}>
    {(t) => (
      <Alert variant="danger">
        <p>{t("organization.error")}</p>
        <pre>{error?.message}</pre>
      </Alert>
    )}
  </Translation>
);

const CoherenceErrorFallback: FC<{ error?: Error }> = ({ error }) => (
  <Translation ns={"review"}>
    {(t) => (
      <Alert color="warning">
        {t("organizaion.error")}
        {error?.message}
      </Alert>
    )}
  </Translation>
);

type Topic = string[];
type SelectedRowCol = {
  paragraph?: number;
  topic?: Topic;
  sentence?: number;
} | null;
export const Organization: FC = () => {
  const { t } = useTranslation("review");
  const data = useOnTopicData();
  const showToggle = false;
  const [paragraphRange, setParagraphRange] = useState<number[]>([]);
  const [selected, setSelected] = useState<SelectedRowCol>(null);
  // const [selectedParagraph, setSelectedParagraph] = useState(-1);
  // const [selectedSentence, setSelectedSentence] = useState(-1);
  // const [selectedTopic, setSelectedTopic] = useState<string[]>([]);

  useEffect(() => {
    if (data && "response" in data) {
      setParagraphRange([
        ...Array(data.response.coherence?.num_paras ?? 0).keys(),
      ]);
    } else {
      setParagraphRange([]);
    }
    setSelected(null);
  }, [data]);

  const onSelectTopic = useCallback(
    (topic: Topic) => {
      setSelected({
        ...selected,
        topic: topic === selected?.topic ? undefined : topic,
      });
    },
    [selected]
  );
  const onSelectParagraph = useCallback(
    (paragraph: number) => {
      setSelected({
        ...selected,
        paragraph: selected?.paragraph === paragraph ? undefined : paragraph,
      });
    },
    [selected]
  );
  const onSelectCell = useCallback(
    (topic: Topic, paragraph: number) => {
      setSelected(
        selected?.paragraph === paragraph && selected?.topic === topic
          ? null
          : { paragraph, topic }
      );
    },
    [selected]
  );

  useEffect(() => {
    clearAllHighlights();
    selected?.topic?.forEach((topic) =>
      document
        .querySelectorAll(`.user-text .word[data-topic="${topic}"]`)
        .forEach((ele) => ele.classList.add("word-highlight"))
    );
    if (typeof selected?.paragraph === "number") {
      const ele = document.querySelector(
        `.user-text .paragraph[data-ds-paragraph="${selected.paragraph + 1}"]`
      );
      ele?.scrollIntoView({ behavior: "smooth", block: "center" });
      ele?.classList.add("paragraph-highlight");
    }
  }, [selected]);

  return (
    <ReviewReset>
      <article className="container-fluid organization">
        <ToolHeader
          title={t("organization.title")}
          instructionsKey="term_matrix"
        />
        {!data ? (
          <Loading />
        ) : (
          <ErrorBoundary FallbackComponent={OrganizationErrorFallback}>
            {/* {data.datetime && (
              <Card.Subtitle className="text-center">
                {new Date(data.datetime).toLocaleString()}
              </Card.Subtitle>
            )} */}
            <Legend />
            {/* <Card.Text>{t("organization.description")}</Card.Text> */}
            {/* <Card className="my-1">
              <Card.Header className="d-flex justify-content-between">
                <span>{t("organization.coherence.title")}</span> */}
            {/* <div
                  className="d-flex align-items-start"
                  onChange={() => setShowToggle(!showToggle)}
                >
                  <label className="form-check-label me-1" htmlFor={toggleId}>
                    {t("organization.coherence.topic_only")}
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
                </div> */}
            <ErrorBoundary FallbackComponent={CoherenceErrorFallback}>
              <div className="mt-1 mw-100 flex-grow-1">
                {isErrorData(data) ? <ReviewErrorData data={data} /> : null}
                {"response" in data && paragraphRange.length > 0 && (
                  <DataTable
                    options={{
                      paging: false,
                      order: [],
                      scrollCollapse: true,
                      scrollX: true,
                      scrollY: "50vh",
                      columnDefs: [
                        { targets: "no-sort", orderable: false },
                        { target: 0 },
                      ],
                      fixedColumns: { start: 1 },
                      caption: t("organization.coherence.title"),
                      searching: false,
                    }}
                  >
                    {/* <caption>{t("organization.coherence.title")}</caption> */}
                    <thead>
                      <tr>
                        {/* <td style={{ width: "150px" }}> */}
                        <th>{t("organization.coherence.paragraphs")}</th>
                        {paragraphRange.map((i) => (
                          <th
                            key={`key-paragraph-${i}`}
                            data-dt-order={false}
                            className="no-sort p-0 text-center"
                            onClick={() => onSelectParagraph(i)}
                          >
                            <Button
                              size="sm"
                              variant="outline-primary"
                              active={i === selected?.paragraph}
                              // onClick={() => onSelectParagraph(i)}
                            >
                              {`${i + 1}`}
                            </Button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Visualization Topics */}
                      {data?.response.coherence?.error
                        ? null
                        : data?.response.coherence?.data
                            .filter(
                              ({ is_topic_cluster }) =>
                                is_topic_cluster || !showToggle
                            )
                            .map(
                              (
                                { topic, is_non_local, paragraphs, sent_count },
                                i
                              ) => {
                                const topi =
                                  topic.at(2)?.replaceAll("_", " ") ?? "";
                                const [left, right] = ["l", "r"].map((lr) =>
                                  is_non_local ? lr : lr.toUpperCase()
                                );
                                const paraIconClass = is_non_local
                                  ? "topic-icon-small"
                                  : "topic-icon-large";
                                return (
                                  <tr
                                    key={`topic-paragraph-key-${i}`}
                                    className={
                                      topic === selected?.topic
                                        ? "bg-highlight"
                                        : ""
                                    }
                                  >
                                    <td
                                      data-search={topi}
                                      data-order={sent_count}
                                      className="p-0"
                                    >
                                      <Button
                                        className="w-100 text-primary text-start"
                                        variant="none"
                                        active={topic === selected?.topic}
                                        onClick={() => onSelectTopic(topic)}
                                      >
                                        {topi}
                                      </Button>
                                    </td>
                                    {paragraphs.map((paraType, j) => {
                                      const paraContent = `${
                                        paraType?.is_left ? left : right
                                      }${paraType?.is_topic_sent ? "" : "*"}`;
                                      return (
                                        <td
                                          key={`topic-key-${i}-${j}`}
                                          className={classNames(
                                            "p-0 text-center",
                                            selected?.paragraph === j
                                              ? "bg-highlight"
                                              : ""
                                          )}
                                        >
                                          {paraType ? (
                                            <Button
                                              variant="icon"
                                              title={paraContent}
                                              className={paraIconClass}
                                              onClick={() =>
                                                onSelectCell(topic, j)
                                              }
                                            >
                                              <IndicatorIcon unit={paraType} />
                                            </Button>
                                          ) : null}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              }
                            )}
                    </tbody>
                  </DataTable>
                )}
              </div>
              {/* {visualizationGlobal} */}
              {/* {true || selected?.paragraph ? null : (
                <div className="mw-100 mt-1 overflow-auto">
                  <table>
                    <caption>
                      {t("organization.coherence.sentences_in_paragraph", {
                        paragraph: selected?.paragraph ?? 0 + 1,
                      })}
                    </caption>
                    <thead>
                      <tr>
                        <td>{t("organization.coherence.sentences")}</td>
                        {data?.response.local
                          ?.at(selected?.paragraph ?? 0)
                          ?.data?.at(0)
                          ?.sentences.map((_sentence, i) => (
                            <td key={`key-sentence-${i}`}>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                active={selected?.sentence === i}
                                data-sentence={i}
                                // onClick={() =>
                                //   setSelectedSentence(
                                //     selectedSentence === i ? -1 : i
                                //   )
                                // }
                              >
                                {i + 1}
                              </Button>
                            </td>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.response.local
                        ?.at(selected?.paragraph ?? 0)
                        ?.data?.filter((topic) => !!topic)
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
                              <th>
                                <Button
                                  className="text-primary text-start"
                                  variant="none"
                                  // onClick={() =>
                                  //   setSelectedTopic(topic)
                                  //   // onTopicClick(selectedParagraph, i)
                                  // }
                                >
                                  {topi.replaceAll("_", " ")}
                                </Button>
                              </th>
                              {sentences.map((sentence, j) => {
                                const content = `${
                                  sentence?.is_left ? left : right
                                }${sentence?.is_topic_sent ? "" : "*"}`;
                                return (
                                  <td
                                    className="text-center p-0"
                                    key={`topic-sentence-key-${i}-${j}`}
                                  >
                                    <div
                                      className="topic-type-default"
                                      // onClick={() => {
                                      //   setSelectedSentence(selectedSentence === j ? );
                                      //   setSelectedTopic(topic);
                                      // }
                                      // }
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
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )} */}
            </ErrorBoundary>
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
