import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { AlertIcon } from "./AlertIcon";

describe("AlertIcon", () => {
  test("render with show false", () => {
    render(<AlertIcon message="Alert" show={false} />);
    expect(screen.queryAllByTitle("Alert").length).toBe(0);
  });
  test("render with show true", () => {
    render(<AlertIcon message="Alert" show={true} />);
    expect(screen.queryAllByTitle("Alert").length).toBe(1);
  });
});
