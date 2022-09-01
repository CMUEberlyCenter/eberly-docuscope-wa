/**
 * @fileoverview Unit testing of the CateogryTree component.
 */

import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, test } from "vitest";
import Impressions from "./Impressions";

describe("Impressions", () => {
  test("creation", async () => {
    render(<Impressions />);
    await waitFor(() => screen.queryByText("Manage Readers&apos; Impressions"));
  });
});
