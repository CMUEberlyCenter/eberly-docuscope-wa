/**
 * @fileoverview Unit testing code for LockSwitch.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, test, vi } from "vitest";
import LockSwitch from "./LockSwitch";

describe('LockSwitch', () => {
  afterEach(() => { vi.resetAllMocks(); });
  test("render with label", () => {
    render(<LockSwitch label="foo" checked={false} />);
    expect(screen.getByText("foo").textContent).toBe("foo");
    expect(screen.getByRole("switch").classList.contains("btn-outline-secondary")).toBeTruthy();
    expect(screen.getByRole("img").classList.contains("fa-lock")).toBeTruthy();
  });

  test("click callback", () => {
    const mock = vi.fn();
    render(<LockSwitch label="click" checked={true} onChange={mock} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mock).toHaveBeenCalled();
  });

  test("change state", () => {
    render(<LockSwitch label="change" checked={true} />);
    expect(screen.getByRole("switch").classList.contains("btn-outline-success")).toBeTruthy();
    expect(screen.getByRole("img").classList.contains('fa-lock-open')).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("switch").classList.contains("btn-outline-secondary")).toBeTruthy();
    expect(screen.getByRole("img").classList.contains("fa-lock")).toBeTruthy();
  });
});
