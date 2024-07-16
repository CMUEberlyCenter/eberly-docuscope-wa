import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faBookmark, faClipboard, faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { slateToHtml } from '@slate-serializers/html';
import { FC, forwardRef, useCallback, useEffect, useId, useState } from "react";
import {
  Alert,
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
import { Editor, Transforms } from "slate";
import { useSlate } from "slate-react";
import AIResponseIcon from '../../assets/icons/AIResponse.svg?react';
import ClarityIcon from "../../assets/icons/Clarity.svg?react";
import ContentIcon from '../../assets/icons/Content.svg?react';
import FlowIcon from "../../assets/icons/Flow.svg?react";
import GenerateIcon from "../../assets/icons/Generate.svg?react";
import HighlightIcon from "../../assets/icons/Highlight.svg?react";
import YourInputIcon from '../../assets/icons/YourInput.svg?react';
import logo from "../../assets/logo.svg";
import { serialize } from "../../service/editor-state.service";
import { useSelectTaskAvailable } from "../../service/lti.service";
import {
  postClarifyText,
  postConvertNotes,
  postExpectation,
  useAssessFeature,
  useScribe,
  useScribeFeatureNotes2Prose
} from "../../service/scribe.service";
import { useSettings } from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";
import { Rating } from "../Rating/Rating";
import { TextToSpeech } from "../scribe/TextToSpeech";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";
import "./ToolCard.scss";
import { Tool, ToolResults } from "./ToolResults";
import SelectExpectation from "../SelectExpectation/SelectExpectation";
import { Rule } from "../../../lib/WritingTask";

type ToolCardProps = JSX.IntrinsicAttributes;

const MySpinner: FC = () => (
  <Spinner animation="border" role="status" variant="info" className="mx-auto">
    <span className="visually-hidden sr-only">Processing...</span>
  </Spinner>
)
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
    const flowFeature = true; // TODO use settings
    const copyEditFeature = true; // TODO use settings
    const sentencesFeature = true; // TODO use settings
    // const clarifyFeature = useScribeFeatureClarify();
    // const grammarFeature = useScribeFeatureGrammar();
    const [currentTool, setCurrentTool] = useState<ToolResults | null>(null);
    const [history, setHistory] = useState<ToolResults[]>([]);
    const addHistory = (tool: ToolResults) => setHistory([...history, tool]);
    const scribe = useScribe();
    const assessFeature = useAssessFeature();
    // const logicalflowFeature = useScribeFeatureLogicalFlow();
    // const topicsFeature = useScribeFeatureTopics();
    // const editorContent = useEditorContent();
    const [showSelectExpectation, setShowSelectExpectation] = useState(false);

    const editor = useSlate();
    const doTool = useCallback(
      async (data: ToolResults) => {
        setCurrentTool(data);
        switch (data.tool) {
          case 'bullets':
          case 'prose': {
            const result = await postConvertNotes(data.input, data.tool, writingTask);
            const toolResult = { ...data, result };
            setCurrentTool(toolResult);
            addHistory(toolResult);
            break;
          }
          case 'expectation': {
            if (data.expectation) {
              const result = await postExpectation(data.input.text, data.expectation, writingTask);
              const toolResult = { ...data, result };
              setCurrentTool(toolResult);
              addHistory(toolResult);
            } else {
              setShowSelectExpectation(true);
            }
            break;
          }
          case 'copyedit': {
            const result = await postClarifyText(data.input, writingTask);
            const toolResult = { ...data, result };
            setCurrentTool(toolResult);
            addHistory(toolResult);
            break;
          }
          default:
            console.warn(`Unhandled tool: ${data.tool}`);
        }
      }, [writingTask]
    )
    const onTool = useCallback(
      (tool: Tool) => {
        if (editor.selection) {
          doTool({
            tool,
            datetime: new Date(),
            input: {
              text: serialize(Editor.fragment(editor, editor.selection)),
              html: slateToHtml(Editor.fragment(editor, editor.selection)), // FIXME loosing formatting, need custom serializer
              fragment: Editor.fragment(editor, editor.selection),
              range: editor.selection,
            },
            result: "",
            // document: editorContent,
          });
        } else {
          // error task, do not add to history
          setCurrentTool({
            tool,
            datetime: new Date(),
            input: {
              text: '',
            },
            result: '', // TODO indicate no text.
            // document: editorContent,
          });
        }
      },
      [editor, doTool]
    ); // Does this need to be wrapped in useCallback?
    const retry = useCallback(
      async (previous: ToolResults) =>
        doTool({
          ...previous,
          datetime: new Date(),
          result: "",
        }), [doTool]
    )

    const paste = useCallback(() => {
      if (currentTool?.result && editor.selection) {
        Transforms.insertNodes(
          editor,
          [{ type: "paragraph", children: [{ text: currentTool.result }] }],
        );
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

    const onBookmark = useCallback(() => {
      if (currentTool) {
        const updated = { ...currentTool, bookmarked: !currentTool?.bookmarked }
        setCurrentTool(updated);
        setHistory(history.map(h => h.datetime === currentTool.datetime ? updated : h))
      }
    }, [history, currentTool])
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
                  <Nav.Link onClick={() => window.open("review.html", '_blank')}>Review</Nav.Link>
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
                        <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("prose")}>
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
                        <Button variant="outline-dark" disabled={!scribe} onClick={() => onTool("bullets")}>
                          <Stack>
                            <GenerateIcon />
                            <span>Bullets</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                  </ButtonGroup>
                  <ButtonGroup className="bg-white shadow tools ms-2" size="sm">
                    {assessFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Check Content Expectations, requires selecting a writing task.</Tooltip>}>
                        <Button variant="outline-dark" disabled={!scribe || !writingTask} onClick={() => onTool("expectation")}>
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
                        <Button disabled variant="outline-dark" onClick={() => onTool('flow')}>
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
                        <Button variant="outline-dark" onClick={() => onTool('copyedit')}>
                          <Stack>
                            <span>Copy Edit</span>
                          </Stack>
                        </Button>
                      </OverlayTrigger>
                    )}
                    {sentencesFeature && (
                      <OverlayTrigger placement="bottom"
                        overlay={<Tooltip>Show Sentence Density Chart</Tooltip>}>
                        <Button disabled variant="outline-dark" onClick={() => onTool('sentences')}>
                          <Stack>
                            <ClarityIcon />
                            <span>Sentences</span>
                            {/* Clarity */}
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
        <article className="h-100 position-relative overflow-auto">
          {!currentTool && (
            <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
              <HighlightIcon className="icon-lg mx-auto" />
              <span className="mx-auto text-center">
                Write & highlight text for further actions
              </span>
            </Stack>
          )}
          {/* Maybe use Carousel for history? */}
          {currentTool?.tool === 'prose' && (
            <Card>
              <Card.Body>
                <Card.Title>Prose Generation</Card.Title>
                <Card.Subtitle>
                  {currentTool.datetime.toLocaleString()}
                  <Button variant="icon" onClick={() => onBookmark()}>
                    <FontAwesomeIcon icon={currentTool.bookmarked ? faBookmark : faRegularBookmark} />
                  </Button>
                </Card.Subtitle>
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <YourInputIcon className="me-2" />
                      Your Input
                    </Card.Title>
                    {currentTool.input.text.trim() ?
                      <Card.Text dangerouslySetInnerHTML={{ __html: currentTool.input.html ?? '' }}></Card.Text>
                      : <Card.Text><Alert variant="warning">Please select some text before launching this tool.</Alert></Card.Text>}
                  </Card.Body>
                </Card>
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <AIResponseIcon className="me-2" />
                      AI Response
                      {currentTool.result && (<>
                        <TextToSpeech text={currentTool.result} />
                        <Button onClick={() => retry(currentTool)}>
                          <FontAwesomeIcon icon={faArrowsRotate} />
                          <span className="visually-hidden sr-only">Regenerate</span>
                        </Button></>)}
                    </Card.Title>
                    {/* TODO add error reporting */}
                    <Card.Text as="div">{currentTool.result || <MySpinner />}</Card.Text>
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
          {currentTool?.tool === 'bullets' && (
            <Card>
              <Card.Body>
                <Card.Title>Bullets Generation</Card.Title>
                <Card.Subtitle>
                  {currentTool.datetime.toLocaleString()}
                  <Button variant="icon" onClick={() => onBookmark()}>
                    <FontAwesomeIcon icon={currentTool.bookmarked ? faBookmark : faRegularBookmark} />
                  </Button>
                </Card.Subtitle>
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <YourInputIcon className="me-2" />
                      Your Input
                    </Card.Title>
                    <Card.Text dangerouslySetInnerHTML={{ __html: currentTool.input.html ?? '' }}></Card.Text>
                  </Card.Body>
                </Card>
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <AIResponseIcon className="me-2" />
                      AI Response
                      {currentTool.result && (<>
                        <TextToSpeech text={currentTool.result} />
                        <Button onClick={() => retry(currentTool)}>
                          <FontAwesomeIcon icon={faArrowsRotate} />
                          <span className="visually-hidden sr-only">Regenerate</span>
                        </Button></>)}
                    </Card.Title>
                    {/* TODO add error reporting */}
                    <Card.Text as="div">{currentTool.result ?
                      <ul>
                        {currentTool.result.split(/\s*-\s+/).filter(b => b.trim() !== '').map(b => <li>{b}</li>)}
                      </ul>
                      : <MySpinner />}</Card.Text>
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
          {currentTool?.tool === 'expectation' && (
            <Card>
              <Card.Body>
                <Card.Title>Content</Card.Title>
                <Card.Subtitle>
                  {currentTool.datetime.toLocaleString()}
                  <Button variant="icon" onClick={() => onBookmark()}>
                    <FontAwesomeIcon icon={currentTool.bookmarked ? faBookmark : faRegularBookmark} />
                  </Button>
                </Card.Subtitle>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>
                      <YourInputIcon className="me-2" />
                      Your Input
                    </Card.Title>
                    <Card.Text dangerouslySetInnerHTML={{ __html: currentTool.input.html ?? '' }}></Card.Text>
                  </Card.Body>
                </Card>
                <Card as="section">
                  <Card.Title>
                    Expectation
                  </Card.Title>
                  <Card.Text as="div">
                    {currentTool.expectation
                      ? (
                        <Card>
                          <Card.Body>
                            <Card.Title>{currentTool.expectation.name}</Card.Title>
                            <Card.Text
                              dangerouslySetInnerHTML={{
                                __html: currentTool.expectation.description,
                              }}
                            />
                          </Card.Body>
                        </Card>)
                      : (
                        <Button onClick={() => setShowSelectExpectation(true)}>
                          Select an Expectation
                        </Button>
                      )}
                  </Card.Text>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>
                      <AIResponseIcon className="me-2" />
                      AI Response
                      {currentTool.result && (<>
                        <TextToSpeech text={currentTool.result} />
                        <Button onClick={() => retry(currentTool)}>
                          <FontAwesomeIcon icon={faArrowsRotate} />
                          <span className="visually-hidden sr-only">Regenerate</span>
                        </Button></>)}
                    </Card.Title>
                    {/* TODO add error reporting */}
                    <Card.Text as="div">{currentTool.result ?
                      <>
                        {currentTool.result && <Rating value={JSON.parse(currentTool.result).rating} />}
                        <div>{JSON.parse(currentTool.result).explanation}</div>
                      </>
                      : <MySpinner />}</Card.Text>
                  </Card.Body>
                </Card>
              </Card.Body>
            </Card>
          )}
          {currentTool?.tool === 'copyedit' && (
            <Card>
              <Card.Body>
                <Card.Title>Copy Edit</Card.Title>
                <Card.Subtitle>
                  {currentTool.datetime.toLocaleString()}
                  <Button variant="icon" onClick={() => onBookmark()}>
                    <FontAwesomeIcon icon={currentTool.bookmarked ? faBookmark : faRegularBookmark} />
                  </Button>
                </Card.Subtitle>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>
                      <YourInputIcon className="me-2" />
                      Your Input
                    </Card.Title>
                    <Card.Text dangerouslySetInnerHTML={{ __html: currentTool.input.html ?? '' }}></Card.Text>
                  </Card.Body>
                </Card>
                <Card as="section">
                  <Card.Body>
                    <Card.Title>
                      <AIResponseIcon className="me-2" />
                      AI Response
                      {currentTool.result && (<>
                        <TextToSpeech text={currentTool.result} />
                        <Button onClick={() => retry(currentTool)}>
                          <FontAwesomeIcon icon={faArrowsRotate} />
                          <span className="visually-hidden sr-only">Regenerate</span>
                        </Button></>)}
                    </Card.Title>
                    {/* TODO add error reporting */}
                    <Card.Text as="div">{currentTool.result ?
                      <>
                        <h3>Suggested Revisions:</h3>
                        <div dangerouslySetInnerHTML={{ __html: JSON.parse(currentTool.result).revision }}></div>
                        <h3>Explanation:</h3>
                        <div dangerouslySetInnerHTML={{ __html: JSON.parse(currentTool.result).explanation }}></div>
                      </>
                      : <MySpinner />}</Card.Text>
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
        <SelectExpectation show={showSelectExpectation} onHide={() => setShowSelectExpectation(false)}
          select={(expectation: Rule) => {
            console.log(currentTool);
            if (currentTool) {
              console.log(expectation)
              doTool({...currentTool, expectation});
            }
          }} />
      </Card>
    );
  }
);

export default ToolCard;
