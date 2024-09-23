import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faBookmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { FC, HTMLProps, ReactNode, useCallback, useState } from "react";
import {
  Alert,
  Button,
  ButtonToolbar,
  Card,
  OverlayTrigger,
  Stack,
  Tooltip,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Transforms } from "slate";
import { useSlate } from "slate-react";
import AIResponseIcon from "../../assets/icons/ai_icon.svg?react";
import ClipboardIcon from "../../assets/icons/clipboard_icon.svg?react";
import YourInputIcon from "../../assets/icons/YourInput.svg?react";
import { ToolResult } from "../../lib/ToolResults";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { LoadingSmall } from "../Loading/LoadingSmall";
import { TextToSpeech } from "../scribe/TextToSpeech";

type ToolButtonProps = {
  tooltip: string;
  icon: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
};
export const ToolButton: FC<ToolButtonProps> = ({
  disabled,
  tooltip,
  icon,
  title,
  onClick,
}) => (
  <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
    <Button variant="outline-primary" disabled={disabled} onClick={onClick}>
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
    // icon?: ReactNode;
    onBookmark: () => void;
    actions?: ReactNode;
  };
export const ToolRoot: FC<ToolRootProps> = ({
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
        <h5>{title}</h5>
        <h6 className="text-muted">
          {tool?.datetime.toLocaleString()}
          {useBookmarks && (
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
      {children}
      {actions && <footer className="mx-2">{actions}</footer>}
    </div>
  );
};

/** Component for displaying the users input selected for this tool. */
export const ToolInput: FC<ToolProp> = ({ tool }) => {
  const { t } = useTranslation();
  return (
    <Card as="section" className="mx-1">
      <Card.Body className="pb-0">
        <header>
          <YourInputIcon className="me-2" />
          <span className="fw-bold">{t("tool.input")}</span>
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
export const ToolResponse: FC<ToolResponseProps> = ({
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
      <header className="d-flex">
        <AIResponseIcon className="me-2 text-body-tertiary" />
        <span className="fw-bold">{t("tool.output")}</span>
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
          {!tool?.result && <LoadingSmall />}
        </ButtonToolbar>
      </header>
      {tool?.result ? children : <Loading />}
    </section>
  );
};

type ToolPasteProps = { text: string | undefined | null };
export const ToolPaste: FC<ToolPasteProps> = ({ text }) => {
  const { t } = useTranslation();
  const editor = useSlate();
  const paste = useCallback(
    (text: string | undefined | null) => {
      if (text && editor.selection) {
        Transforms.insertNodes(editor, [
          { type: "paragraph", children: [{ text }] },
        ]);
      }
    },
    [editor]
  );
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
      <Button
        variant="icon"
        className="text-primary"
        disabled={!text}
        onClick={() => text && navigator.clipboard.writeText(text)}
      >
        <ClipboardIcon />
        <span className="visually-hidden sr-only">{t("clipboard")}</span>
      </Button>
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
