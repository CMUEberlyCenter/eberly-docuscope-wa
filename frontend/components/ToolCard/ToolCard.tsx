import { serialize, serializeHtml } from "#/client/slate";
import { trackScreenView } from "#/client/tracking";
import { NotesRequest } from "#/lib/Requests";
import type { Tool, ToolResult } from "#/lib/ToolResults";
import GenerateBulletsIcon from "#assets/icons/generate_bullets_icon.svg?react";
import GenerateProseIcon from "#assets/icons/generate_prose_icon.svg?react";
import HighlightIcon from "#assets/icons/Highlight.svg?react";
import {
  NoInputError,
  SelectionTooLargeError,
} from "#components/ErrorHandler/ErrorHandler.js";
import { SafeHTML } from "#components/SafeHTML/SafeHTML";
import { FC, type HTMLProps, useCallback, useState } from "react";
import {
  Alert,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Stack,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Editor } from "slate";
import { useSlate } from "slate-react";
import { usePageContext } from "vike-react/usePageContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import "./ToolCard.scss";
import { onNotesToBullets, onNotesToProse } from "./ToolCard.telefunc";
import { ToolButton, ToolDisplay } from "./ToolDisplay";

type ToolCardProps = HTMLProps<HTMLDivElement> & { hasSelection?: boolean };

/**
 * Top level framework for drafting tools display.
 * @component
 * @example
 * ```tsx
 * <ToolCard hasSelection={true} />
 * ```
 */
const ToolCard: FC<ToolCardProps> = ({ hasSelection }) => {
  const [{ task: writingTask }] = useWritingTask();
  const { t } = useTranslation();
  const { settings } = usePageContext();
  const [currentTool, setCurrentTool] = useState<ToolResult | null>(null);
  // const [history, setHistory] = useState<ToolResult[]>([]);
  const selectionLimit = settings?.select_word_limit ?? 250;

  const editor = useSlate();
  const doTool = useCallback(
    async (data: ToolResult) => {
      setCurrentTool(data);
      try {
        if (data.input.text.trim() === "") {
          throw new NoInputError("No text selected for processing.", data.tool);
        }
        const requestData: NotesRequest = {
          notes: data.input.text,
          user_lang: writingTask?.info.user_lang,
          target_lang: writingTask?.info.target_lang,
        };
        const onNotes =
          data.tool === "bullets" ? onNotesToBullets : onNotesToProse;
        const response = await onNotes(requestData);
        if ("error" in response) {
          if (response.error?.id === "word_count_exceeded") {
            throw new SelectionTooLargeError(
              response.error.message,
              response.error?.details?.wordCount ?? -1,
              response.error?.details?.limit ?? -1
            );
          }
          if (response.error?.id === "empty_input") {
            throw new NoInputError(response.error.message, data.tool);
          }
          // TODO: Handle other specific error cases as needed
          throw new Error(response.error?.message);
        }
        const toolResult = { ...data, result: response.result };
        trackScreenView({
          screen_name: data.tool,
          screen_class: "ToolCard",
          task_id: writingTask?.info.id,
        });
        setCurrentTool(toolResult);
        // setHistory(history => [...history, toolResult]);
      } catch (error) {
        if (error instanceof Error) {
          setCurrentTool({ ...data, error });
        } else {
          console.error(`Unknown error type: ${error}`);
        }
      }
    },
    [writingTask]
  );
  const onTool = useCallback(
    (tool: Tool) => {
      if (editor.selection) {
        const fragment = Editor.fragment(editor, editor.selection);
        const text = serialize(fragment);
        const wordCount = [
          ...new Intl.Segmenter(undefined, { granularity: "word" }).segment(
            text
          ),
        ].filter((segment) => segment.isWordLike).length;
        if (wordCount === 0) {
          // error task, do not add to history
          setCurrentTool({
            tool,
            datetime: new Date(),
            input: {
              text: "",
            },
            result: null,
            error: new NoInputError("No input provided.", tool),
          });
          return;
        }
        if (wordCount > selectionLimit) {
          setCurrentTool({
            tool,
            datetime: new Date(),
            input: {
              text: serialize(fragment),
              html: serializeHtml(fragment),
              fragment: fragment,
              range: editor.selection,
            },
            result: null,
            error: new SelectionTooLargeError(
              "Selection exceeds the maximum word count.",
              wordCount,
              selectionLimit
            ),
          });
          return;
        }
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
          error: new NoInputError("Error: No input provided.", "default"),
        });
      }
    },
    [editor, doTool, selectionLimit]
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

  // const onBookmark = () =>
  //   setCurrentTool((current) =>
  //     current ? { ...current, bookmarked: !current.bookmarked } : null
  //   );
  // setHistory(history =>
  //   history.map((h) =>
  //     h.datetime === currentTool.datetime ? updated : h
  //   )
  // );

  return (
    <div className="tool-card d-flex flex-column flex-grow-1 overflow-hidden">
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
                  disabled={!hasSelection}
                />
              )}
              {settings.notes2bullets && (
                <ToolButton
                  tooltip={t("tool.button.bullets.tooltip")}
                  title={t("tool.button.bullets.title")}
                  icon={<GenerateBulletsIcon />}
                  onClick={() => onTool("bullets")}
                  disabled={!hasSelection}
                />
              )}
            </ButtonGroup>
          )}
        </ButtonToolbar>
      </div>
      {!currentTool && (
        <article className="d-flex flex-grow-1 flex-column position-relative overflow-auto container-fluid">
          <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
            <HighlightIcon className="icon-lg mx-auto" />
            <span className="mx-auto text-center">{t("tool.initial")}</span>
          </Stack>
        </article>
      )}
      {/* Maybe use Carousel for history? */}
      {currentTool?.tool === "prose" && (
        <ToolDisplay
          title={t("tool.button.prose.tooltip")}
          results={currentTool}
          // onBookmark={onBookmark}
          retry={retry}
        >
          {/* TODO add error reporting */}
          <Card.Text as="div">{currentTool.result}</Card.Text>
        </ToolDisplay>
      )}
      {currentTool?.tool === "bullets" && (
        <ToolDisplay
          title={t("tool.button.bullets.tooltip")}
          results={currentTool}
          // onBookmark={onBookmark}
          retry={retry}
        >
          {/* For #135, use results directly. */}
          {currentTool.result ? (
            <SafeHTML html={currentTool.result} />
          ) : (
            <Alert variant="danger">{t("error.no_results")}</Alert>
          )}
        </ToolDisplay>
      )}
    </div>
  );
};

export default ToolCard;
