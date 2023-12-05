import React from "react";
import { Button } from "react-bootstrap";

import "./Reset.scss";

type ResetProps = {
  onCloseResetDialog?: (reset: boolean) => void;
};
/**
 *
 */
const Reset = ({ onCloseResetDialog }: ResetProps) => {
  const onReset = (reset: boolean) =>
    onCloseResetDialog && onCloseResetDialog(reset);
  return (
    <div className="reset-modal">
      <div className="reset-modal-content">
        <div className="reset-modal-container">
          <span className="reset-close-button" onClick={() => onReset(true)}>
            &times;
          </span>
          <h1>Reset DocuScope Write & Audit?</h1>
          <p>
            This will reset your application to the default state. That means
            your save data will be replaced by the template expectations and
            clusters. Custom topics will be lost.
          </p>
          <div className="reset-controls">
            <div className="reset-padding" />
            <Button className="reset-button" onClick={() => onReset(true)}>
              Ok
            </Button>
            <Button className="reset-button" onClick={() => onReset(false)}>
              Cancel
            </Button>
            <div className="reset-padding" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reset;
