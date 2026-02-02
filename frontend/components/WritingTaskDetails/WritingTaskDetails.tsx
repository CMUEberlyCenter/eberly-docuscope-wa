import { type FC, useState } from "react";
import { Form, Modal, type ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import type { Optional } from "../../src";
import type { WritingTask } from "../../src/lib/WritingTask";
import { CopyTaskToClipboardButton } from "../CopyTaskToClipboardButton/CopyTaskToClipboard";
import { CopyTaskToEditorButton } from "../CopyTaskToEditorButton/CopyTaskToEditorButton";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";

/**
 * Modal dialog component for viewing the outline of the writing task.
 */
const WritingTaskDetails: FC<
  ModalProps & { writingTask?: Optional<WritingTask> }
> = ({ show, onHide, writingTask, ...props }) => {
  const { t } = useTranslation();
  const [includeDetails, setIncludeDetails] = useState(false);

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
        <CopyTaskToClipboardButton
          variant="secondary"
          task={writingTask}
          includeDetails={includeDetails}
        />
        <CopyTaskToEditorButton
          variant="primary"
          task={writingTask}
          includeDetails={includeDetails}
          onClick={onHide}
        >
          {/* <Button variant="primary" disabled={!writingTask} onClick={insert}> */}
          {t("details.insert")}
        </CopyTaskToEditorButton>
      </Modal.Footer>
    </Modal>
  );
};
export default WritingTaskDetails;
