import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faBookmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import {
  type FC,
  type HTMLProps,
  type ReactNode,
  useCallback,
  useState,
} from "react";
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
import AIResponseIcon from "../../assets/icons/ai_icon.svg?react";
import YourInputIcon from "../../assets/icons/YourInput.svg?react";
import { deserializeHtmlText } from "../../src/app/lib/slate";
import type { ToolResult } from "../../src/app/lib/ToolResults";
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
type ToolRootProps = HTMLProps<HTMLDivElement> &
  ToolProp & {
    title: string;
    onBookmark: () => void;
    actions?: ReactNode;
  };
/** Root component for displaying a tool card with header, content, and footer. */
const ToolRoot: FC<ToolRootProps> = ({
  tool,
  children,
  // icon,
  title,
  onBookmark,
  actions,
  className,
  ...props
}) => {
  const { t } = useTranslation();
  const [useBookmarks] = useState(false);
  const cn = classNames(className, "bg-light");
  return (
    <div className={cn} {...props}>
      <header className="text-center">
        <h5 className="fs-6 mb-0">{title}</h5>
        <h6 className="text-muted">
          {tool?.datetime.toLocaleString()}
          {useBookmarks && tool && !tool.error && (
            <Button variant="icon" onClick={() => onBookmark()}>
              <FontAwesomeIcon
                icon={tool?.bookmarked ? faBookmark : faRegularBookmark}
              />
              <span className="visually-hidden sr-only">
                {tool?.bookmarked ? t("tool.bookmarked") : t("tool.bookmark")}
              </span>
            </Button>
          )}
        </h6>
      </header>
      {tool && tool.error ? (
        <ToolErrorHandler tool={tool} />
      ) : (
        <>
          {children}
          {!!children && !!actions && (
            <footer className="mx-2">{actions}</footer>
          )}
        </>
      )}
    </div>
  );
};

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
              dangerouslySetInnerHTML={{
                __html: tool.input.html ?? tool.input.text,
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
  const cn = className ?? "px-1 m-2 pb-2";
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

export const ToolDisplay = {
  Root: ToolRoot,
  Input: ToolInput,
  Response: ToolResponse,
  Spinner: Loading,
  Paste: ToolPaste,
  Button: ToolButton,
  Fade: FadeContent,
};
