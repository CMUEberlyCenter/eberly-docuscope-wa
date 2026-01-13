import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Rating } from "./Rating";

describe("Rating", () => {
  test("render", () => {
    render(<Rating value={0} />);
    expect(screen.getByRole("meter").textContent).toBe("0");
  });
  test("render with value", () => {
    render(<Rating value={0.5} />);
    expect(screen.getByRole("meter").textContent).toBe("2.5");
  });
});
