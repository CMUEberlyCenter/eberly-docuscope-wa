/**
 * @fileoverview Unit testing of the CateogryTree component.
 */
import { vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { currentTool } from "../../service/current-tool.service";
import { editorText, setEditorState } from "../../service/editor-state.service";
import { FAKE_COMMON_DICTIONARY } from "../../testing/fake-common-dictionary";
import Impressions from "./Impressions";

beforeAll(() => {
  fetchMocker.mockIf(/settings.json$/, (_req) =>
    JSON.stringify({
      common_dictionary: "https://docuscope.eberly.cmu.edu/common_dictionary",
      tagger: "https://docuscope.eberly.cmu.edu/tagger/tag",
    })
  );
  fetchMocker.mockIf(
    /common_dictionary$/,
    JSON.stringify(FAKE_COMMON_DICTIONARY)
  );
});
afterAll(() => {
  fetchMocker.mockClear();
});

describe("Impressions", () => {
  test("creation", async () => {
    /*const scheduler = new TestScheduler((actual, expected) => expect(actual).toBe(expected));
    scheduler.run(({cold, expectObservable}) => {
      currentTool = () => cold('a|', {a: 'impressions'});
      render(<Impressions />);

    });*/
    render(<Impressions />);
    await waitFor(() => currentTool.next("impressions"));
    await waitFor(() =>
      expect(
        screen.queryByText("Manage Readers&apos; Impressions")
      ).toBeDefined()
    );
    await waitFor(() => setEditorState(true));
    await waitFor(() =>
      expect(screen.queryByText("editing is enabled")).toBeDefined()
    );
    await waitFor(() =>
      expect(screen.queryByText("No valid data to chart")).toBeDefined()
    );
    await waitFor(() => setEditorState(false));
    await waitFor(() =>
      editorText.next([{ text: "A line of text in a paragraph." }])
    );
    await waitFor(() => expect(screen.getByRole("progressbar")).toBeDefined());
  });
});
