/*
A simple two state button for showing and changing locked state.

Shows a closed padlock if locked and an open padlog if unlocked.
*/
import { FC, useEffect, useId, useState } from "react";
import "./LockSwitch.scss";

interface LockSwitchProps {
  label: string; // Label text content, prepended to button
  checked: boolean; // true if unlocked.
  onChange?: (checked: boolean) => void; // function to handle new state
}

/**
 * A two state button for displaying and controlling
 * locked status.
 * Shows closed lock if false, open lock on true.
 * @param props
 * @param props.label Label text content, prepended to button.
 * @param props.checked locked if true.
 * @param props.onChange Function to handle new lock state.
 * @returns
 */
const LockSwitch: FC<LockSwitchProps> = ({
  label,
  checked,
  onChange,
}: LockSwitchProps) => {
  const labelId = useId();
  const [toggle, setToggle] = useState(checked);

  // handler for clicks on the button.
  const handleClick = () => {
    if (onChange) {
      onChange(!toggle);
    }
    setToggle(!toggle);
  };

  useEffect(() => setToggle(checked), [checked]);

  return (
    <div
      className={`d-flex align-items-center`}
      onClick={handleClick}
      role="button"
    >
      <label className="text-nowrap px-2" id={labelId}>
        {label}
      </label>
      <button
        className={`btn btn-outline-${
          toggle ? "success" : "secondary"
        } lock-button rounded-pill me-2`}
        role="switch"
        aria-checked={toggle}
        aria-labelledby={labelId}
      >
        <i
          className={`fa-solid fa-lock${toggle ? "-open" : ""}`}
          role="img"
          aria-label={toggle ? "unlocked" : "locked"}
        ></i>
      </button>
    </div>
  );
};

export default LockSwitch;
