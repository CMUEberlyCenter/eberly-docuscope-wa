import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe } from "vitest";
import HelpModal from "./HelpModal";

describe("HelpModal", () => {
  test("creation", async () => {
    render(<HelpModal />);
    await waitFor(() => screen.queryByText("DocuScope Write &amp; Audit"));
  });
});
