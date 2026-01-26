import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Logo } from "./Logo";

describe("Logo", () => {
  test("render", () => {
    render(<Logo />);
    expect(screen.getByRole("img")).toBeTruthy();
    expect(screen.getByTestId("logo-link")).toHaveAttribute(
      "href",
      "https://www.cmu.edu/dietrich/english/research-and-publications/myprose.html"
    );
  });
});
