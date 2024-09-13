import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import {
  faArrowsRotate,
  faBookmark,
  faClipboard,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, ReactNode, useCallback, useState } from "react";
import {
  Alert,
  Button,
  ButtonToolbar,
  Card,
  CardProps,
  OverlayTrigger,
  Stack,
  Tooltip,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Transforms } from "slate";
import { useSlate } from "slate-react";
import AIResponseIcon from "../../assets/icons/AIResponse.svg?react";
import YourInputIcon from "../../assets/icons/YourInput.svg?react";
import { ToolResult } from "../../lib/ToolResults";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
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
    <Button variant="outline-dark" disabled={disabled} onClick={onClick}>
      <Stack>
        {icon}
        <span>{title}</span>
      </Stack>
    </Button>
  </OverlayTrigger>
);

type ToolProp = { tool?: ToolResult | null };
type ToolRootProps = CardProps &
  ToolProp & {
    title: string;
    icon?: ReactNode;
    onBookmark: () => void;
    actions?: ReactNode;
  };
export const ToolRoot: FC<ToolRootProps> = ({
  tool,
  children,
  icon,
  title,
  onBookmark,
  actions,
  ...props
}) => {
  const { t } = useTranslation();
  const [useBookmarks] = useState(false);
  return (
    <Card {...props}>
      <Card.Body>
        <Card.Title className="text-center">
          {icon} {title}
        </Card.Title>
        <Card.Subtitle className="text-center text-muted">
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
        </Card.Subtitle>
        {children}
      </Card.Body>
      {actions && <Card.Footer>{actions}</Card.Footer>}
    </Card>
  );
};

/** Component for displaying the users input selected for this tool. */
export const ToolInput: FC<ToolProp> = ({ tool }) => {
  const { t } = useTranslation();
  return (
    <Card as="section">
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

type ToolResponseProps = CardProps &
  ToolProp & { text?: string; regenerate?: (tool: ToolResult) => void };
export const ToolResponse: FC<ToolResponseProps> = ({
  tool,
  text,
  regenerate,
  children,
  ...props
}) => {
  const { t } = useTranslation();
  return (
    <Card {...props} as="section">
      <Card.Body>
        <Card.Title className="d-flex">
          <AIResponseIcon className="me-2" />
          <span>{t("tool.output")}</span>
          <ButtonToolbar className="ms-auto">
            {text && <TextToSpeech text={text} />}
            {tool?.result && regenerate && (
              <Button onClick={() => regenerate(tool)} variant="icon">
                <FontAwesomeIcon icon={faArrowsRotate} />
                <span className="visually-hidden sr-only">
                  {t("tool.regenerate")}
                </span>
              </Button>
            )}
          </ButtonToolbar>
        </Card.Title>
        {tool?.result ? children : <Loading />}
      </Card.Body>
    </Card>
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
        variant="dark"
        disabled={!text}
        onClick={() => paste(text)}
        className="me-auto mw-50 w-50"
      >
        {t("tool.paste")}
      </Button>
      <Button
        variant="secondary"
        disabled={!text}
        onClick={() => text && navigator.clipboard.writeText(text)}
      >
        <FontAwesomeIcon icon={faClipboard} />
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
