/*
A simple two state button for showing (un)locked state.
*/
import React, { useId, useState } from "react";
import "./LockSwitch.scss";

interface LockSwitchProps {
  label: string; // Label text content, prepended to button
  checked: boolean; // true if locked
  onChange?: (checked: boolean) => void; // function to handle new state
}

/**
 * A two state button for displaying and controlling
 * locked status.
 * @param props
 * @returns
 */
const LockSwitch = (props: LockSwitchProps) => {
  const labelId = useId();
  const [toggle, setToggle] = useState(props.checked);

  const handleClick = () => {
    if (props.onChange) {
      props.onChange(!toggle);
    }
    setToggle(!toggle);
  };

  return (
    <div className={`d-flex align-items-center`} onClick={handleClick}>
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
        <i className={`fa-solid fa-lock${toggle ? "-open" : ""}`}></i>
      </button>
    </div>
  );
};

export default LockSwitch;
