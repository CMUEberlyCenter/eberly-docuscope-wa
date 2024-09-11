import { FC } from "react";
import { Button } from "react-bootstrap";

import { useSettings } from "../../service/settings.service";
import "./Reset.scss";

type ResetProps = {
  onCloseResetDialog?: (reset: boolean) => void;
};
/**
 * Reset confirmation dialog component.
 * @param params
 * @param params.onCloseResetDialg function to call when reset is closed that takes a boolean true if reset is confirmed.
 */
const Reset: FC<ResetProps> = ({ onCloseResetDialog }: ResetProps) => {
  const onReset = (reset: boolean) =>
    onCloseResetDialog && onCloseResetDialog(reset);
  const settings = useSettings();
  return (
    <div className="reset-modal">
      <div className="reset-modal-content">
        <div className="reset-modal-container">
          <span className="reset-close-button" onClick={() => onReset(true)}>
            &times;
          </span>
          <h1>Reset {settings.brand}?</h1>
          <p>
            This will reset the application to the default state. You will
            likely loose any changes that you have made.
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
