import { vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { first, lastValueFrom, take } from 'rxjs';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { currentTool } from './current-tool.service';
import { editorText, setEditorState } from './editor-state.service';
import {
  TaggerResults,
  gen_patterns_map,
  isTaggerResult,
  tag,
  taggerResults$,
} from './tagger.service';
//import { MockEvent, EventSource } from 'mocksse';

beforeAll(() => {
  // mock settings.json
  fetchMocker.mockIf(
    /settings.json$/,
    JSON.stringify({
      common_dictionary: 'http://localhost/common_dictionary',
      tagger: 'https://docuscope.eberly.cmu.edu/tagger/tag',
    })
  );
});
beforeEach(() => {
  // following is necessary to trigger impressions service.
  currentTool.next('impressions'); // switch to impressions tab
  setEditorState(false); // lock editor
});
afterAll(() => {
  fetchMocker.mockClear();
});

const tagger_results: TaggerResults = {
  doc_id: 'a5746cdc-f5de-4e2e-ba07-6c353c1f7797',
  word_count: 7,
  html_content:
    '<html><body><p> <span class="tag" data-key="DescriptSpaceRelationsDimensionGeneral_LAT" id="tag_1"> <span class="token" id="0">A</span> <span class="token" id="1"> </span> <span class="token" id="2">line</span> </span> <span class="token" id="6"> </span> <span class="tag" data-key="OrphanedDimensionGeneral_LAT" id="tag_2"> <span class="token" id="7">of</span> </span> <span class="token" id="9"> </span> <span class="tag Actors ActorsAbstractions AbstractionsTerms" data-key="Actors &gt; Actors Abstractions &gt; Abstractions Terms" id="tag_3"> <span class="token" id="10">text</span> <sup class="Actors ActorsAbstractions AbstractionsTerms d_none cluster_id">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class="token" id="14"> </span> <span class="tag" data-key="OrphanedDimensionGeneral_LAT" id="tag_4"> <span class="token" id="15">in</span> </span> <span class="token" id="17"> </span> <span class="tag" data-key="OrphanedDimensionGeneral_LAT" id="tag_5"> <span class="token" id="18">an</span> </span> <span class="token" id="20"> </span> <span class="tag Actors ActorsAbstractions AbstractionsTerms" data-key="Actors &gt; Actors Abstractions &gt; Abstractions Terms" id="tag_6"> <span class="token" id="21">essay</span> <sup class="Actors ActorsAbstractions AbstractionsTerms d_none cluster_id">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class="tag" data-key="!NORULES" id="tag_7"> <span class="token" id="26">.</span> </span> </p></body></html>',
  patterns: [
    {
      category: 'AbstractionsTerms',
      patterns: [
        { pattern: 'essay', count: 1 },
        { pattern: 'text', count: 1 },
      ],
    },
    { category: '?', patterns: [{ pattern: '.', count: 1 }] },
  ],
  tagging_time: 0.144451,
};
/*const data = [
  //{event: 'error', data: 'error message'},
  { event: 'processing', data: '50' },
  { event: 'done', data: tagger_results },
];*/
describe('tagger.service', () => {
  test('tagText error', async () => {
    fetchMocker.mockOnceIf(/tag/, () => ({ status: 404 }));
    taggerResults$
      .pipe(first())
      .subscribe((res) => expect(res, 'Initial value').toBe(null));
    editorText.next([{ text: 'A line of text in a paragraph.' }]);
    taggerResults$
      .pipe(first((ob) => ob !== null && typeof ob !== 'number'))
      .subscribe((tagged) => {
        expect((tagged as TaggerResults)?.isError).toBeTruthy();
      });
    await lastValueFrom(taggerResults$.pipe(take(2)));
  });
  test('isTaggedResult', () => {
    expect(isTaggerResult(null)).toBeFalsy();
    expect(isTaggerResult(0)).toBeFalsy();
    expect(isTaggerResult(50)).toBeFalsy();
    expect(isTaggerResult(tagger_results)).toBeTruthy();
    expect(
      isTaggerResult({
        doc_id: '',
        word_count: 0,
        html_content: 'Tagger service is down.',
        tagging_time: 0,
        patterns: [],
        isError: true,
      })
    ).toBeFalsy();
  });
  test('gen_patterns_map', () => {
    const mod = { ...tagger_results };
    mod.patterns.push({ category: 'bogus', patterns: [] });
    expect(gen_patterns_map(mod)).toBeDefined();
  });
  test('tag with rpc error', async () => {
    fetchMocker.mockOnceIf(/tag/, 'event: error\ndata: error message\n\n');
    const obs = tag(
      'https://docuscope.eberly.cmu.edu/tagger/tag',
      'some random text'
    );
    expect(await lastValueFrom(obs.pipe(first()))).toBe(0);
    //expect(await lastValueFrom(obs.pipe(first((ob) => ob !== null && typeof obs !== 'number')))).toBeUndefined();
  });
  test('tagText', async () => {
    // needs mock that works with fetchEventSource
    /*const mocksse = new MockEvent({
        url: '/tag',
        response: [
          //{event: 'error', data: 'error message'},
            {event: 'processing', data: '50'},
            {event: 'done', data: {"doc_id": "a5746cdc-f5de-4e2e-ba07-6c353c1f7797", "word_count": 7, "html_content": "<html><body><p> <span class=\"tag\" data-key=\"DescriptSpaceRelationsDimensionGeneral_LAT\" id=\"tag_1\"> <span class=\"token\" id=\"0\">A</span> <span class=\"token\" id=\"1\"> </span> <span class=\"token\" id=\"2\">line</span> </span> <span class=\"token\" id=\"6\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_2\"> <span class=\"token\" id=\"7\">of</span> </span> <span class=\"token\" id=\"9\"> </span> <span class=\"tag Actors ActorsAbstractions AbstractionsTerms\" data-key=\"Actors &gt; Actors Abstractions &gt; Abstractions Terms\" id=\"tag_3\"> <span class=\"token\" id=\"10\">text</span> <sup class=\"Actors ActorsAbstractions AbstractionsTerms d_none cluster_id\">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class=\"token\" id=\"14\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_4\"> <span class=\"token\" id=\"15\">in</span> </span> <span class=\"token\" id=\"17\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_5\"> <span class=\"token\" id=\"18\">an</span> </span> <span class=\"token\" id=\"20\"> </span> <span class=\"tag Actors ActorsAbstractions AbstractionsTerms\" data-key=\"Actors &gt; Actors Abstractions &gt; Abstractions Terms\" id=\"tag_6\"> <span class=\"token\" id=\"21\">essay</span> <sup class=\"Actors ActorsAbstractions AbstractionsTerms d_none cluster_id\">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class=\"tag\" data-key=\"!NORULES\" id=\"tag_7\"> <span class=\"token\" id=\"26\">.</span> </span> </p></body></html>", "patterns": [{"category": "AbstractionsTerms", "patterns": [{"pattern": "essay", "count": 1}, {"pattern": "text", "count": 1}]}, {"category": "?", "patterns": [{"pattern": ".", "count": 1}]}], "tagging_time": 0.144451}},
        ]
    });*/
    //fetchMock.spy(/tag/);
    //fetchMock.post(/tag$/, `{event: "processing", data: 50}`);
    // it is unclear how to do SSE with fetchMock.
    /*fetchMock.post(/tag$/, `event: processing\ndata: 50\n\n` +
    `event: done\ndata: {"doc_id": "a5746cdc-f5de-4e2e-ba07-6c353c1f7797", "word_count": 7, "html_content": "<html><body><p> <span class=\"tag\" data-key=\"DescriptSpaceRelationsDimensionGeneral_LAT\" id=\"tag_1\"> <span class=\"token\" id=\"0\">A</span> <span class=\"token\" id=\"1\"> </span> <span class=\"token\" id=\"2\">line</span> </span> <span class=\"token\" id=\"6\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_2\"> <span class=\"token\" id=\"7\">of</span> </span> <span class=\"token\" id=\"9\"> </span> <span class=\"tag Actors ActorsAbstractions AbstractionsTerms\" data-key=\"Actors &gt; Actors Abstractions &gt; Abstractions Terms\" id=\"tag_3\"> <span class=\"token\" id=\"10\">text</span> <sup class=\"Actors ActorsAbstractions AbstractionsTerms d_none cluster_id\">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class=\"token\" id=\"14\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_4\"> <span class=\"token\" id=\"15\">in</span> </span> <span class=\"token\" id=\"17\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_5\"> <span class=\"token\" id=\"18\">an</span> </span> <span class=\"token\" id=\"20\"> </span> <span class=\"tag Actors ActorsAbstractions AbstractionsTerms\" data-key=\"Actors &gt; Actors Abstractions &gt; Abstractions Terms\" id=\"tag_6\"> <span class=\"token\" id=\"21\">essay</span> <sup class=\"Actors ActorsAbstractions AbstractionsTerms d_none cluster_id\">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class=\"tag\" data-key=\"!NORULES\" id=\"tag_7\"> <span class=\"token\" id=\"26\">.</span> </span> </p></body></html>", "patterns": [{"category": "AbstractionsTerms", "patterns": [{"pattern": "essay", "count": 1}, {"pattern": "text", "count": 1}]}, {"category": "?", "patterns": [{"pattern": ".", "count": 1}]}], "tagging_time": 0.144451}\n\n`,
   {sendAsJson: false, headers: {type: "text/event-stream; charset=utf-8"}});*/
    /*fetchMock.post(/tag$/, new Blob([`{"event": "processing", "data": 50}`,
      `{"event": "done", "data": {"doc_id": "a5746cdc-f5de-4e2e-ba07-6c353c1f7797", "word_count": 7, "html_content": "<html><body><p> <span class=\"tag\" data-key=\"DescriptSpaceRelationsDimensionGeneral_LAT\" id=\"tag_1\"> <span class=\"token\" id=\"0\">A</span> <span class=\"token\" id=\"1\"> </span> <span class=\"token\" id=\"2\">line</span> </span> <span class=\"token\" id=\"6\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_2\"> <span class=\"token\" id=\"7\">of</span> </span> <span class=\"token\" id=\"9\"> </span> <span class=\"tag Actors ActorsAbstractions AbstractionsTerms\" data-key=\"Actors &gt; Actors Abstractions &gt; Abstractions Terms\" id=\"tag_3\"> <span class=\"token\" id=\"10\">text</span> <sup class=\"Actors ActorsAbstractions AbstractionsTerms d_none cluster_id\">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class=\"token\" id=\"14\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_4\"> <span class=\"token\" id=\"15\">in</span> </span> <span class=\"token\" id=\"17\"> </span> <span class=\"tag\" data-key=\"OrphanedDimensionGeneral_LAT\" id=\"tag_5\"> <span class=\"token\" id=\"18\">an</span> </span> <span class=\"token\" id=\"20\"> </span> <span class=\"tag Actors ActorsAbstractions AbstractionsTerms\" data-key=\"Actors &gt; Actors Abstractions &gt; Abstractions Terms\" id=\"tag_6\"> <span class=\"token\" id=\"21\">essay</span> <sup class=\"Actors ActorsAbstractions AbstractionsTerms d_none cluster_id\">{Actors &gt; Actors Abstractions &gt; Abstractions Terms}</sup></span> <span class=\"tag\" data-key=\"!NORULES\" id=\"tag_7\"> <span class=\"token\" id=\"26\">.</span> </span> </p></body></html>", "patterns": [{"category": "AbstractionsTerms", "patterns": [{"pattern": "essay", "count": 1}, {"pattern": "text", "count": 1}]}, {"category": "?", "patterns": [{"pattern": ".", "count": 1}]}], "tagging_time": 0.144451}}`,
    ], {type: "text/event-stream; charset=utf-8"}), {sendAsJson: false});*/
    //fetchMock.spy(/tag/);
    //    const results = tag(
    //      'https://docuscope.eberly.cmu.edu/tagger/tag',
    //      'A line of text in an essay.'
    //    );
    //    results.subscribe(console.log);
    //    expect(await lastValueFrom(results.pipe(first()))).toBe(0);
    //    expect(
    //      await lastValueFrom(results.pipe(first(isTaggerResult)))
    //    ).toBeDefined();
    //setEditorState(false);
    //editorText.next([{ text: 'A line of text in an essay.' }]);
    //results.pipe()
    //1results.pipe(first(ob => ob !== null && typeof ob !== 'number')).subscribe((tagged) => {
    //1console.log(tagged);
    ///1expect((tagged as TaggerResults)?.isError).toBeFalsy();
    //expect(false).toBeTruthy();
    //1});
    //1await lastValueFrom(results);
    /*const tag = await fetch('/tag', {
      method: 'POST', cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'A line of text in an essay.' })
    });
    expect(tag.body).toBe('');*/
    /*console.log('tagger.service.test')
    taggerResults$.pipe(elementAt(0)).subscribe(console.log);
    taggerResults$.pipe(elementAt(1)).subscribe(console.log);
    taggerResults$.pipe(elementAt(2)).subscribe(console.log);
    taggerResults$.pipe(elementAt(3)).subscribe(console.log);*/
    //await fetchMock.flush()
  });
});
