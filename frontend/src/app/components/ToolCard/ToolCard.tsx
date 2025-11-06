import classNames from "classnames";
import {
  forwardRef,
  type HTMLProps,
  useCallback,
  useId,
  useState,
} from "react";
import {
  Alert,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Nav,
  Navbar,
  Stack,
  Tab,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Editor } from "slate";
import { useSlate } from "slate-react";
import CopyEditIcon from "../../assets/icons/copyedit_icon.svg?react";
import GenerateBulletsIcon from "../../assets/icons/generate_bullets_icon.svg?react";
import GenerateProseIcon from "../../assets/icons/generate_prose_icon.svg?react";
import HighlightIcon from "../../assets/icons/Highlight.svg?react";
import LocalCoherenceIcon from "../../assets/icons/local_coherence_icon.svg?react";
import { serialize, serializeHtml } from "../../lib/slate";
import type { Tool, ToolResult } from "../../lib/ToolResults";
import {
  postClarifyText,
  postConvertNotes,
  postFlowText,
} from "../../service/scribe.service";
import { Legal } from "../Legal/Legal";
import { Logo } from "../Logo/Logo";
import { Rating } from "../Rating/Rating";
import { useSettingsContext } from "../Settings/SettingsContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import "./ToolCard.scss";
import { ToolButton, ToolDisplay } from "./ToolDisplay";

type ToolCardProps = HTMLProps<HTMLDivElement> & { hasSelection?: boolean };
class NoSelectedTextError extends Error {}

/**
 * Top level framework for writing tools display.
 */
