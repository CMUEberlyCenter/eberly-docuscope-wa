/*
A simple two state button for showing and changing locked state.

Shows a pa
*/
import React, { useEffect, useId, useState } from "react";
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
 * @returns
 */
const LockSwitch = (props: LockSwitchProps) => {
  const labelId = useId();
  const [toggle, setToggle] = useState(props.checked);

  // handler for clicks on the button.
  const handleClick = () => {
    if (props.onChange) {
      props.onChange(!toggle);
    }
    setToggle(!toggle);
  };

  useEffect(() => setToggle(props.checked), [props.checked]);

  return (
    <div
      className={`d-flex align-items-center`}
      onClick={handleClick}
      role="button"
    >
      <label className="text-nowrap px-2" id={labelId}>
        {props.label}
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
