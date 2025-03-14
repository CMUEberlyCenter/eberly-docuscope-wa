/**
 * @fileoverview Unit testing of the CateogryTree component.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, test } from "vitest";
import CategoryTree from "./CategoryTree";

describe("CategoryTree", () => {
  afterEach(() => cleanup());

  test("creation", async () => {
    render(<CategoryTree />);
    await waitFor(() => screen.queryByText("Dictionary Categories"));
  });
});
