/* @fileoverview A Modal dialog for displaying troublshooting help. */
import { FC } from "react";
import { Modal } from "react-bootstrap";
import {
  showTroubleshooting,
  useShowTroubeshooting,
  useTroubleshooting,
} from "../../service/help.service";

/** Modal dialog for displaying troubleshooting information. */
export const TroubleshootingModal: FC = () => {
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
};
export default TroubleshootingModal;
