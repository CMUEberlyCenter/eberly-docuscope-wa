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
import { usePageContext } from "vike-react/usePageContext";
import GenerateBulletsIcon from "../../assets/icons/generate_bullets_icon.svg?react";
import GenerateProseIcon from "../../assets/icons/generate_prose_icon.svg?react";
import HighlightIcon from "../../assets/icons/Highlight.svg?react";
import { serialize, serializeHtml } from "../../src/lib/slate";
import type { SelectedText, Tool, ToolResult } from "../../src/lib/ToolResults";
import { NotesRequest } from "../../src/lib/Requests";
import { WritingTask } from "../../src/lib/WritingTask";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { Legal } from "../Legal/Legal";
import { Logo } from "../Logo/Logo";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import "./ToolCard.scss";
import { ToolButton, ToolDisplay } from "./ToolDisplay";

type ToolCardProps = HTMLProps<HTMLDivElement> & { hasSelection?: boolean };
class NoSelectedTextError extends Error {}

/*** Notes to Prose ***/
async function postConvertNotes(
  { text }: SelectedText,
  output: "prose" | "bullets" = "prose",
  writing_task?: WritingTask | null
): Promise<string> {
  const endpoint =
    output === "bullets" ? "convert_to_bullets" : "convert_to_prose";
  const { user_lang, target_lang } = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notes: text,
      user_lang,
      target_lang,
    } as NotesRequest),
  });
  if (!response.ok) {
    checkReviewResponse(response);
    // throw new Error(`HTTP error status: ${response.status}`, {
    //   cause: await response.json(),
    // });
  }
  const data = await response.json();
  if (typeof data === "string") {
    return data;
  }
  // TODO fix this for server errors instead of openai errors.
  if ("error" in data) {
    console.error(data.message);
    return data.message;
  }
  // if ('choices' in data) {
  //   logCovertNotes(text, data);
  //   return data.choices[0].message.content ?? '';
  // }
  console.error(data);
  return "";
}

/**
 * Top level framework for writing tools display.
 */
const ToolCard = forwardRef<HTMLDivElement, ToolCardProps>(
  ({ className, hasSelection, ...props }, ref) => {
    const { task: writingTask } = useWritingTask();
    const { t } = useTranslation();
    const { settings } = usePageContext();
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
            default:
              console.error(`Unhandled tool: ${data}`);
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
                {(settings?.notes2prose || settings?.notes2bullets) && (
                  <Nav.Item className="ms-3">
                    <Nav.Link
                      eventKey="generate"
                      onClick={() => setTab("generate")}
                    >
                      {t("tool.tab.generate")}
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
                    {(settings?.notes2prose || settings?.notes2bullets) && (
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
            </Tab.Content>
          </Tab.Container>
        </header>
        <article className="flex-grow-1 position-relative overflow-auto container-fluid">
          {!currentTool && (
            <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
              <HighlightIcon className="icon-lg mx-auto" />
              <span className="mx-auto text-center">{t("tool.initial")}</span>
            </Stack>
          )}
          {/* Maybe use Carousel for history? */}
          {currentTool?.tool === "prose" && (
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
          )}
          {currentTool?.tool === "bullets" && (
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
          )}
        </article>
        <Legal />
      </aside>
    );
  }
);

export default ToolCard;
