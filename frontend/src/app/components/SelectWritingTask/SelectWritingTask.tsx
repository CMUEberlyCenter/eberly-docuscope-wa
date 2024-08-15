import { ChangeEvent, FC, useEffect, useState } from "react";
import {
  Button,
  Form,
  ListGroup,
  Modal,
  OverlayTrigger,
  Popover,
  Stack,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { WritingTask, isWritingTask } from "../../../lib/WritingTask";
import { useLti, useLtiInfo } from "../../service/lti.service";
import {
  useWritingTask,
  useWritingTasks,
  writingTask,
} from "../../service/writing-task.service";
import { WritingTaskInfo } from "../WritingTaskInfo/WritingTaskInfo";

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
  const { t } = useTranslation();
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
      <Modal.Header closeButton>{t("select_task.title")}</Modal.Header>
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
              {t("select_task.null")}
            </ListGroup.Item>
          </ListGroup>
          <WritingTaskInfo task={selected} className="w-50 h-100" />
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        {(!inLti || ltiInfo?.instructor) && (
          <OverlayTrigger
            trigger="click"
            placement="top"
            overlay={
              <Popover>
                <Popover.Header>{t("select_task.upload")}</Popover.Header>
                <Popover.Body>
                  <Form noValidate>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        onChange={onFileChange}
                        isInvalid={!valid}
                      />
                      <Form.Control.Feedback type="invalid">
                        {t("select_task.invalid_upload")}
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
        <Button variant="secondary" onClick={onHide}>
          {t("cancel")}
        </Button>
        <Button
          variant="dark"
          onClick={() => {
            writingTask.next(selected);
            onHide();
          }}
        >
          {t("select")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectWritingTask;
