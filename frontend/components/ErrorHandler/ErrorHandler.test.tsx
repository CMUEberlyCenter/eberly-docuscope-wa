import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { ToolErrorHandler } from "./ErrorHandler";

describe("ToolErrorHandler", () => {
  test("renders nothing when no error is present", () => {
    const { container } = render(
      <ToolErrorHandler
        tool={{
          tool: "prose",
          datetime: new Date(),
          input: { text: "Sample input" },
          result: null,
          error: undefined,
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
  test("renders error message when error prop is provided", () => {
    const errorMessage = "An unexpected error occurred.";
    render(
      <ToolErrorHandler
        tool={{
          tool: "prose",
          datetime: new Date(),
          input: { text: "Sample input" },
          result: null,
          error: new Error(errorMessage),
        }}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("error.unknown_error", { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.getByText(errorMessage, { exact: false })
    ).toBeInTheDocument();
  });
});
