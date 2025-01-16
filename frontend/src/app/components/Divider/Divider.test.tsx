import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, test } from "vitest";
import Divider from "./Divider";

describe("Divider", () => {
  afterEach(() => cleanup());

  test("creation", async () => {
    render(<Divider />);
    await waitFor(() => screen.queryByLabelText("resize"));
  });
});
