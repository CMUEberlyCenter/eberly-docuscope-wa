import { FC, useEffect, useState } from "react";
import { Button, Card, ListGroup, Modal, Stack } from "react-bootstrap";
import {
  useWritingTask,
  useWritingTasks,
  writingTask
} from "../../service/writing-task.service";
import { WritingTask } from "../../../lib/WritingTask";

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
  const [selected, setSelected] = useState<WritingTask|null>(writing_task);
  useEffect(() => setSelected(writing_task), [writing_task]);

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
        <Button onClick={() => {writingTask.next(selected); onHide(); }}>Select</Button>
        <Button onClick={onHide}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectWritingTask;
