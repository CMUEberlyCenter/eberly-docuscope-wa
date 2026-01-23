import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { UneditableIcon } from "./UneditableIcon";

describe("UneditableIcon", () => {
  test("render", () => {
    render(<UneditableIcon />);
    expect(screen.getByTitle("editor.menu.no_edit")).toBeTruthy();
  });
});
