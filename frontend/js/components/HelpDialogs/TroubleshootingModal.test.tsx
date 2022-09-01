import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe } from "vitest";
import TroubleshootingModal from "./TroubleshootingModal";

describe("TroubleshootingModal", () => {
  test("creation", async () => {
    render(<TroubleshootingModal />);
    await waitFor(() => screen.queryByText("Troubleshooting"));
  });
});
