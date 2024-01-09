/* @fileoverview A Modal dialog for displaying getting started help. */
import * as React from "react";
import { Modal } from "react-bootstrap";
import {
  showGettingStarted,
  useGettingStarted,
  useShowGettingStarted,
} from "../../service/help.service";

export const GettingStartedModal = () => {
  const content = useGettingStarted();
  const show = useShowGettingStarted();
  return (
    <Modal show={show} onHide={() => showGettingStarted(false)} scrollable>
      <Modal.Header closeButton>Getting Started</Modal.Header>
      <Modal.Body>
        <div dangerouslySetInnerHTML={{ __html: content }}></div>
      </Modal.Body>
    </Modal>
  );
};
export default GettingStartedModal;