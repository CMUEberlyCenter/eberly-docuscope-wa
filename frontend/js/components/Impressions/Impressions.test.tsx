/**
 * @fileoverview Unit testing of the CateogryTree component.
 */

import { render, screen, waitFor } from "@testing-library/react";
import fetchMock from "fetch-mock";
import React from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { currentTool } from "../../service/current-tool.service";
import { editorText, setEditorState } from "../../service/editor-state.service";
import { taggerResults$ } from "../../service/tagger.service";
import { FAKE_COMMON_DICTIONARY } from "../../testing/fake-common-dictionary";
import Impressions from "./Impressions";

beforeAll(() => {
  fetchMock.get(/settings.json$/, {
    common_dictionary: 'http://localhost/common_dictionary',
    tagger: 'tag',
  });
  fetchMock.get(/common_dictionary$/, FAKE_COMMON_DICTIONARY);
  fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
});

describe("Impressions", () => {
  test("creation", async () => {
    render(<Impressions />);
    currentTool.next('impressions');
    await waitFor(() => expect(screen.queryByText("Manage Readers&apos; Impressions")).toBeDefined());
    setEditorState(true);
    await waitFor(() => expect(screen.queryByText("editing is enabled")).toBeDefined());
    await waitFor(() => expect(screen.queryByText("No valid data to chart")).toBeDefined());
    setEditorState(false);
    editorText.next([{ text: 'A line of text in a paragraph.' }]);
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeDefined());
  });
});
