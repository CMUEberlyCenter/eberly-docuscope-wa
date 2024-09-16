import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Container,
  Nav,
  Navbar,
  Stack,
  Tab,
} from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { Editor } from "slate";
import { useSlate } from "slate-react";
import { Rule } from "../../../lib/WritingTask";
import AllExpectationsIcon from "../../assets/icons/check_all_expectations_icon.svg?react";
import CheckExpectationIcon from "../../assets/icons/check_expectation_icon.svg?react";
import CopyEditIcon from "../../assets/icons/copyedit_icon.svg?react";
import GenerateBulletsIcon from "../../assets/icons/generate_bullets_icon.svg?react";
import GenerateProseIcon from "../../assets/icons/generate_prose_icon.svg?react";
import HighlightIcon from "../../assets/icons/Highlight.svg?react";
import LocalCoherenceIcon from "../../assets/icons/local_coherence_icon.svg?react";
import OutlineDrawerIcon from "../../assets/icons/wtd_library.svg?react";
import { Tool, ToolResult } from "../../lib/ToolResults";
import { serialize, serializeHtml } from "../../service/editor-state.service";
import { useSelectTaskAvailable } from "../../service/lti.service";
import {
  postClarifyText,
  postConvertNotes,
  postExpectation,
  postFlowText,
  useAssessFeature,
  useScribe,
  useScribeFeatureGrammar,
  useScribeFeatureNotes2Prose,
} from "../../service/scribe.service";
import { useWritingTask } from "../../service/writing-task.service";
import { Logo } from "../Logo/Logo";
import { Rating } from "../Rating/Rating";
import SelectExpectation from "../SelectExpectation/SelectExpectation";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";
import "./ToolCard.scss";
import { ToolButton, ToolDisplay } from "./ToolDisplay";

type ToolCardProps = JSX.IntrinsicAttributes;

/**
 * Top level framework for writing tools display.
 */
