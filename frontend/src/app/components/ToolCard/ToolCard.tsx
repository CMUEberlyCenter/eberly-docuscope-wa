import { faArrowsRotate, faClipboard, faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, useCallback, useEffect, useId, useState } from "react";
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Container,
  Nav,
  Navbar,
  OverlayTrigger,
  Spinner,
  Stack,
  Tab,
  Tooltip
} from "react-bootstrap";
import { Editor, Range, Transforms } from "slate";
import { useSlate } from "slate-react";
import AIResponseIcon from '../../assets/icons/AIResponse.svg?react';
import ClarityIcon from "../../assets/icons/Clarity.svg?react";
import ContentIcon from '../../assets/icons/Content.svg?react';
import FlowIcon from "../../assets/icons/Flow.svg?react";
import GenerateIcon from "../../assets/icons/Generate.svg?react";
import HighlightIcon from "../../assets/icons/Highlight.svg?react";
import YourInputIcon from '../../assets/icons/YourInput.svg?react';
import logo from "../../assets/logo.svg";
import { useEditorContent } from "../../service/editor-state.service";
import { useSelectTaskAvailable } from "../../service/lti.service";
import {
  getConvertNotes,
  useScribe,
  useScribeFeatureNotes2Prose
} from "../../service/scribe.service";
import { useSettings } from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";
import { TextToSpeech } from "../scribe/TextToSpeech";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";
import "./ToolCard.scss";
import { ToolResults } from "./ToolResults";

type ToolCardProps = JSX.IntrinsicAttributes;

/**
 * Top level framework for writing tools display.
 */
