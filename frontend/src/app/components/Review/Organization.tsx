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
import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import DT from "datatables.net-dt";
import "datatables.net-fixedcolumns-dt";
import DataTable from "datatables.net-react";
import {
  type FC,
  type HTMLProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  type AlertProps,
  Button,
  Col,
  Container,
  type ContainerProps,
  Row,
} from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  isErrorData,
  type OnTopicReviewData,
  type OptionalReviewData,
} from "../../../lib/ReviewResponse";
import { clearAllHighlights } from "../../service/topic.service";
import {
  checkReviewResponse,
  ReviewErrorData,
} from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import "./Organization.scss";
import { ReviewReset, useReviewDispatch } from "./ReviewContext";

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
const Legend: FC<ContainerProps> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <Container {...props}>
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

/** Alert component for displaying organization errors. */
const OrganizationErrorFallback: FC<AlertProps & { error?: Error }> = ({
  error,
  variant,
  ...props
}) => (
  <Translation ns={"review"}>
    {(t) => (
      <Alert {...props} variant={variant ?? "danger"}>
        <p>{t("organization.error")}</p>
        <pre>{error?.message}</pre>
      </Alert>
    )}
  </Translation>
);

/** Alert component for displaying coherence errors. */
const CoherenceErrorFallback: FC<AlertProps & { error?: Error }> = ({
  error,
  variant,
  ...props
}) => (
  <Translation ns={"review"}>
    {(t) => (
      <Alert {...props} color={variant ?? "warning"}>
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
/** Organization review tool component. */
export const Organization: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const [document] = useFileText();
  const [data, setData] = useState<OptionalReviewData<OnTopicReviewData>>(null);
  const showToggle = false;
  const [paragraphRange, setParagraphRange] = useState<number[]>([]);
  const [selected, setSelected] = useState<SelectedRowCol>(null);

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
      checkReviewResponse(response);
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
      setData({ tool: "ontopic", error });
      console.error("Error fetching Organization review:", error);
    },
  });
  // When the document changes, fetch a new ontopic review
  useEffect(() => {
    if (!document) return;
    mutation.mutate({
      document,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [document]);

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
      window.document
        .querySelectorAll(`.user-text .word[data-topic="${topic}"]`)
        .forEach((ele) => ele.classList.add("word-highlight"))
    );
    if (typeof selected?.paragraph === "number") {
      const ele = window.document.querySelector(
        `.user-text .paragraph[data-ds-paragraph="${selected.paragraph + 1}"]`
      );
      ele?.scrollIntoView({ behavior: "smooth", block: "center" });
      ele?.classList.add("paragraph-highlight");
    }
  }, [selected]);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid organization overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
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
