import { FC, ReactNode } from "react";
import { Modal } from "react-bootstrap";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="modal show d-block" style={{ position: "initial" }}>
    <Modal.Dialog size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Link Resource from Exteral Tool</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div
          style={{ height: "568.182px", width: "756.363px" }}
          className="overflow-hidden"
        >
          {children}
        </div>
      </Modal.Body>
    </Modal.Dialog>
  </div>
);
