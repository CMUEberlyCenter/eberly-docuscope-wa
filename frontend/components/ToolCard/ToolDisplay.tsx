import { deserializeHtmlText } from "#/lib/slate";
import type { ToolResult } from "#/lib/ToolResults";
import AIResponseIcon from "#assets/icons/ai_icon.svg?react";
import YourInputIcon from "#assets/icons/YourInput.svg?react";
import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faBookmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DOMPurify from "dompurify";
import { type FC, type HTMLProps, type ReactNode, useCallback } from "react";
import {
  Alert,
  Button,
  type ButtonProps,
  ButtonToolbar,
  Card,
  OverlayTrigger,
  Stack,
  Tooltip,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Node, Transforms } from "slate";
import { useSlate } from "slate-react";
import { ClipboardIconButton } from "../ClipboardIconButton/ClipboardIconButton";
import { ToolErrorHandler } from "../ErrorHandler/ErrorHandler";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { TextToSpeech } from "../TextToSpeech/TextToSpeech";

type ToolButtonProps = ButtonProps & {
  tooltip: string;
  icon: ReactNode;
  title: string;
};
/** Button component with a tooltip and an icon. */
export const ToolButton: FC<ToolButtonProps> = ({
  tooltip,
  icon,
  title,
  ...props
}) => (
  <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
    <Button variant="outline-primary" {...props}>
      <Stack>
        {icon}
        <span>{title}</span>
      </Stack>
    </Button>
  </OverlayTrigger>
);

type ToolProp = { tool?: ToolResult | null };

/** Component for displaying the users input selected for this tool. */
const ToolInput: FC<ToolProp> = ({ tool }) => {
  const { t } = useTranslation();
  return (
    <Card as="section" className="mx-1">
      <Card.Body className="pb-0">
        <header className="d-flex align-items-baseline">
          <YourInputIcon style={{ height: "0.75em" }} />
          <span className="ms-2 fw-bold">{t("tool.input")}</span>
        </header>
        {tool?.input.text.trim() ? (
          <FadeContent>
            <Card.Text
              // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(tool.input.html ?? tool.input.text),
              }}
            ></Card.Text>
          </FadeContent>
        ) : (
          <Card.Text as="div">
            <Alert variant="warning">{t("tool.no_selection")}</Alert>
          </Card.Text>
        )}
      </Card.Body>
    </Card>
  );
};

type ToolResponseProps = HTMLProps<HTMLDivElement> &
  ToolProp & { text?: string; regenerate?: (tool: ToolResult) => void };
/** Component for displaying the LLM response with the appropriate header */
const ToolResponse: FC<ToolResponseProps> = ({
  tool,
  text,
  regenerate,
  children,
  className,
  ...props
}) => {
  const { t } = useTranslation();
  const cn = className ?? "d-flex flex-column flex-grow-1 px-1 m-2 pb-2";
  return (
    <section {...props} className={cn}>
      <header className="d-flex align-items-baseline">
        <AIResponseIcon
          className="text-body-tertiary"
          style={{ height: "0.8em" }}
        />
        <span className="ms-2 fw-bold">{t("tool.output")}</span>
        <ButtonToolbar className="ms-auto">
          {tool?.result && text && <TextToSpeech text={text} />}
          {tool?.result && regenerate && (
            <Button
              onClick={() => regenerate(tool)}
              variant="icon"
              className="text-primary"
            >
              <FontAwesomeIcon icon={faArrowsRotate} />
              <span className="visually-hidden sr-only">
                {t("tool.regenerate")}
              </span>
            </Button>
          )}
        </ButtonToolbar>
      </header>
      {tool?.result ? children : <Loading />}
    </section>
  );
};

type ToolPasteProps = { text: string | undefined | null };
/** Footer button components for copying LLM output. */
const ToolPaste: FC<ToolPasteProps> = ({ text }) => {
  const { t } = useTranslation();
  const editor = useSlate();
  const paste = useCallback(
    (text: string | undefined | null) => {
      if (text && editor.selection) {
        const nodes: Node[] = [];
        if (text.match(/<p.*>/)) {
          // is html
          nodes.push(...(deserializeHtmlText(text) ?? []));
        } else if (text.match(/^\s*<ul/)) {
          nodes.push(...(deserializeHtmlText(text) ?? []));
        } else if (text.match(/^\w*-/)) {
          // is a list
          nodes.push({
            type: "bulleted-list",
            children: text
              .split(/\s*-\s+/)
              .map((li) => li.trim())
              .filter((li) => li !== "")
              .map((li) => ({ type: "list-item", children: [{ text: li }] })),
          });
        } else {
          nodes.push({ type: "paragraph", children: [{ text }] });
        }
        Transforms.insertNodes(editor, nodes);
      }
    },
    [editor]
  );
  if (!text) {
    return null;
  }
  return (
    <div className="d-flex">
      <Button
        variant="primary"
        disabled={!text}
        onClick={() => paste(text)}
        className="me-auto mw-50 w-50"
      >
        {t("tool.paste")}
      </Button>
      <ClipboardIconButton
        disabled={!text}
        onClick={() => text && navigator.clipboard.writeText(text)}
      />
    </div>
  );
};

/** Component for displaying tool pending and results */
export const ToolDisplay: FC<{
  title: string;
  results: ToolResult;
  onBookmark?: () => void;
  retry?: (prev: ToolResult) => Promise<void>;
  children: ReactNode;
}> = ({ results, title, onBookmark, retry, children }) => {
  const { t } = useTranslation();
  return (
    <article className="d-flex flex-grow-1 flex-column position-relative overflow-auto container-fluid">
      <header className="text-center">
        <h5 className="fs-6 mb-0">{title}</h5>
        <h6 className="text-muted">
          {results?.datetime.toLocaleString()}
          {onBookmark && results && !results.error && (
            <Button variant="icon" onClick={() => onBookmark()}>
              <FontAwesomeIcon
                icon={results?.bookmarked ? faBookmark : faRegularBookmark}
              />
              <span className="visually-hidden sr-only">
                {results?.bookmarked
                  ? t("tool.bookmarked")
                  : t("tool.bookmark")}
              </span>
            </Button>
          )}
        </h6>
      </header>
      {results && results.error ? (
        <ToolErrorHandler tool={results} />
      ) : (
        <>
          <ToolInput tool={results} />
          <ToolResponse
            tool={results}
            regenerate={retry}
            text={results.result ?? ""}
          >
            {children}
          </ToolResponse>
          {!!results.result && (
            <footer className="mx-2">
              <ToolPaste text={results.result} />
            </footer>
          )}
        </>
      )}
    </article>
  );
};
