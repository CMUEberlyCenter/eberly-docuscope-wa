/**
 * @fileoverview Unit testing of the CateogryTree component.
 */

import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, test } from "vitest";
import CategoryTree from "./CategoryTree";

describe('CategoryTree', () => {
  test("creation", async () => {
    render(<CategoryTree />);
    await waitFor(() => screen.queryByText('Dictionary Categories'))
  });
});
