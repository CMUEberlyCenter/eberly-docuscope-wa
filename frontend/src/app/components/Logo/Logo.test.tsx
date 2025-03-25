import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "node:test";
import { describe, expect, test } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  afterEach(() => cleanup());
  test("render", () => {
    render(<Logo />);
    screen.debug();
    expect(screen.getByRole("img")).toBeTruthy();
  });
});
