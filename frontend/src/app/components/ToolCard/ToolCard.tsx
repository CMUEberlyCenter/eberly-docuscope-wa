import { faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, useState } from "react";
import { Button, ButtonGroup, ButtonToolbar, Card, ListGroup, OverlayTrigger, Popover, Stack } from "react-bootstrap";
import clarityIcon from '../../assets/icons/Clarity.svg';
import contentIcon from '../../assets/icons/Content.svg';
import flowIcon from '../../assets/icons/Flow.svg';
import generateIcon from '../../assets/icons/Generate.svg';
import highlightIcon from '../../assets/icons/Highlight.svg';
import { useSelectTaskAvailable } from "../../service/lti.service";
import { useScribe, useScribeFeatureClarify, useScribeFeatureGrammar, useScribeFeatureNotes2Prose } from "../../service/scribe.service";
import { useSettings } from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";
import './ToolCard.scss';

const ToolCard = forwardRef<HTMLDivElement, object>((props, ref) => {
  const selectAvailable = useSelectTaskAvailable();
  const writingTask = useWritingTask();
  const [showSelectWritingTasks, setShowSelectWritingTasks] = useState(false);
  const [showWritingTask, setShowWritingTask] = useState(false);
  const settings = useSettings();
  const notes2proseFeature = useScribeFeatureNotes2Prose();
  const clarifyFeature = useScribeFeatureClarify();
  const grammarFeature = useScribeFeatureGrammar();
  const scribeFeature = useScribe();

  return (
    <Card {...props} as="section" className="overflow-hidden tool-card h-100 bg-light" ref={ref}>
      <Card.Title as="h4" className="text-dark ms-2 mt-1">{settings.brand ?? 'myScribe'}</Card.Title>
      <ButtonToolbar className="mx-auto">
        <ButtonGroup className="bg-white shadow tools" size="sm">
          <OverlayTrigger rootClose trigger={"click"} placement={"bottom-start"} overlay={(
            <Popover>
              <ListGroup>
                {notes2proseFeature && <ListGroup.Item action>Notes to Prose</ListGroup.Item>}
                {clarifyFeature && <ListGroup.Item action>Clarify Text</ListGroup.Item>}
                {grammarFeature && <ListGroup.Item action>Fix Grammar</ListGroup.Item>}
              </ListGroup>
            </Popover>
          )}>
            <Button variant="outline-dark" disabled={!scribeFeature}>
              <Stack>
                <img src={generateIcon} alt="Generate" className="icon" />
                <span>Generate</span>
              </Stack>
            </Button>
          </OverlayTrigger>
          <OverlayTrigger rootClose trigger={"click"} placement={"bottom-start"} overlay={(
            <Popover>
              <ListGroup>
                <ListGroup.Item>Assess Expectation</ListGroup.Item>
                <ListGroup.Item>Logical Flow</ListGroup.Item>
                <ListGroup.Item>Topics</ListGroup.Item>
              </ListGroup>
            </Popover>)}>
            <Button variant="outline-dark" disabled={!scribeFeature}>
              <Stack>
                <img src={contentIcon} alt="Content" className="icon" />
                <span>Content</span>
              </Stack>
            </Button>
          </OverlayTrigger>
          <Button variant="outline-dark">
            <Stack>
              <img src={flowIcon} alt="Flow" className="icon" />
              <span>Flow</span>
            </Stack>
          </Button>
          <Button variant="outline-dark">
            <Stack>
              <img src={clarityIcon} alt="Clarity" className="icon" />
              <span>Clarity</span>
            </Stack>
          </Button>
        </ButtonGroup>
      </ButtonToolbar>
      <article className="h-100 position-relative">
        <Stack className="position-absolute start-50 top-50 translate-middle w-75 ">
          <img className="icon-lg mx-auto" src={highlightIcon} alt="Highlight and write" />
          <span className="mx-auto text-center">Write & highlight text for further actions</span>
        </Stack>
      </article>
      <Card.Footer>
        {writingTask && <Button variant="outline-dark" onClick={() => setShowWritingTask(true)}>View Outline</Button>}
        {selectAvailable &&
          <Button variant={writingTask ? 'none' : "dark"} onClick={() => setShowSelectWritingTasks(true)}>
            {writingTask ? <FontAwesomeIcon icon={faEllipsis} /> : 'Select Writing Task'}
          </Button>
        }
      </Card.Footer>
      <WritingTaskDetails show={showWritingTask} onHide={() => setShowWritingTask(false)} />
      {selectAvailable && <SelectWritingTask show={showSelectWritingTasks} onHide={() => setShowSelectWritingTasks(false)} />}
    </Card>
  )
});

export default ToolCard;