import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { ClipboardIconButton } from "./ClipboardIconButton";

describe("ClipboardIconButton", () => {
  test("render", async () => {
    render(<ClipboardIconButton />);
    expect(screen.queryAllByTitle("clipboard").length).toBe(1);
  });
});
