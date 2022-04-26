/* Unit testing code for LockSwitch. */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import LockSwitch from "./LockSwitch";

it("LockSwitch", () => {
  render(<LockSwitch label="foo" checked={false} onChange={() => undefined} />);
  expect(screen.getByText("foo").textContent).toBe("foo");
});
