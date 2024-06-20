import { faEllipsis, faHighlighter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, useState } from "react";
import { Button, ButtonGroup, ButtonToolbar, Card } from "react-bootstrap";
import { useSelectTaskAvailable } from "../../service/lti.service";
import { useWritingTask } from "../../service/writing-task.service";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";
import './ToolCard.scss';

const ToolCard = forwardRef<HTMLDivElement, object>((props, ref) => {
  const selectAvailable = useSelectTaskAvailable();
  const writingTask = useWritingTask();
  const [showSelectWritingTasks, setShowSelectWritingTasks] = useState(false);
  const [showWritingTask, setShowWritingTask] = useState(false);

  return (
    <Card {...props} as="section" className="overflow-hidden tool-card h-100" ref={ref}>
      <Card.Title><h3 className="text-primary">myScribe</h3></Card.Title>
      <ButtonToolbar>
        <ButtonGroup>
          <Button>Generate</Button>
          <Button>Content</Button>
          <Button>Flow</Button>
          <Button>Clarity</Button>
        </ButtonGroup>
      </ButtonToolbar>
      <article className="h-100">
        <FontAwesomeIcon icon={faHighlighter} />
        <span>Write & highlight text for further actions</span>
      </article>
      <Card.Footer>
        <ButtonGroup>
        {writingTask && <Button onClick={() => setShowWritingTask(true)}>View Outline</Button>}
        {selectAvailable &&
          <Button onClick={() => setShowSelectWritingTasks(true)}>
            {writingTask ? <FontAwesomeIcon icon={faEllipsis} /> : 'Select Writing Task'}
          </Button>
        }
        </ButtonGroup>
      </Card.Footer>
        <WritingTaskDetails show={showWritingTask} onHide={() => setShowWritingTask(false)} />
        {selectAvailable && <SelectWritingTask show={showSelectWritingTasks} onHide={() => setShowSelectWritingTasks(false)} />}
    </Card>
  )
});

export default ToolCard;