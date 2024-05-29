import { FC } from "react";
import { Card, ListGroup, Modal, Stack } from "react-bootstrap";
import {
  useWritingTask,
  useWritingTasks,
  writingTask,
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
  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>Select Writing Task</Modal.Header>
      <Modal.Body>
        <Stack direction="horizontal" gap={3}>
          <ListGroup>
            {writingTasks?.map((task) => (
              <ListGroup.Item
                active={writing_task === task}
                action
                onClick={() => writingTask.next(task)}
              >
                {task.info.name}
              </ListGroup.Item>
            ))}
            <ListGroup.Item
              action
              variant="warning"
              onClick={() => writingTask.next(null)}
            >
              No Writing Task
            </ListGroup.Item>
          </ListGroup>
          <Card className="w-50 h-100">
            <Card.Header>
              {writing_task?.info.name ?? "No Writing Task"}
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                Version: {writing_task?.info.version ?? "-"}
              </ListGroup.Item>
              <ListGroup.Item>
                Author: {writing_task?.info.author ?? "-"}
              </ListGroup.Item>
              <ListGroup.Item>
                Copyright:{" "}
                {writing_task && <>&copy; {writing_task?.info.copyright}</>}
              </ListGroup.Item>
              <ListGroup.Item>
                Date:{" "}
                {writing_task
                  ? new Date(writing_task.info.saved).toLocaleString()
                  : "-"}
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Stack>
      </Modal.Body>
    </Modal>
  );
};
export default SelectWritingTask;
