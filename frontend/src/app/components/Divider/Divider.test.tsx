import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, test } from "vitest";
import Divider from "./Divider";

describe("Divider", () => {
  test("creation", async () => {
    render(<Divider />);
    await waitFor(() => screen.queryByLabelText("resize"));
  });
});
