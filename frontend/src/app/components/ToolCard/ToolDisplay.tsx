import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faBookmark, faClipboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, ReactNode, useCallback } from "react";
import { Alert, Button, Card, CardProps, Spinner } from "react-bootstrap";
import { Transforms } from "slate";
import { useSlate } from "slate-react";
import AIResponseIcon from '../../assets/icons/AIResponse.svg?react';
import YourInputIcon from '../../assets/icons/YourInput.svg?react';
import { TextToSpeech } from "../scribe/TextToSpeech";
import { ToolResult } from "./ToolResults";

const MySpinner: FC = () => (
  <Spinner animation="border" role="status" variant="info" className="mx-auto">
    <span className="visually-hidden sr-only">Processing...</span>
  </Spinner>
)

type ToolProp = { tool?: ToolResult | null }
type ToolRootProps = CardProps & ToolProp & { title: string, onBookmark: () => void, actions?: ReactNode };
export const ToolRoot: FC<ToolRootProps> = ({ tool, children, title, onBookmark, actions, ...props }) => {
  return (
    <Card {...props}>
      <Card.Body>
        <Card.Title>{title}</Card.Title>
        <Card.Subtitle>
          {tool?.datetime.toLocaleString()}
          <Button variant="icon" onClick={() => onBookmark()}>
            <FontAwesomeIcon icon={tool?.bookmarked ? faBookmark : faRegularBookmark} />
            <span className="visually-hidden sr-only">
              {tool?.bookmarked ? 'Bookmarked' : 'Bookmark'}
            </span>
          </Button>
        </Card.Subtitle>
        {children}
      </Card.Body>
      {actions && <Card.Footer>{actions}</Card.Footer>}
    </Card>
  );
}

export const ToolInput: FC<ToolProp> = ({ tool }) => {
  return (
    <Card as="section">
      <Card.Body>
        <Card.Title>
          <YourInputIcon className="me-2" />
          Your Input
        </Card.Title>
        {tool?.input.text.trim() ?
          <Card.Text dangerouslySetInnerHTML={{ __html: tool.input.html ?? tool.input.text }}></Card.Text>
          : <Card.Text as="div">
            <Alert variant="warning">Please select some text before launching this tool.</Alert>
          </Card.Text>}
      </Card.Body>
    </Card>
  )
}

type ToolResponseProps = CardProps & ToolProp & { text?: string, regenerate?: (tool: ToolResult) => void }
export const ToolResponse: FC<ToolResponseProps> = ({ tool, text, regenerate, children, ...props }) => {
  return (
    <Card {...props} as="section">
      <Card.Body>
        <Card.Title>
          <AIResponseIcon className="me-2" />
          AI Response
          {text && (<TextToSpeech text={text} />)}
          {tool?.result && regenerate &&
            <Button onClick={() => regenerate(tool)}>
              <FontAwesomeIcon icon={faArrowsRotate} />
              <span className="visually-hidden sr-only">Regenerate</span>
            </Button>}
        </Card.Title>
        {tool?.result ? children : <MySpinner />}
      </Card.Body>
    </Card>
  );
};

type ToolPasteProps = { text: string | undefined | null };
export const ToolPaste: FC<ToolPasteProps> = ({ text }) => {
  const editor = useSlate();
  const paste = useCallback((text: string | undefined | null) => {
    if (text && editor.selection) {
      Transforms.insertNodes(
        editor,
        [{ type: "paragraph", children: [{ text }] }],
      );
    }
  }, [editor]);
  return (<>
    <Button disabled={!text} onClick={() => paste(text)}>Paste Text</Button>
    <Button disabled={!text} onClick={() => text && navigator.clipboard.writeText(text)}>
      <FontAwesomeIcon icon={faClipboard} />
      <span className="visually-hidden sr-only">Copy to Clipboard</span>
    </Button>
  </>);
}

export const ToolDisplay = {
  Root: ToolRoot,
  Input: ToolInput,
  Response: ToolResponse,
  Spinner: MySpinner,
  Paste: ToolPaste,
};