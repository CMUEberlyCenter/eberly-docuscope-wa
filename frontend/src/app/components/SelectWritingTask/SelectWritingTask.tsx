import { ChangeEvent, FC, useEffect, useState } from "react";
import { Button, Card, Form, ListGroup, Modal, Stack } from "react-bootstrap";
import { WritingTask, isWritingTask } from "../../../lib/WritingTask";
import { useLti, useLtiInfo } from "../../service/lti.service";
import {
  useWritingTask,
  useWritingTasks,
  writingTask
} from "../../service/writing-task.service";

type SelectWritingTaskProps = {
  show: boolean;
  onHide: () => void;
};
const SelectWritingTask: FC<SelectWritingTaskProps> = ({
  show,
  onHide,
}: SelectWritingTaskProps) => {
  const { data: writingTasks } = useWritingTasks();
  const writing_task = useWritingTask();
  const inLti = useLti();
  const ltiInfo = useLtiInfo();
  const [selected, setSelected] = useState<WritingTask | null>(writing_task);
  useEffect(() => setSelected(writing_task), [writing_task]);
  const [valid, setValid] = useState(true);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        const content = await files[0].text();
        const json = JSON.parse(content);
        if (isWritingTask(json)) {
          setValid(true);
          setSelected(json);
          // TODO: update server
        } else {
          setValid(false);
        }
      } catch (err) {
        setValid(false);
        console.error(err);
      }
    }
  }

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
            {inLti && ltiInfo?.writing_task && (
              <ListGroup.Item
                action
                active={selected === ltiInfo.writing_task}
                onClick={() => setSelected(ltiInfo.writing_task ?? null)}
              >
                {ltiInfo.writing_task.info.name}
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
                Copyright:{" "}
                {selected && <>&copy; {selected?.info.copyright}</>}
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
        {inLti && ltiInfo?.instructor && (
          <Form noValidate>
            <Form.Group>
              <Form.FloatingLabel label="Custom Writing Task">
              <Form.Control type="file" onChange={onFileChange} isInvalid={!valid}/>
              <Form.Control.Feedback type="invalid">
                Uploaded file is not a valid writing task specificaton!
              </Form.Control.Feedback>
              </Form.FloatingLabel>
            </Form.Group>
          </Form>
        )}
        <Button onClick={() => { writingTask.next(selected); onHide(); }}>Select</Button>
        <Button onClick={onHide}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectWritingTask;
