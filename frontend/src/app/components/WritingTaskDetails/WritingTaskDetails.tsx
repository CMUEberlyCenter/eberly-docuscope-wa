import { FC, useCallback, useState } from "react";
import { Button, Form, Modal, ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Transforms } from "slate";
import { useSlate } from "slate-react";
import { WritingTask } from "../../../lib/WritingTask";
import {
  taskToClipboard,
  taskToEditor,
} from "../../service/writing-task.service";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";

/**
 * Modal dialog component for viewing the outline of the writing task.
 */
const WritingTaskDetails: FC<ModalProps & { writingTask?: WritingTask }> = ({
  show,
  onHide,
  writingTask,
  ...props
}) => {
  const { t } = useTranslation();
  // const writingTask = useWritingTask();
  // const [selected, setSelected] = useState<Rule | null>(null);
  const [includeDetails, setIncludeDetails] = useState(false);
  const editor = useSlate();
  const insert = useCallback(() => {
    if (writingTask) {
      Transforms.insertNodes(editor, taskToEditor(writingTask, includeDetails));
      if (onHide) {
        onHide();
      }
    }
  }, [editor, writingTask, includeDetails, onHide]);

  return (
    <Modal show={show} onHide={onHide} size="lg" {...props}>
      <Modal.Header closeButton className="py-1">
        <Modal.Title>
          <WritingTaskTitle task={writingTask} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <WritingTaskRulesTree
          style={{ maxHeight: "70vh" }}
          task={writingTask}
        />
      </Modal.Body>
      <Modal.Footer>
        <Form.Check
          type="checkbox"
          label={t("details.include")}
          disabled={!writingTask}
          checked={includeDetails}
          onChange={() => setIncludeDetails(!includeDetails)}
        />
        <Button
          variant="secondary"
          disabled={!writingTask}
          onClick={async () =>
            await navigator.clipboard.writeText(
              taskToClipboard(writingTask ?? null, includeDetails)
            )
          }
        >
          {t("clipboard")}
        </Button>
        <Button variant="primary" disabled={!writingTask} onClick={insert}>
          {t("details.insert")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default WritingTaskDetails;