const ToolCard = forwardRef<HTMLDivElement, ToolCardProps>(
  ({ ...props }, ref) => {
    const selectAvailable = useSelectTaskAvailable();
    const writingTask = useWritingTask();
    const [showSelectWritingTasks, setShowSelectWritingTasks] = useState(false);
    const [showWritingTask, setShowWritingTask] = useState(false);
    const settings = useSettings();
    const notes2proseFeature = useScribeFeatureNotes2Prose();
    const bulletsFeature = true; // TODO use settings
    const contentFeature = true; // TODO use settings
    const flowFeature = true; // TODO use settings
    const copyEditFeature = true; // TODO use settings
    const sentencesFeature = true; // TODO use settings
    // const clarifyFeature = useScribeFeatureClarify();
    // const grammarFeature = useScribeFeatureGrammar();
    const [currentTool, setCurrentTool] = useState<ToolResults | null>(null);
    const [history, setHistory] = useState<ToolResults[]>([]);
    const addHistory = (tool: ToolResults) => setHistory([...history, tool]);
    const scribe = useScribe();
    // const assessFeature = useAssessFeature();
    // const logicalflowFeature = useScribeFeatureLogicalFlow();
    // const topicsFeature = useScribeFeatureTopics();
    const editorContent = useEditorContent();

    const editor = useSlate();
    const onTool = useCallback(
      async (tool: string) => {
        const input = editor.selection
          ? {
            text: Editor.string(editor, editor.selection),
            fragment: Editor.fragment(editor, editor.selection),
            range: editor.selection,
          }
          : { text: "" };
        const res: ToolResults = {
          tool,
          datetime: new Date(),
          input,
          result: "",
          document: editorContent,
        };
        setCurrentTool(res);
        switch (tool) {
          case 'notes2prose': {
            const result = await getConvertNotes(input);
            setCurrentTool({ ...res, result });
            addHistory({ ...res, result });
            break;
          }
          default:
            console.warn(`Unhandled tool: ${tool}`);
        }
      },
      [editor]
    ); // Does this need to be wrapped in useCallback?

    const paste = useCallback(() => {
      if (currentTool?.result && editor.selection) {
        // FIXME this is only adding to end.
        const start = Range.end(editor.selection);
        Transforms.insertNodes(
          editor,
          [{ type: "paragraph", children: [{ text: currentTool.result }] }],
          {
            at: start,
            select: true,
          }
        );
        Transforms.select(editor, {
          anchor: { path: [start.path[0] + 1, 0], offset: 0 },
          focus: { path: [start.path[0] + 1, 0], offset: currentTool.result.length, }
        });
      }
    }, [editor, currentTool]);

    // Tab control stuff
    const tabId = useId();
    const [tab, setTab] = useState('generate');

    // If writing task is changed, show its details.
    useEffect(() => {
      if (writingTask) {
        setShowWritingTask(true);
      }
    }, [writingTask]);
    return (
      <Card
        {...props}
        as="section"
        className="overflow-hidden tool-card h-100 bg-light"
        ref={ref}
      >
        <Card.Header className="px-0">
          <Tab.Container id={tabId} defaultActiveKey="generate" activeKey={tab}>
            <Navbar>
              <Container>
                <Nav variant="tabs">
                  <Nav.Item>
                    <Nav.Link eventKey="generate" onClick={() => setTab('generate')}>Draft</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="refine" onClick={() => setTab('refine')}>Polish</Nav.Link>
                  </Nav.Item>
                  <Nav.Link>Review</Nav.Link>
                </Nav>
                <Navbar.Brand>
                  <img
                    style={{ height: "1.75em" }}
                    src={logo}
                    alt={settings.brand ?? "onTopic"}
                  />
                </Navbar.Brand>
              </Container>
            </Navbar>
            <Tab.Content>
              <Tab.Pane eventKey="generate">
                <ButtonToolbar className="ms-5 mb-3">
                  <ButtonGroup className="bg-white shadow tools" size="sm">
                    {notes2proseFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Generate Prose from Notes</Tooltip>}>
                        <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("notes2prose")}>
                          <Stack>
                            <GenerateIcon />
                            <span>Prose</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                    {bulletsFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Generate Bulleted List from Notes</Tooltip>}>
                        <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("clarify")}>
                          <Stack>
                            <GenerateIcon />
                            <span>Bullets</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                  </ButtonGroup>
                  <ButtonGroup className="bg-white shadow tools ms-2" size="sm">
                    {contentFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Check Content Expectations</Tooltip>}>
                        <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("grammar")}>
                          <Stack>
                            <ContentIcon />
                            <span>Content</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                  </ButtonGroup>
                </ButtonToolbar>
              </Tab.Pane>
              <Tab.Pane eventKey="refine">
                <ButtonToolbar className="ms-5 mb-3">
                  <ButtonGroup className="bg-white shadow tools" size="sm">
                    {flowFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Check Flow Between Sentences</Tooltip>}>
                        <Button variant="outline-dark">
                          <Stack>
                            <FlowIcon />
                            <span>Flow</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                    {copyEditFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Copy Edit</Tooltip>}>
                        <Button variant="outline-dark">
                          <Stack>
                            <span>Copy Edit</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                    {sentencesFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Show Sentence Density Chart</Tooltip>}>
                        <Button variant="outline-dark">
                          <Stack>
                            <ClarityIcon />
                            <span>Sentences</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                  </ButtonGroup>
                </ButtonToolbar>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Header>
        <article className="h-100 position-relative">
          {!currentTool && (
            <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
              <HighlightIcon className="icon-lg mx-auto" />
              <span className="mx-auto text-center">
                Write & highlight text for further actions
              </span>
            </Stack>
          )}
          {currentTool?.tool === 'notes2prose' && (
            <Card>
              <Card.Body>
                <Card.Title>Prose Generation</Card.Title>
                <Card.Subtitle>{currentTool.datetime.toLocaleString()}</Card.Subtitle>
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <YourInputIcon className="me-2" />
                      Your Input
                    </Card.Title>
                    <Card.Text>{currentTool.input.text}</Card.Text>
                  </Card.Body>
                </Card>
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <AIResponseIcon className="me-2" />
                      AI Response
                      {currentTool.result && (<><TextToSpeech text={currentTool.result} />
                        <Button>
                          <FontAwesomeIcon icon={faArrowsRotate} />
                          <span className="visually-hidden sr-only">Regenerate</span>
                        </Button></>)}
                    </Card.Title>
                    {/* TODO add error reporting */}
                    <Card.Text as="div">{currentTool.result || <Spinner />}</Card.Text>
                  </Card.Body>
                </Card>
              </Card.Body>
              <Card.Footer>
                <Button onClick={paste}>Paste Text</Button>
                <Button onClick={() => navigator.clipboard.writeText(currentTool.result)}>
                  <FontAwesomeIcon icon={faClipboard} />
                  <span className="visually-hidden sr-only">Copy to Clipboard</span>
                </Button>
              </Card.Footer>
            </Card>
          )}
        </article>
        <Card.Footer>
          {writingTask && (
            <Button
              variant="outline-dark"
              onClick={() => setShowWritingTask(true)}
            >
              View Outline
            </Button>
          )}
          {selectAvailable && (
            <Button
              variant={writingTask ? "none" : "dark"}
              onClick={() => setShowSelectWritingTasks(true)}
            >
              {writingTask ? (
                <FontAwesomeIcon icon={faEllipsis} />
              ) : (
                "Select Writing Task"
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
      </Card>
    );
  }
);

export default ToolCard;
