import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import fetchMock from "fetch-mock";
import React from "react";
import { first } from "rxjs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  showTroubleshooting,
  showTroubleshooting$,
} from "../../service/help.service";
import TroubleshootingModal from "./TroubleshootingModal";

beforeAll(() => {
  fetchMock.get(/troubleshooting.html$/, "<div>troubleshooting</div>");
  fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
});

describe("TroubleshootingModal", () => {
  test("creation", async () => {
    render(<TroubleshootingModal />);
    await waitFor(() => showTroubleshooting(true));
    await waitFor(() =>
      expect(screen.getByText("Troubleshooting")).toBeDefined()
    );
    await waitFor(() => fireEvent.click(screen.getByLabelText("Close")));
    showTroubleshooting$.pipe(first()).subscribe((v) => expect(v).toBeFalsy());
  });
});
