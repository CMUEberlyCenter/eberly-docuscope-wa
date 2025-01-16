import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";
// import { About } from "./About"; // react 19 use pattern causes error in tests as location.href is not set.

beforeAll(() => {
  vi.stubGlobal("__APP_VERSION__", "TEST");
  vi.stubGlobal("__BUILD_DATE__", new Date().toISOString());
});
afterAll(() => {
  vi.unstubAllGlobals();
});
afterEach(() => cleanup());

describe("About", () => {
  test.skip("creation", async () => {
    // await act(() => render(<About />));
    // await waitFor(() => screen.queryByText("Carnegie Mellon University"));
  });
});
