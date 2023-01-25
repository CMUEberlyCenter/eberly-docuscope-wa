/**
 * @fileoverview Unit testing of the CateogryTree component.
 */

import { render, screen, waitFor } from "@testing-library/react";
import fetchMock from "fetch-mock";
import React from "react";
//import { TestScheduler } from "rxjs/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { currentTool } from "../../service/current-tool.service";
import { editorText, setEditorState } from "../../service/editor-state.service";
import { FAKE_COMMON_DICTIONARY } from "../../testing/fake-common-dictionary";
import Impressions from "./Impressions";

beforeAll(() => {
  fetchMock.get(/settings.json$/, {
    common_dictionary: "https://docuscope.eberly.cmu.edu/common_dictionary",
    tagger: "https://docuscope.eberly.cmu.edu/tagger/tag",
  });
  //fetchMock.get(/common_dictionary$/, FAKE_COMMON_DICTIONARY);
  //fetchMock.spy(/tag$/)
  fetchMock.spy();
  //fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
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
