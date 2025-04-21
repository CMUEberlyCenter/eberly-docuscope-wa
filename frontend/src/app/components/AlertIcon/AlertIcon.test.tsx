import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { AlertIcon } from "./AlertIcon";

describe("AlertIcon", () => {
  afterEach(() => cleanup());
  test("render", () => {
    render(<AlertIcon message="Alert" show={false} />);
    screen.debug();
    expect(screen.queryAllByTitle("Alert").length).toBe(0);
  });
  // FIXME apparently JDOM does not support SVG so test that render this will fail.
});
