import { FC, useId, useState } from "react";
import { Button, Modal, ModalProps } from "react-bootstrap";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import { useTranslation } from "react-i18next";
import { useWritingTask } from "../../service/writing-task.service";

export const TaskViewerButton: FC = () => {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();
  const id = useId();
  const writingTask = useWritingTask();
  return (
    <>
      <Button
        className="w-50 mw-50 text-truncate"
        variant="secondary"
        onClick={() => setShow(!show)}
        aria-controls={id}
        title={t("tool.button.view.title", {
          title: writingTask?.rules.name ?? "",
        })}
      >
        {t("tool.button.view.title", { title: writingTask?.rules.name ?? "" })}
      </Button>
      <TaskViewer id={id} show={show} onHide={() => setShow(false)} />
    </>
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
