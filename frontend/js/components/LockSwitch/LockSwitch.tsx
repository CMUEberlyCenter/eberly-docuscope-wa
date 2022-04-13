import React, { useId, useState } from "react";
import "./LockSwitch.scss";

interface LockSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

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
      {/*<input type="checkbox" aria-labelledby={labelId} className="d-none" aria-roledescription="switch" />*/}
      <button
        className={`btn btn-outline-${
          toggle ? "success" : "secondary"
        } lock-button rounded-pill me-2`}
        role="switch"
        aria-checked={toggle}
      >
        <i className={`fa-solid fa-lock${toggle ? "-open" : ""}`}></i>
      </button>
    </div>
  );
};

export default LockSwitch;