const ToolCard = forwardRef<HTMLDivElement, ToolCardProps>(
  ({ className, hasSelection, ...props }, ref) => {
    const { task: writingTask } = useWritingTask();
    const { t } = useTranslation();
    const settings = useSettingsContext();
    const [currentTool, setCurrentTool] = useState<ToolResult | null>(null);
    const [history, setHistory] = useState<ToolResult[]>([]);
    const addHistory = (tool: ToolResult) => setHistory([...history, tool]);
    const scribe = true; // Originally for useScribe(); for opt-in check.

    const editor = useSlate();
    const doTool = useCallback(
      async (data: ToolResult) => {
        setCurrentTool(data);
        const emptyInput = data.input.text.trim() === "";
        try {
          switch (data.tool) {
            case "bullets":
            case "prose": {
              if (emptyInput) {
                throw new NoSelectedTextError(
                  t(`error.no_selection.${data.tool}`)
                );
              }
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
            case "copyedit": {
              if (emptyInput) {
                throw new NoSelectedTextError(t("error.no_selection.default"));
              }
              const result = await postClarifyText(data.input, writingTask);
              const toolResult = { ...data, result };
              setCurrentTool(toolResult);
              addHistory(toolResult);
              break;
            }
            case "flow": {
              if (emptyInput) {
                throw new NoSelectedTextError(t("error.no_selection.default"));
              }
              const result = await postFlowText(data.input, writingTask);
              const toolResult = { ...data, result };
              setCurrentTool(toolResult);
              addHistory(toolResult);
              break;
            }
            default:
              console.error(`Unhandled tool: ${data.tool}`);
          }
        } catch (error) {
          if (error instanceof Error) {
            setCurrentTool({ ...data, error });
          } else {
            console.error(`Unknown error type: ${error}`);
          }
        }
      },
      [writingTask, t]
    );
    const onTool = useCallback(
      (tool: Tool) => {
        if (editor.selection) {
          const fragment = Editor.fragment(editor, editor.selection);
          doTool({
            tool,
            datetime: new Date(),
            input: {
              text: serialize(fragment),
              html: serializeHtml(fragment),
              fragment: fragment,
              range: editor.selection,
            },
            result: null,
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
            error: new NoSelectedTextError(t("error.no_selection.default")),
          });
        }
      },
      [editor, doTool, t]
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

    return (
      <aside
        className={classNames(
          className,
          "my-1 border rounded bg-light d-flex flex-column tool-card"
        )}
        {...props}
        ref={ref}
      >
        <header>
          <Tab.Container id={tabId} defaultActiveKey="generate" activeKey={tab}>
            <Navbar
              className="border-bottom py-0 mb-1 mt-0 d-flex align-items-baseline justify-content-between"
              as="nav"
            >
              {/* <Nav variant="underline"> // underline or tabs conveys meaning better */}
              <Nav>
                {(settings.notes2prose || settings.notes2bullets) && (
                  <Nav.Item className="ms-3">
                    <Nav.Link
                      eventKey="generate"
                      onClick={() => setTab("generate")}
                    >
                      {t("tool.tab.generate")}
                    </Nav.Link>
                  </Nav.Item>
                )}
                {(settings.copyedit || settings.flow) && (
                  <Nav.Item>
                    <Nav.Link
                      eventKey="refine"
                      onClick={() => setTab("refine")}
                    >
                      {t("tool.tab.refine")}
                    </Nav.Link>
                  </Nav.Item>
                )}
              </Nav>
              <Navbar.Brand className="ms-auto">
                <Logo />
              </Navbar.Brand>
            </Navbar>
            <Tab.Content>
              <Tab.Pane eventKey="generate">
                <div className="d-flex justify-content-around">
                  <ButtonToolbar className="mb-2 mx-auto">
                    {(settings.notes2prose || settings.notes2bullets) && (
                      <ButtonGroup className="bg-white shadow-sm tools">
                        {settings.notes2prose && (
                          <ToolButton
                            tooltip={t("tool.button.prose.tooltip")}
                            title={t("tool.button.prose.title")}
                            icon={<GenerateProseIcon />}
                            onClick={() => onTool("prose")}
                            disabled={!scribe || !hasSelection}
                          />
                        )}
                        {settings.notes2bullets && (
                          <ToolButton
                            tooltip={t("tool.button.bullets.tooltip")}
                            title={t("tool.button.bullets.title")}
                            icon={<GenerateBulletsIcon />}
                            onClick={() => onTool("bullets")}
                            disabled={!scribe || !hasSelection}
                          />
                        )}
                      </ButtonGroup>
                    )}
                  </ButtonToolbar>
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="refine">
                <div className="d-flex justify-content-around">
                  <ButtonToolbar className="mb-2 mx-auto">
                    <ButtonGroup className="bg-white shadow-sm tools">
                      {settings.flow && (
                        <ToolButton
                          tooltip={t("tool.button.flow.tooltip")}
                          onClick={() => onTool("flow")}
                          disabled={!scribe || !hasSelection}
                          icon={<LocalCoherenceIcon />}
                          title={t("tool.button.flow.title")}
                        />
                      )}
                      {settings.copyedit && (
                        <ToolButton
                          tooltip={t("tool.button.copyedit.overview")}
                          onClick={() => onTool("copyedit")}
                          disabled={!scribe || !hasSelection}
                          icon={<CopyEditIcon />}
                          title={t("tool.button.copyedit.title")}
                        />
                      )}
                    </ButtonGroup>
                  </ButtonToolbar>
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </header>
        <article className="flex-grow-1 position-relative overflow-auto container-fluid">
          {(!currentTool ||
            (currentTool.tool === "expectation" &&
              !currentTool.expectation)) && (
            <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
              <HighlightIcon className="icon-lg mx-auto" />
              <span className="mx-auto text-center">{t("tool.initial")}</span>
            </Stack>
          )}
          {/* Maybe use Carousel for history? */}
          {currentTool?.tool === "prose" ? (
            <ToolDisplay.Root
              // icon={<GenerateProseIcon />}
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
          ) : null}
          {currentTool?.tool === "bullets" ? (
            <ToolDisplay.Root
              // icon={<GenerateBulletsIcon />}
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
                {currentTool.result ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: currentTool.result,
                    }}
                  >
                    {/* For #135, use results directly. */}
                  </div>
                ) : (
                  // <ul>
                  //   {currentTool.result
                  //     .split(/\s*-\s+/)
                  //     .filter((b) => b.trim() !== "")
                  //     .map((b, i) => (
                  //       <li key={`list-item-${i}`}>{b}</li>
                  //     ))}
                  // </ul>
                  <Alert variant="danger">{t("error.no_results")}</Alert>
                )}
              </ToolDisplay.Response>
            </ToolDisplay.Root>
          ) : null}
          {currentTool?.tool === "copyedit" ? (
            <ToolDisplay.Root
              // icon={<CopyEditIcon />}
              title={t("tool.button.copyedit.tooltip")}
              tool={currentTool}
              onBookmark={onBookmark}
              actions={
                <ToolDisplay.Paste text={currentTool.result?.clean_revision} />
              }
            >
              {/* <FadeContent>{t("tool.button.copyedit.overview")}</FadeContent> */}
              <ToolDisplay.Input tool={currentTool} />
              <ToolDisplay.Response
                tool={currentTool}
                regenerate={retry}
                text={currentTool.result?.explanation}
              >
                {currentTool.result?.clean_revision ||
                currentTool.result?.explanation ||
                currentTool.result?.revision ? (
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
                ) : (
                  <Alert variant="danger">{t("error.no_results")}</Alert>
                )}
              </ToolDisplay.Response>
            </ToolDisplay.Root>
          ) : null}
          {currentTool?.tool === "grammar" ? (
            <ToolDisplay.Root
              title={t("tool.button.grammar.tooltip")}
              tool={currentTool}
              onBookmark={onBookmark}
              actions={
                <ToolDisplay.Paste text={currentTool.result?.clean_revision} />
              }
            >
              <ToolDisplay.Input tool={currentTool} />
              <ToolDisplay.Response
                regenerate={retry}
                tool={currentTool}
                text={currentTool.result?.explanation}
              >
                {currentTool.result ? (
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
                ) : (
                  <Alert variant="danger">{t("error.no_results")}</Alert>
                )}
              </ToolDisplay.Response>
            </ToolDisplay.Root>
          ) : null}
          {currentTool?.tool === "flow" ? (
            <ToolDisplay.Root
              // icon={<LocalCoherenceIcon />}
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
                {currentTool.result?.issues.length ||
                currentTool.result?.general_assessment ? (
                  <>
                    {currentTool.result.rating ? (
                      <Rating value={currentTool.result.rating} />
                    ) : null}
                    <p>{currentTool.result.general_assessment}</p>
                    <ul className="no-bullets">
                      {currentTool.result.issues.map(
                        ({ description, suggestions }, i) => (
                          <li key={`sentences-issue-${i}`}>
                            <b>{t("flow.issue")}</b> {description}
                            <div className="mt-1 mb-3">
                              <b>{t("flow.suggestions")}</b>
                              <ul>
                                {suggestions.map((suggestion, j) => (
                                  <li
                                    key={`sentences-issue-${i}-suggestion-${j}`}
                                  >
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  </>
                ) : (
                  <Alert variant="danger">{t("error.no_results")}</Alert>
                )}
              </ToolDisplay.Response>
            </ToolDisplay.Root>
          ) : null}
        </article>
        <Legal />
      </aside>
    );
  }
);

export default ToolCard;
