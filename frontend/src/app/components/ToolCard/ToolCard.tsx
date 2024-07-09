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
  Spinner,
  Stack,
  Tab
} from "react-bootstrap";
import { Editor, Range, Transforms } from "slate";
import { useSlate } from "slate-react";
import AIResponseIcon from '../../assets/icons/AIResponse.svg?react';
import ClarityIcon from "../../assets/icons/Clarity.svg?react";
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
  useScribeFeatureClarify,
  useScribeFeatureGrammar,
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
    const clarifyFeature = useScribeFeatureClarify();
    const grammarFeature = useScribeFeatureGrammar();
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
        <div>
        <Tab.Container id={tabId} defaultActiveKey="generate" activeKey={tab}>
          <Navbar>
            <Container>
              <Nav variant="tabs">
                <Nav.Item>
                  <Nav.Link eventKey="generate" onClick={() => setTab('generate')}>Generate</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="refine" onClick={() => setTab('refine')}>Refine</Nav.Link>
                </Nav.Item>
                {/* <Nav.Link>Review</Nav.Link> */}
              </Nav>
              <Navbar.Brand>
                <img
                  style={{ height: "1.75em" }}
                  src={logo}
                  alt={settings.brand ?? "myScribe"}
                />
              </Navbar.Brand>
            </Container>
          </Navbar>
          {/* <Card.Title as="h4" className="text-dark ms-auto mt-1">
          <img
            style={{ height: "1.75em" }}
            src={logo}
            alt={settings.brand ?? "myScribe"}
          />
        </Card.Title> */}
          <Tab.Content>
            <Tab.Pane eventKey="generate">
              <ButtonToolbar className="ms-5 mb-3">
                <ButtonGroup className="bg-white shadow tools" size="sm">
                  {notes2proseFeature && (
                    <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("notes2prose")}>
                      <Stack>
                        <GenerateIcon />
                        <span>Prose</span>
                      </Stack>
                    </Button>
                  )}
                  {clarifyFeature && (
                    <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("clarify")}>
                      <Stack>
                        <GenerateIcon />
                        <span>Clarify</span>
                      </Stack>
                    </Button>
                  )}
                  {grammarFeature && (
                    <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("grammar")}>
                      <Stack>
                        <GenerateIcon />
                        <span>Grammar</span>
                      </Stack>
                    </Button>
                  )}
                </ButtonGroup>
              </ButtonToolbar>
            </Tab.Pane>
            <Tab.Pane eventKey="refine">
              <ButtonToolbar className="ms-5 mb-3">
                <ButtonGroup className="bg-white shadow tools" size="sm">
                  <Button variant="outline-dark">
                    <Stack>
                      <FlowIcon />
                      <span>Flow</span>
                    </Stack>
                  </Button>
                  <Button variant="outline-dark">
                    <Stack>
                      <ClarityIcon />
                      <span>Clarity</span>
                    </Stack>
                  </Button>
                </ButtonGroup>
              </ButtonToolbar>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container></div>
        {/* <ButtonToolbar className="mx-auto mb-3">
          <ButtonGroup className="bg-white shadow tools" size="sm">
            <OverlayTrigger
              rootClose
              trigger={"click"}
              placement={"bottom-start"}
              overlay={
                <Popover>
                  <ListGroup>
                    {notes2proseFeature && (
                      <ListGroup.Item
                        action
                        disabled={!scribe}
                        onClick={() => onTool("notes2prose")}
                      >
                        Notes to Prose
                      </ListGroup.Item>
                    )}
                    {clarifyFeature && (
                      <ListGroup.Item
                        action
                        disabled={!scribe}
                        onClick={() => onTool("clarify")}
                      >
                        Clarify Text
                      </ListGroup.Item>
                    )}
                    {grammarFeature && (
                      <ListGroup.Item
                        action
                        disabled={!scribe}
                        onClick={() => onTool("grammar")}
                      >
                        Fix Grammar
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Popover>
              }
            >
              <Button variant="outline-dark" disabled={!scribe}>
                <Stack>
                  <GenerateIcon />
                  <span>Generate</span>
                </Stack>
              </Button>
            </OverlayTrigger>
            <OverlayTrigger
              rootClose
              trigger={"click"}
              placement={"bottom-start"}
              overlay={
                <Popover>
                  <ListGroup>
                    {assessFeature && (
                      <ListGroup.Item action disabled={!scribe}>
                        Assess Expectation
                      </ListGroup.Item>
                    )}
                    {logicalflowFeature && (
                      <ListGroup.Item action disabled={!scribe}>
                        Logical Flow
                      </ListGroup.Item>
                    )}
                    {topicsFeature && (
                      <ListGroup.Item action disabled={!scribe}>
                        List Main/Sub Topics
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Popover>
              }
            >
              <Button variant="outline-dark" disabled={!scribe}>
                <Stack>
                  <ContentIcon />
                  <span>Content</span>
                </Stack>
              </Button>
            </OverlayTrigger>
            <Button variant="outline-dark">
              <Stack>
                <FlowIcon />
                <span>Flow</span>
              </Stack>
            </Button>
            <Button variant="outline-dark">
              <Stack>
                <ClarityIcon />
                <span>Clarity</span>
              </Stack>
            </Button>
          </ButtonGroup>
        </ButtonToolbar> */}
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
