import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import fetchMock from "fetch-mock";
import React from "react";
import { first } from "rxjs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  showGettingStarted,
  showGettingStarted$,
} from "../../service/help.service";
import { GettingStartedModal } from "./GettingStartedModal";

beforeAll(() => {
  fetchMock.get(/getting_started.html$/, "<div>getting started</div>");
  fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
});
describe("GettingStartedModal", () => {
  test("creation", async () => {
    render(<GettingStartedModal />);
    await waitFor(() => showGettingStarted(true));
    await waitFor(() =>
      expect(screen.queryByText("Getting Started")).toBeDefined()
    );
    await waitFor(() => fireEvent.click(screen.getByLabelText("Close")));
    showGettingStarted$.pipe(first()).subscribe((v) => expect(v).toBeFalsy());
    await waitFor(() =>
      expect(screen.queryByText("Getting Started")).toBe(null)
    );
  });
});
