import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { first } from "rxjs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  showTroubleshooting,
  showTroubleshooting$,
} from "../../service/help.service";
import { TroubleshootingModal } from "./TroubleshootingModal";

beforeAll(() => {
  fetchMocker.mockIf(/troubleshooting.html$/, "<div>troubleshooting</div>");
});
afterAll(() => {
  fetchMocker.mockClear();
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
