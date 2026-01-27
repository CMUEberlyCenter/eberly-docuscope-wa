import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ToolHeader } from "./ToolHeader";

describe("ToolHeader component tests", () => {
  test("renders title and instructions", () => {
    const title = "Test Tool";
    const instructionsKey = "test_instructions_key";

    render(<ToolHeader title={title} instructionsKey={instructionsKey} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    // Since instructions are rendered via i18n, we check for the presence of the FadeContent component
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
});
