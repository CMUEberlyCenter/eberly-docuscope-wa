/* Unit testing of the TabTitle component. */
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, test } from "vitest";
import TabTitle from "./TabTitle";

describe('TabTitle', () => {
  test('render', () => {
    render(<TabTitle />);
    expect(screen.getByRole("heading").textContent).toBe("");
  });

  test('render with text', () => {
    render(<TabTitle>Title</TabTitle>);
    expect(screen.getByRole("heading").textContent).toBe("Title");
  });
});
