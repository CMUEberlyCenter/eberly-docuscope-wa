import { FC, useId, useState } from "react";
import { Button, Modal, ModalProps } from "react-bootstrap";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import { useTranslation } from "react-i18next";
import { useWritingTask } from "../../service/writing-task.service";

/** Button component for showing the task viewer. */
export const TaskViewerButton: FC = () => {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();
  const id = useId();
  const writingTask = useWritingTask();
  return (
    <div className="d-flex align-items-baseline gap-1 py-1">
      <span className="text-muted">{t("editor.menu.task")}</span>
      {writingTask ? (
        <Button
          variant="secondary"
          onClick={() => setShow(!show)}
          aria-controls={id}
          title={t("tool.button.view.title", {
            title: writingTask?.rules.name ?? "",
          })}
        >
          {writingTask?.rules.name ?? t("select_task.null")}
        </Button>
      ) : (
        <h6 className="mb-1">{t("editor.menu.no_task")}</h6>
      )}
      <TaskViewer id={id} show={show} onHide={() => setShow(false)} />
    </div>
  );
};

/** Modal component for displaying the outline. */
export const TaskViewer: FC<ModalProps> = (props) => {
  return (
    <Modal {...props} size="lg">
      <Modal.Header closeButton className="py-1">
        <Modal.Title>
          <WritingTaskTitle />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <WritingTaskRulesTree style={{ maxHeight: "70vh" }} />
      </Modal.Body>
    </Modal>
  );
};
export default TaskViewer;
