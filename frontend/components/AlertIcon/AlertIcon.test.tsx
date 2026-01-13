import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { AlertIcon } from "./AlertIcon";

describe("AlertIcon", () => {
  test("render", () => {
    render(<AlertIcon message="Alert" show={false} />);
    expect(screen.queryAllByTitle("Alert").length).toBe(0);
  });
});
