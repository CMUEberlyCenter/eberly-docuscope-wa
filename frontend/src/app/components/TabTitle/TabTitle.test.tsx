/* Unit testing of the TabTitle component. */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "node:test";
import { describe, expect, test } from "vitest";
import TabTitle from "./TabTitle";

describe("TabTitle", () => {
  afterEach(() => cleanup());

  test("render", () => {
    render(<TabTitle />);
    expect(screen.getByRole("heading").textContent).toBe("");
  });

  test("render with text", () => {
    render(<TabTitle>Title</TabTitle>);
    expect(screen.getByRole("heading").textContent).toBe("Title");
  });
});
