import { faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, useCallback, useState } from "react";
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  ListGroup,
  OverlayTrigger,
  Popover,
  Stack,
} from "react-bootstrap";
import { Descendant, Editor, Range } from "slate";
import ClarityIcon from "../../assets/icons/Clarity.svg?react";
import ContentIcon from "../../assets/icons/Content.svg?react";
import FlowIcon from "../../assets/icons/Flow.svg?react";
import GenerateIcon from "../../assets/icons/Generate.svg?react";
import HighlightIcon from "../../assets/icons/Highlight.svg?react";
import logo from "../../assets/logo.svg";
import { useEditorContent } from "../../service/editor-state.service";
import { useSelectTaskAvailable } from "../../service/lti.service";
import {
  useAssessFeature,
  useScribe,
  useScribeFeatureClarify,
  useScribeFeatureGrammar,
  useScribeFeatureLogicalFlow,
  useScribeFeatureNotes2Prose,
  useScribeFeatureTopics,
} from "../../service/scribe.service";
import { useSettings } from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";
import "./ToolCard.scss";

type ToolResults = {
  tool: string;
  datetime: Date;
  input: { text: string; fragment?: Descendant[]; range?: Range };
  result: string;
  document: Descendant[];
  bookmarked?: boolean;
};
type ToolCardProps = JSX.IntrinsicAttributes & { editor: Editor };

const ToolCard = forwardRef<HTMLDivElement, ToolCardProps>(
  ({ editor, ...props }, ref) => {
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
    const assessFeature = useAssessFeature();
    const logicalflowFeature = useScribeFeatureLogicalFlow();
    const topicsFeature = useScribeFeatureTopics();
    const editorContent = useEditorContent();

    const onTool = useCallback(
      (tool: string) => {
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
        addHistory(res);
        setCurrentTool(res);
      },
      [editor]
    ); // Does this need to be wrapped in useCallback?

    return (
      <Card
        {...props}
        as="section"
        className="overflow-hidden tool-card h-100 bg-light"
        ref={ref}
      >
        <Card.Title as="h4" className="text-dark ms-auto mt-1">
          <img
            style={{ height: "1.75em" }}
            src={logo}
            alt={settings.brand ?? "myScribe"}
          />
        </Card.Title>
        <ButtonToolbar className="mx-auto">
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
                  <GenerateIcon/>
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
                  <ContentIcon/>
                  <span>Content</span>
                </Stack>
              </Button>
            </OverlayTrigger>
            <Button variant="outline-dark">
              <Stack>
                <FlowIcon/>
                <span>Flow</span>
              </Stack>
            </Button>
            <Button variant="outline-dark">
              <Stack>
                <ClarityIcon/>
                <span>Clarity</span>
              </Stack>
            </Button>
          </ButtonGroup>
        </ButtonToolbar>
        <article className="h-100 position-relative">
          {!currentTool && (
            <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
              <HighlightIcon className="icon-lg mx-auto"/>
              <span className="mx-auto text-center">
                Write & highlight text for further actions
              </span>
            </Stack>
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
