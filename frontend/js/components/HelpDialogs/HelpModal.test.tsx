import createFetchMock from "vitest-fetch-mock";
import { vi } from "vitest";
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { first } from "rxjs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { showHelp, showHelp$ } from "../../service/help.service";
import { HelpModal } from "./HelpModal";

beforeAll(() => {
  fetchMocker.mockIf(/help.html$/, "<div>help content</div>");
});
afterAll(() => {
  fetchMocker.mockClear();
});

describe("HelpModal", () => {
  test("creation", async () => {
    render(<HelpModal />);
    await waitFor(() => showHelp(true));
    await waitFor(() =>
      expect(screen.queryByText("DocuScope Write & Audit")).toBeDefined()
    );
    await waitFor(() => fireEvent.click(screen.getByLabelText("Close")));
    showHelp$.pipe(first()).subscribe((show) => expect(show).toBeFalsy());
  });
});
