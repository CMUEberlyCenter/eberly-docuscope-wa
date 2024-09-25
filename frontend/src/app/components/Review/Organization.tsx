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
import DT, { ConfigColumns } from "datatables.net-dt";
import "datatables.net-fixedcolumns-dt";
import DataTable from "datatables.net-react";
import { FC, HTMLProps, useCallback, useEffect, useState } from "react";
import { Alert, Button, Col, Container, Row } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { CoherenceParagraph } from "../../../lib/OnTopicData";
import TermMatrixIcon from "../../assets/icons/show_term_matrix_icon.svg?react";
import { useOnTopicData } from "../../service/review.service";
import {
  highlightParagraph,
  highlightSentence,
  highlightTopic,
} from "../../service/topic.service";
import { Loading } from "../Loading/Loading";
import "./Organization.scss";
import { ReviewReset } from "./ReviewContext";

DataTable.use(DT);

export const OrganizationTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props} className={classNames(props.className, "text-primary")}>
        <TermMatrixIcon /> {t("organization.title")}
      </span>
    )}
  </Translation>
);

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
  <Translation ns={"review"}>
    {(t) => (
      <i
        className="fa-solid fa-circle text-organization"
        title={t("organization.legend.before_verb")}
        aria-description={t("organization.legend.solid_circle")}
      ></i>
    )}
  </Translation>
);

/** Solid cirle with annotation dot icon component. */
const DotSolidCircle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span
        className="text-nowrap text-organization"
        title={t("organization.legend.before_topic")}
        aria-description={t("organization.legend.dot_solid_circle")}
      >
        <i
          className="fa-solid fa-circle"
          style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
        ></i>
        <i className="fa-solid fa-circle"></i>
      </span>
    )}
  </Translation>
);

/** Circle outline icon component. */
const OutlineCircle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <i
        className="fa-regular fa-circle text-organization"
        title={t("organization.legend.after_verb")}
        aria-description={t("organization.legend.empty_circle")}
      ></i>
    )}
  </Translation>
);

/** Circle outline with annotation dot icon component. */
const DotOutlineCircle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span
        className="text-nowrap text-organization"
        title={t("organization.legend.after_topic")}
        aria-description={t("organization.legend.dot_outline_circle")}
      >
        <i
          className="fa-solid fa-circle"
          style={{ fontSize: "0.3em", transform: "translateY(-0.75rem)" }}
        ></i>
        <i className="fa-regular fa-circle"></i>
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

type CellData =
  | (CoherenceParagraph & { is_non_local?: boolean; topic: string })
  | null;
type ParagraphDatum = CellData | { topic: string[] };

const CellRenderer = (data: CellData, row: number) => {
  let content = `${data?.is_left ? "l" : "r"}`;
  if (!data?.is_non_local) {
    content = content.toUpperCase();
  }
  if (!data?.is_topic_sent) {
    content += "*";
  }
  return (
    <div
      className="text-center"
      onClick={
        () => undefined
        // onTopicParagraphClick(row, j, topi)
      }
    >
      {data ? (
        <span
          title={content}
          className={
            data.is_non_local ? "topic-icon-small" : "topic-icon-large"
          }
        >
          <IndicatorIcon unit={data} />
        </span>
      ) : null}
    </div>
  );
};
const HeadRenderer = (data: { topic: string[] }, row: number) => {
  const { topic } = data;
  const topi = topic.at(2)?.replaceAll("_", " ") ?? "";
  return (
    <Button
      className="w-100 text-primary text-start"
      variant="none"
      data-search={topi}
      // onClick={() =>
      //   highlightTopic(
      //     selectedParagraph,
      //     row,
      //     topic
      //   )
      // }
    >
      {topi}
    </Button>
  );
};