const ToolCard = forwardRef<HTMLDivElement, ToolCardProps>(
  ({ ...props }, ref) => {
    const { t } = useTranslation();
    const selectAvailable = useSelectTaskAvailable();
    const writingTask = useWritingTask();
    const [showSelectWritingTasks, setShowSelectWritingTasks] = useState(false);
    const [showWritingTask, setShowWritingTask] = useState(false);
    const notes2proseFeature = useScribeFeatureNotes2Prose();
    const bulletsFeature = true; // TODO use settings and writing task
    const flowFeature = true; // TODO use settings and writing task
    const copyEditFeature = true; // TODO use settings and writing task
    // const clarifyFeature = useScribeFeatureClarify();
    const grammarFeature = useScribeFeatureGrammar();
    const [currentTool, setCurrentTool] = useState<ToolResult | null>(null);
    const [history, setHistory] = useState<ToolResult[]>([]);
    const addHistory = (tool: ToolResult) => setHistory([...history, tool]);
    const scribe = useScribe();
    const assessFeature = useAssessFeature();
    // const logicalflowFeature = useScribeFeatureLogicalFlow();
    // const topicsFeature = useScribeFeatureTopics();
    // const editorContent = useEditorContent();
    const [showSelectExpectation, setShowSelectExpectation] = useState(false);

    const editor = useSlate();
    const doTool = useCallback(
      async (data: ToolResult) => {
        setCurrentTool(data);
        switch (data.tool) {
          case "bullets":
          case "prose": {
            const result = await postConvertNotes(
              data.input,
              data.tool,
              writingTask
            );
            const toolResult = { ...data, result };
            setCurrentTool(toolResult);
            addHistory(toolResult);
            break;
          }
          case "expectation": {
            if (data.expectation) {
              const result = await postExpectation(
                data.input.text,
                data.expectation,
                writingTask
              );
              const toolResult = { ...data, result };
              setCurrentTool(toolResult);
              addHistory(toolResult);
            } else {
              setShowSelectExpectation(true);
            }
            break;
          }
          case "copyedit": {
            const result = await postClarifyText(data.input, writingTask);
            const toolResult = { ...data, result };
            setCurrentTool(toolResult);
            addHistory(toolResult);
            break;
          }
          case "flow": {
            const result = await postFlowText(data.input, writingTask);
            const toolResult = { ...data, result };
            setCurrentTool(toolResult);
            addHistory(toolResult);
            break;
          }
          default:
            console.warn(`Unhandled tool: ${data.tool}`);
        }
      },
      [writingTask]
    );
    const onTool = useCallback(
      (tool: Tool) => {
        if (editor.selection) {
          doTool({
            tool,
            datetime: new Date(),
            input: {
              text: serialize(Editor.fragment(editor, editor.selection)),
              html: serializeHtml(Editor.fragment(editor, editor.selection)),
              fragment: Editor.fragment(editor, editor.selection),
              range: editor.selection,
            },
            result: null,
            // document: editorContent,
          });
        } else {
          // error task, do not add to history
          setCurrentTool({
            tool,
            datetime: new Date(),
            input: {
              text: "",
            },
            result: null,
            // document: editorContent,
          });
        }
      },
      [editor, doTool]
    ); // Does this need to be wrapped in useCallback?
    const retry = useCallback(
      async (previous: ToolResult) =>
        doTool({
          ...previous,
          datetime: new Date(),
          result: null,
        }),
      [doTool]
    );

    // Tab control stuff
    const tabId = useId();
    const [tab, setTab] = useState("generate");

    // If writing task is changed, show its details.
    useEffect(() => {
      if (writingTask) {
        setShowWritingTask(true);
      }
    }, [writingTask]);

    const onBookmark = useCallback(() => {
      if (currentTool) {
        const updated = {
          ...currentTool,
          bookmarked: !currentTool?.bookmarked,
        };
        setCurrentTool(updated);
        setHistory(
          history.map((h) =>
            h.datetime === currentTool.datetime ? updated : h
          )
        );
      }
    }, [history, currentTool]);

    const onReview = useCallback(async () => {
      const text = serialize(editor.children);
      if (!text) {
        // TODO error message about no content.
        return;
      }
      const resp = await fetch("/api/v2/reviews/", {
        method: "POST",
        credentials: "same-origin",
        redirect: "manual",
        headers: { "Content-Type": "application/json" },
        // TODO possibly add text serialization for data processing.
        body: JSON.stringify({
          text,
          document: serializeHtml(editor.children),
          writing_task: writingTask,
        }),
      });
      if (resp.redirected) {
        return window.open(resp.url, "_blank");
      }
      if (!resp.ok) {
        console.error(resp.status);
        return; // TODO better error reporting
      }
      const reviewId = await resp.json();
      return window.open(`/review.html?id=${reviewId}`, "_blank");
    }, [writingTask, editor]);

    const onExpectations = useCallback(async () => {
      const text = serialize(editor.children);
      if (!text) {
        // TODO error message about no content.
        return;
      }
      const resp = await fetch("/api/v2/reviews/", {
        method: "POST",
        credentials: "same-origin",
        redirect: "manual",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text, // plain text
          document: serializeHtml(editor.children),
          writing_task: writingTask,
        }),
      });
      if (resp.redirected) {
        return window.open(resp.url, "_blank");
      }
      if (!resp.ok) {
        console.error(resp.status);
        return; // TODO better error reporting
      }
      const reviewId = await resp.json();
      return window.open(`/expectations.html?id=${reviewId}`, "_blank");
    }, [writingTask, editor]);

    return (
      <div className="p-2">
        <Card
          {...props}
          as="section"
          className="overflow-hidden tool-card h-100 bg-light"
          ref={ref}
        >
          <Card.Header as={"header"} className="bg-light px-0">
            <Tab.Container
              id={tabId}
              defaultActiveKey="generate"
              activeKey={tab}
            >
              <Navbar className="border-bottom w-100 pb-0 mb-1 mt-0 pt-0">
                <Container className="p-0">
                  <Nav variant="underline">
                    <Nav.Item className="ms-3">
                      <Nav.Link
                        eventKey="generate"
                        onClick={() => setTab("generate")}
                      >
                        {t("tool.tab.generate")}
                      </Nav.Link>
                    </Nav.Item>
                    <Button variant="link" onClick={() => onReview()}>
                      {t("tool.tab.review")}
                      <FontAwesomeIcon
                        icon={faArrowUpRightFromSquare}
                        className="ms-1"
                      />
                    </Button>
                    <Nav.Item className="me-auto">
                      <Nav.Link
                        eventKey="refine"
                        onClick={() => setTab("refine")}
                      >
                        {t("tool.tab.refine")}
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                  <Navbar.Brand>
                    <Logo />
                  </Navbar.Brand>
                </Container>
              </Navbar>
              <Tab.Content>
                <Tab.Pane eventKey="generate">
                  <div className="d-flex justify-content-around">
                    <ButtonToolbar className="mb-3 mx-auto">
                      {(notes2proseFeature || bulletsFeature) && (
                        <ButtonGroup
                          className="bg-white shadow tools"
                          size="sm"
                        >
                          {notes2proseFeature && (
                            <ToolButton
                              tooltip={t("tool.button.prose.tooltip")}
                              title={t("tool.button.prose.title")}
                              icon={<GenerateProseIcon />}
                              onClick={() => onTool("prose")}
                              disabled={!scribe}
                            />
                          )}
                          {bulletsFeature && (
                            <ToolButton
                              tooltip={t("tool.button.bullets.tooltip")}
                              title={t("tool.button.bullets.title")}
                              icon={<GenerateBulletsIcon />}
                              onClick={() => onTool("bullets")}
                              disabled={!scribe}
                            />
                          )}
                        </ButtonGroup>
                      )}
                      {assessFeature && (
                        <ButtonGroup
                          className="bg-white shadow tools ms-2"
                          size="sm"
                        >
                          {assessFeature && (
                            <ToolButton
                              tooltip={t("tool.button.expectation.tooltip")}
                              title={t("tool.button.expectation.title")}
                              icon={<CheckExpectationIcon />}
                              disabled={!scribe || !writingTask}
                              onClick={() => onTool("expectation")}
                            />
                          )}
                          {assessFeature && (
                            <ToolButton
                              tooltip={t("tool.button.expectations.tooltip")}
                              disabled={!scribe || !writingTask}
                              onClick={() => onExpectations()}
                              icon={
                                <div className="d-flex justify-content-center align-items-end">
                                  <AllExpectationsIcon />
                                  <FontAwesomeIcon
                                    style={{
                                      height: ".75rem",
                                      width: ".75rem",
                                    }}
                                    className="mx-1"
                                    icon={faArrowUpRightFromSquare}
                                  />
                                </div>
                              }
                              title={t("tool.button.expectations.title")}
                            />
                          )}
                        </ButtonGroup>
                      )}
                    </ButtonToolbar>
                  </div>
                </Tab.Pane>
                <Tab.Pane eventKey="refine">
                  <div className="d-flex justify-content-around">
                    <ButtonToolbar className="mb-3 mx-auto">
                      <ButtonGroup className="bg-white shadow tools" size="sm">
                        {flowFeature && (
                          <ToolButton
                            tooltip={t("tool.button.flow.tooltip")}
                            onClick={() => onTool("flow")}
                            disabled={!scribe}
                            icon={<LocalCoherenceIcon />}
                            title={t("tool.button.flow.title")}
                          />
                        )}
                        {copyEditFeature && (
                          <ToolButton
                            tooltip={t("tool.button.copyedit.tooltip")}
                            onClick={() => onTool("copyedit")}
                            disabled={!scribe}
                            icon={<CopyEditIcon />}
                            title={t("tool.button.copyedit.title")}
                          />
                        )}
                        {grammarFeature && (
                          <ToolButton
                            tooltip={t("tool.button.grammar.tooltip")}
                            disabled={!scribe}
                            onClick={() => onTool("copyedit")}
                            icon={<></>}
                            title={t("tool.button.grammar.title")}
                          />
                        )}
                      </ButtonGroup>
                    </ButtonToolbar>
                  </div>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </Card.Header>
          <article className="h-100 position-relative overflow-auto">
            {!currentTool && (
              <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
                <HighlightIcon className="icon-lg mx-auto" />
                <span className="mx-auto text-center">{t("tool.initial")}</span>
              </Stack>
            )}
            {/* Maybe use Carousel for history? */}
            {currentTool?.tool === "prose" && (
              <ToolDisplay.Root
                icon={<GenerateProseIcon />}
                title={t("tool.button.prose.tooltip")}
                tool={currentTool}
                onBookmark={onBookmark}
                actions={<ToolDisplay.Paste text={currentTool.result} />}
              >
                <ToolDisplay.Input tool={currentTool} />
                <ToolDisplay.Response
                  tool={currentTool}
                  regenerate={retry}
                  text={currentTool.result ?? ""}
                >
                  {/* TODO add error reporting */}
                  <Card.Text as="div">{currentTool.result}</Card.Text>
                </ToolDisplay.Response>
              </ToolDisplay.Root>
            )}
            {currentTool?.tool === "bullets" && (
              <ToolDisplay.Root
                icon={<GenerateBulletsIcon />}
                title={t("tool.button.bullets.tooltip")}
                tool={currentTool}
                onBookmark={onBookmark}
                actions={<ToolDisplay.Paste text={currentTool.result} />}
              >
                <ToolDisplay.Input tool={currentTool} />
                <ToolDisplay.Response
                  tool={currentTool}
                  regenerate={retry}
                  text={currentTool.result ?? ""}
                >
                  {currentTool.result && (
                    <ul>
                      {currentTool.result
                        .split(/\s*-\s+/)
                        .filter((b) => b.trim() !== "")
                        .map((b) => (
                          <li>{b}</li>
                        ))}
                    </ul>
                  )}
                </ToolDisplay.Response>
              </ToolDisplay.Root>
            )}
            {currentTool?.tool === "expectation" && (
              <ToolDisplay.Root
                icon={<CheckExpectationIcon />}
                title={t("tool.button.expectation.tooltip")}
                tool={currentTool}
                onBookmark={onBookmark}
              >
                <ToolDisplay.Input tool={currentTool} />
                <Card as="section">
                  <Card.Body className="pb-0">
                    <header>
                      <CheckExpectationIcon />
                      <span className="fw-bold">{t("tool.expectation")}</span>
                    </header>
                    {currentTool.expectation ? (
                      <ToolDisplay.Fade>
                        <p>{currentTool.expectation.name}</p>
                        <p
                          dangerouslySetInnerHTML={{
                            __html: currentTool.expectation.description,
                          }}
                        />
                      </ToolDisplay.Fade>
                    ) : (
                      <Button onClick={() => setShowSelectExpectation(true)}>
                        {t("tool.select_expectation")}
                      </Button>
                    )}
                  </Card.Body>
                </Card>

                <ToolDisplay.Response
                  tool={currentTool}
                  regenerate={retry}
                  text={
                    `${currentTool.result?.general_assessment ?? ""}\n` +
                    currentTool.result?.issues
                      .map(
                        ({ description, suggestions }) =>
                          `${description} ${suggestions.join("\n")}`
                      )
                      .join("\n\n")
                  }
                >
                  {currentTool.result && (
                    <ErrorBoundary
                      fallback={<div>{t("expectation.error")}</div>}
                    >
                      {currentTool.result.rating && (
                        <Rating value={currentTool.result.rating} />
                      )}
                      <p>{currentTool.result.general_assessment}</p>
                      <dl>
                        {currentTool.result.issues.map(
                          ({ description, suggestions }, i) => (
                            <React.Fragment key={`issue-${i}`}>
                              <dt>{description}</dt>
                              <dd>
                                <ul>
                                  {suggestions.map((suggestion, j) => (
                                    <li key={`suggestion-${i}-${j}`}>
                                      {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </dd>
                            </React.Fragment>
                          )
                        )}
                      </dl>
                    </ErrorBoundary>
                  )}
                </ToolDisplay.Response>
              </ToolDisplay.Root>
            )}
            {currentTool?.tool === "copyedit" && (
              <ToolDisplay.Root
                icon={<CopyEditIcon />}
                title={t("tool.button.copyedit.tooltip")}
                tool={currentTool}
                onBookmark={onBookmark}
                actions={
                  <ToolDisplay.Paste
                    text={currentTool.result?.clean_revision}
                  />
                }
              >
                <ToolDisplay.Input tool={currentTool} />
                <ToolDisplay.Response
                  tool={currentTool}
                  regenerate={retry}
                  text={currentTool.result?.explanation}
                >
                  {currentTool.result && (
                    <>
                      <h4>{t("tool.suggestion")}</h4>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentTool.result.clean_revision,
                        }}
                      />
                      <h4>{t("tool.tracking")}</h4>
                      <div
                        className="edits"
                        dangerouslySetInnerHTML={{
                          __html: currentTool.result.revision,
                        }}
                      ></div>
                      <h4>{t("tool.explanation")}</h4>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentTool.result.explanation,
                        }}
                      ></div>
                    </>
                  )}
                </ToolDisplay.Response>
              </ToolDisplay.Root>
            )}
            {currentTool?.tool === "grammar" && (
              <ToolDisplay.Root
                title={t("tool.button.grammar.tooltip")}
                tool={currentTool}
                onBookmark={onBookmark}
                actions={
                  <ToolDisplay.Paste
                    text={currentTool.result?.clean_revision}
                  />
                }
              >
                <ToolDisplay.Input tool={currentTool} />
                <ToolDisplay.Response
                  regenerate={retry}
                  tool={currentTool}
                  text={currentTool.result?.explanation}
                >
                  {currentTool.result && (
                    <>
                      <h3>{t("tool.suggestion")}</h3>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentTool.result.revision,
                        }}
                      ></div>
                      <h3>{t("tool.explanation")}</h3>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentTool.result.explanation,
                        }}
                      ></div>
                    </>
                  )}
                </ToolDisplay.Response>
              </ToolDisplay.Root>
            )}
            {currentTool?.tool === "flow" && (
              <ToolDisplay.Root
                icon={<LocalCoherenceIcon />}
                title={t("tool.button.flow.tooltip")}
                tool={currentTool}
                onBookmark={onBookmark}
              >
                <ToolDisplay.Input tool={currentTool} />
                <ToolDisplay.Response
                  tool={currentTool}
                  text={
                    currentTool.result?.general_assessment ??
                    "" +
                      currentTool.result?.issues
                        .map(
                          ({ description, suggestions }) =>
                            `${description} ${suggestions.join()}`
                        )
                        .join()
                  }
                  regenerate={retry}
                >
                  {currentTool.result && (
                    <>
                      {currentTool.result.rating && (
                        <Rating value={currentTool.result.rating} />
                      )}
                      <p>{currentTool.result.general_assessment}</p>
                      <dl>
                        {currentTool.result.issues.map(
                          ({ description, suggestions }) => (
                            <>
                              <dt>{description}</dt>
                              <dd>
                                <ul>
                                  {suggestions.map((suggestion) => (
                                    <li>{suggestion}</li>
                                  ))}
                                </ul>
                              </dd>
                            </>
                          )
                        )}
                      </dl>
                    </>
                  )}
                </ToolDisplay.Response>
              </ToolDisplay.Root>
            )}
          </article>
          <Card.Footer as={"footer"} className="bg-light d-flex">
            {writingTask && (
              <Button
                className="me-auto mw-50 w-50 text-truncate"
                variant="outline-dark"
                onClick={() => setShowWritingTask(true)}
                title={t("tool.button.view.title", {title: writingTask.rules.name})}
              >
                {t("tool.button.view.title", {title: writingTask.rules.name})}
              </Button>
            )}
            {selectAvailable && (
              <Button
                variant={writingTask ? "none" : "dark"}
                onClick={() => setShowSelectWritingTasks(true)}
              >
                {writingTask ? (
                  <>
                    <OutlineDrawerIcon />
                    <span className="visually-hidden sr-only">
                      {t("tool.button.select.title")}
                    </span>
                  </>
                ) : (
                  t("tool.button.select.title")
                )}
              </Button>
            )}
          </Card.Footer>
          <WritingTaskDetails
            show={showWritingTask}
            onHide={() => setShowWritingTask(false)}
          />
          {selectAvailable && (
            <SelectWritingTask
              show={showSelectWritingTasks}
              onHide={() => setShowSelectWritingTasks(false)}
            />
          )}
          <SelectExpectation
            show={showSelectExpectation}
            onHide={() => setShowSelectExpectation(false)}
            select={(expectation: Rule | null) => {
              if (currentTool?.tool === "expectation" && expectation) {
                doTool({ ...currentTool, expectation });
              }
            }}
          />
        </Card>
      </div>
    );
  }
);

export default ToolCard;
