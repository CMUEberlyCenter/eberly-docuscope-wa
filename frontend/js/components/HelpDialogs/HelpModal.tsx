/* @fileoverview A Modal dialog for displaying basic help. */
import * as React from "react";
import { Modal } from "react-bootstrap";
import { showHelp, useHelp, useShowHelp } from "../../service/help.service";

export const HelpModal = () => {
  const content = useHelp();
  const show = useShowHelp();
  return (
    <Modal show={show} onHide={() => showHelp(false)} scrollable>
      <Modal.Header closeButton>DocuScope Write &amp; Audit</Modal.Header>
      <Modal.Body>
        <div dangerouslySetInnerHTML={{ __html: content }}></div>
      </Modal.Body>
    </Modal>
  );
};
export default HelpModal;
