import { FC } from "react";
import { Card, CardProps, ListGroup } from "react-bootstrap";
import { Translation } from "react-i18next";
import { WritingTask } from "../../../lib/WritingTask";

type WritingTaskInfoProps = CardProps & {
  task: WritingTask | null;
};
/**
 * Card for displaying Metadata about a writing task.
 * @param param0
 * @returns
 * @component
 */
export const WritingTaskInfo: FC<WritingTaskInfoProps> = ({
  task,
  ...props
}) => (
  <Card {...props}>
    <Card.Header>
      <Translation>
        {(t) => <>{task?.info.name ?? t("select_task.null")}</>}
      </Translation>
    </Card.Header>
    <ListGroup variant="flush">
      <ListGroup.Item>Version: {task?.info.version ?? "-"}</ListGroup.Item>
      <ListGroup.Item>Author: {task?.info.author ?? "-"}</ListGroup.Item>
      <ListGroup.Item>
        Copyright: {task && <>&copy; {task?.info.copyright}</>}
      </ListGroup.Item>
      <ListGroup.Item>
        Date: {task ? new Date(task.info.saved).toLocaleString() : "-"}
      </ListGroup.Item>
    </ListGroup>
  </Card>
);
