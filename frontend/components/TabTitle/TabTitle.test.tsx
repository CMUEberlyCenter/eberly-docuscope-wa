/* Unit testing of the TabTitle component. */
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import TabTitle from "./TabTitle";

describe("TabTitle", () => {
  test("render", () => {
    render(<TabTitle />);
    expect(screen.getByRole("heading").textContent).toBe("");
  });

  test("render with text", () => {
    render(<TabTitle>Title</TabTitle>);
    expect(screen.getByRole("heading").textContent).toBe("Title");
  });
});
