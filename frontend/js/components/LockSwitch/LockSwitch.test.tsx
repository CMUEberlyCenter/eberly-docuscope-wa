/* Unit testing code for LockSwitch. */
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import LockSwitch from "./LockSwitch";

it("LockSwitch with label", () => {
  render(<LockSwitch label="foo" checked={false} />);
  expect(screen.getByText("foo").textContent).toBe("foo");
  expect(screen.getByRole('switch')).toHaveClass('btn-outline-secondary');
  expect(screen.getByRole('img')).toHaveClass('fa-lock');
});

it("LockSwitch click callback", () => {
  const mock = jest.fn();
  render(<LockSwitch label="click" checked={true} onChange={mock}/>);
  fireEvent.click(screen.getByRole('button'));
  expect(mock.call.length).toBe(1);
});

it("LockSwitch change state", () => {
  render(<LockSwitch label="change" checked={true} />);
  expect(screen.getByRole('switch')).toHaveClass('btn-outline-success')
  expect(screen.getByRole('img')).toHaveClass('fa-lock-open');
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('switch')).toHaveClass('btn-outline-secondary')
  expect(screen.getByRole('img')).toHaveClass('fa-lock');
})
