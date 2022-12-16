import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import fetchMock from "fetch-mock";
import React from "react";
import { first } from "rxjs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { showHelp, showHelp$ } from "../../service/help.service";
import { HelpModal } from "./HelpModal";

beforeAll(() => {
  fetchMock.get(/help.html$/, "<div>help content</div>");
  fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
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
