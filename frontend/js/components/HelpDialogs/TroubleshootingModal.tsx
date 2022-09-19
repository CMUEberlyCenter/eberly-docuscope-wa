/* @fileoverview A Modal dialog for displaying troublshooting help. */
import { Modal } from "react-bootstrap";
import * as React from "react";
import {
  showTroubleshooting,
  useShowTroubeshooting,
  useTroubleshooting,
} from "../../service/help.service";

export const TroubleshootingModal = () => {
  const content = useTroubleshooting();
  const show = useShowTroubeshooting();
  return (
    <Modal show={show} onHide={() => showTroubleshooting(false)} scrollable>
      <Modal.Header closeButton>Troubleshooting</Modal.Header>
      <Modal.Body>
        <div dangerouslySetInnerHTML={{ __html: content }}></div>
      </Modal.Body>
    </Modal>
  );
}
export default TroubleshootingModal;
