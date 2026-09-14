import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CopyTaskToClipboardButton } from "./CopyTaskToClipboard";

describe("CopyTaskToClipboardButton", () => {
  test("render", async () => {
    render(<CopyTaskToClipboardButton task={null} includeDetails={false} />);
    expect(screen.getByText("clipboard")).toBeInTheDocument();
  });
});
