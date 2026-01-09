import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "node:test";
import { describe, expect, test } from "vitest";
import { Rating } from "./Rating";

describe("Rating", () => {
  afterEach(() => cleanup());
  test("render", () => {
    render(<Rating value={0} />);
    screen.debug();
    expect(screen.getByRole("meter").textContent).toBe("0");
  });
  test("render with value", () => {
    render(<Rating value={0.5} />);
    expect(screen.getByRole("meter").textContent).toBe("2.5");
  });
});
