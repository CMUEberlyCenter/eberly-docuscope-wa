import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe } from "vitest";
import GettingStartedModal from "./GettingStartedModal";

describe("GettingStartedModal", () => {
  test("creation", async () => {
    render(<GettingStartedModal />);
    await waitFor(() => screen.queryByText("Getting Started"));
  });
});