type SlotRecord = Record<number, (data: any, row: any) => JSX.Element>;
export const Organization: FC = () => {
  const { t } = useTranslation("review");
  const data = useOnTopicData();
  const showToggle = false;
  const [paragraphRange, setParagraphRange] = useState<number[]>([]);
  const [selectedParagraph, setSelectedParagraph] = useState(-1);
  const [selectedSentence, setSelectedSentence] = useState(-1);
  const [columnDefs, setColumnDefs] = useState<ConfigColumns[]>([
    { title: "Topic" },
  ]);
  const [tableData, setTableData] = useState<ParagraphDatum[][]>([]);
  const [slots, setSlots] = useState<SlotRecord>({});

  useEffect(() => {
    setParagraphRange([
      ...Array(data?.response.coherence?.num_paras ?? 0).keys(),
    ]);

    setColumnDefs([
      {
        title: "Topic",
        render: (data: { topic: string[] }, type, row) => {
          if (type === "filter" || type === "display")
            return data.topic.at(2)?.replaceAll("_", " ");
          if (type === "sort") return data.topic.at(2)?.replaceAll("_", " ");
          // if (type === 'display') return HeadRenderer(data,row);
          return data;
        },
      },
      ...[...Array(data?.response.coherence?.num_paras ?? 0)].map((_, i) => ({
        title: `${i + 1}`,
        orderable: false,
      })),
    ]);
    const slt: SlotRecord = { 0: HeadRenderer };
    [...Array(data?.response.coherence?.num_paras ?? 0)].forEach((_, i) => {
      slt[i + 1] = CellRenderer;
    });
    setSlots(slt);
    setTableData(
      data?.response.coherence?.error
        ? []
        : (data?.response.coherence?.data
            .filter(({ is_topic_cluster }) => is_topic_cluster || !showToggle)
            .map(({ topic, is_non_local, paragraphs }) => {
              return [
                { topic },
                ...paragraphs.map((para) =>
                  para
                    ? {
                        ...para,
                        is_non_local,
                        topic,
                      }
                    : null
                ),
              ];
            }) ?? [])
    );
    setSelectedParagraph(-1);
    setSelectedSentence(-1);
  }, [data]);
  useEffect(() => console.log(columnDefs), [columnDefs]);
  useEffect(() => console.log(tableData), [tableData]);

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
      const topics =
        data?.response.coherence?.data.at(index)?.topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, -1, topics.length ? topics : [topic]);
    },
    [data]
  );
  const onTopicSentenceClick = useCallback(
    (index: number, paragraph: number, sentence: number, topic: string) => {
      const topics =
        data?.response.coherence?.data.at(index)?.topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, sentence, topics.length ? topics : [topic]);
    },
    [data]
  );
  const onTopicClick = useCallback(
    (paragraph: number, sentence: number) => {
      const topics =
        data?.response.coherence?.data.at(paragraph)?.topic.slice(0, 2) ?? [];
      highlightTopic(paragraph, sentence, topics);
    },
    [data]
  );

  return (
    <ReviewReset>
      <Container fluid className="organization d-flex flex-column">
        <h4>{t("organization.title")}</h4>
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
            {/* </Card.Header>
              <Card.Body> */}
            <ErrorBoundary FallbackComponent={CoherenceErrorFallback}>
              <div className=" mt-1 mw-100 flex-grow-1">
                {tableData.at(0)?.length === columnDefs.length && (
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
                          >
                            <Button
                              size="sm"
                              variant="outline-primary"
                              active={i === selectedParagraph}
                              onClick={() =>
                                setSelectedParagraph(
                                  i === selectedParagraph ? -1 : i
                                )
                              }
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
                            .map(({ topic, is_non_local, paragraphs }, i) => {
                              const topi =
                                topic.at(2)?.replaceAll("_", " ") ?? "";
                              const [left, right] = ["l", "r"].map((lr) =>
                                is_non_local ? lr : lr.toUpperCase()
                              );
                              const paraIconClass = is_non_local
                                ? "topic-icon-small"
                                : "topic-icon-large";
                              return (
                                <tr key={`topic-paragraph-key-${i}`}>
                                  <td data-search={topi} className="p-0">
                                    <Button
                                      className="w-100 text-primary text-start"
                                      variant="none"
                                      onClick={() =>
                                        highlightTopic(
                                          selectedParagraph,
                                          i,
                                          topic
                                        )
                                      }
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
                                        className="p-0"
                                      >
                                        <div
                                          className="text-center"
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
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                    </tbody>
                  </DataTable>
                )}
              </div>
              {/* {visualizationGlobal} */}
              {selectedParagraph < 0 ? null : (
                <div className="mw-100 mt-1 overflow-auto">
                  <table>
                    <caption>
                      {t("organization.coherence.sentences_in_paragraph", {
                        paragraph: selectedParagraph + 1,
                      })}
                    </caption>
                    <thead>
                      <tr>
                        <td>{t("organization.coherence.sentences")}</td>
                        {data?.response.local
                          ?.at(selectedParagraph)
                          ?.data?.at(0)
                          ?.sentences.map((_sentence, i) => (
                            <td key={`key-sentence-${i}`}>
                              <Button
                                size="sm"
                                variant="outline-primary"
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
                            </td>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.response.local
                        ?.at(selectedParagraph)
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
                                  onClick={() =>
                                    onTopicClick(selectedParagraph, i)
                                  }
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
                                      onClick={() =>
                                        onTopicSentenceClick(
                                          i,
                                          selectedParagraph,
                                          j,
                                          topi
                                        )
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
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </ErrorBoundary>
            {/* </Card.Body>
            </Card> */}
          </ErrorBoundary>
        )}
      </Container>
    </ReviewReset>
  );
};
