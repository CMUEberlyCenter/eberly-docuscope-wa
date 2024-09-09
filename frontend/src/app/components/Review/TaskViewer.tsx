import { FC } from "react";
import {
  Modal,
  ModalProps
} from "react-bootstrap";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";

/** Modal component for displaying the outline. */
const TaskViewer: FC<ModalProps> = (props) => {
  return (
    <Modal {...props} size="lg">
      <Modal.Header closeButton className="py-1">
        <Modal.Title><WritingTaskTitle/></Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <WritingTaskRulesTree style={{maxHeight: "70vh"}} />
      </Modal.Body>
    </Modal>
  );
};
export default TaskViewer;
