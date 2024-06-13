import { ChangeEvent, FC, useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  ListGroup,
  Modal,
  OverlayTrigger,
  Popover,
  Stack,
} from "react-bootstrap";
import { WritingTask, isWritingTask } from "../../../lib/WritingTask";
import { useLti, useLtiInfo } from "../../service/lti.service";
import {
  useWritingTask,
  useWritingTasks,
  writingTask,
} from "../../service/writing-task.service";

type SelectWritingTaskProps = {
  show: boolean;
  onHide: () => void;
};
/**
 * A modal dialog for selecting and displaying meta information about a writing task.
 * @param param0.show if true, show the modal.
 * @param param0.onHide callback to execute when modal is closed.
 * @returns
 */
const SelectWritingTask: FC<SelectWritingTaskProps> = ({
  show,
  onHide,
}: SelectWritingTaskProps) => {
  const { data: writingTasks } = useWritingTasks(); // all public tasks
  const writing_task = useWritingTask(); // current task
  const inLti = useLti(); // in LTI context
  const ltiInfo = useLtiInfo(); // Information from LTI
  const [selected, setSelected] = useState<WritingTask | null>(writing_task);
  useEffect(() => setSelected(writing_task), [writing_task]);
  const [valid, setValid] = useState(true); // Uploaded file validity
  const [custom, setCustom] = useState<WritingTask | null>(null);
  useEffect(() => setCustom(ltiInfo?.writing_task ?? null), [ltiInfo]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        const content = await files[0].text();
        const json = JSON.parse(content);
        if (isWritingTask(json)) {
          setValid(true);
          setCustom(json);
          setSelected(json);
        } else {
          setValid(false);
        }
      } catch (err) {
        // expecting JSON parser error.
        // TODO provide error message to invalid text.
        setValid(false);
        console.error(err);
      }
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>Select Writing Task</Modal.Header>
      <Modal.Body>
        <Stack direction="horizontal" gap={3}>
          <ListGroup>
            {writingTasks?.map((task) => (
              <ListGroup.Item
                key={task.info.name}
                active={selected === task}
                action
                onClick={() => setSelected(task)}
              >
                {task.info.name}
              </ListGroup.Item>
            ))}
            {custom && (
              <ListGroup.Item
                action
                active={selected === custom}
                onClick={() => setSelected(custom)}
              >
                {custom.info.name}
              </ListGroup.Item>
            )}
            <ListGroup.Item
              action
              variant="warning"
              onClick={() => setSelected(null)}
            >
              No Writing Task
            </ListGroup.Item>
          </ListGroup>
          <Card className="w-50 h-100">
            <Card.Header>
              {selected?.info.name ?? "No Writing Task"}
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                Version: {selected?.info.version ?? "-"}
              </ListGroup.Item>
              <ListGroup.Item>
                Author: {selected?.info.author ?? "-"}
              </ListGroup.Item>
              <ListGroup.Item>
                Copyright: {selected && <>&copy; {selected?.info.copyright}</>}
              </ListGroup.Item>
              <ListGroup.Item>
                Date:{" "}
                {selected
                  ? new Date(selected.info.saved).toLocaleString()
                  : "-"}
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        {(!inLti || ltiInfo?.instructor) && (
          <OverlayTrigger
            trigger="click"
            placement="top"
            overlay={
              <Popover>
                <Popover.Header>Upload Custom Writing Task</Popover.Header>
                <Popover.Body>
                  <Form noValidate>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        onChange={onFileChange}
                        isInvalid={!valid}
                      />
                      <Form.Control.Feedback type="invalid">
                        Uploaded file is not a valid writing task specificaton!
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Form>
                </Popover.Body>
              </Popover>
            }
          >
            <Button className="me-auto">+</Button>
          </OverlayTrigger>
        )}
        <Button
          onClick={() => {
            writingTask.next(selected);
            onHide();
          }}
        >
          Select
        </Button>
        <Button onClick={onHide}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectWritingTask;
