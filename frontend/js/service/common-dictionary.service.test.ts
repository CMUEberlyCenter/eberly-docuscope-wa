import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { first } from 'rxjs';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { FAKE_COMMON_DICTIONARY } from '../testing/fake-common-dictionary';
import {
  CommonDictionary,
  commonDictionary$,
} from './common-dictionary.service';

beforeAll(() => {
  fetchMocker.mockIf(
    /settings.json$/,
    JSON.stringify({
      common_dictionary: 'http://localhost/common_dictionary',
      tagger: 'tag',
    })
  );
});
afterAll(() => {
  fetchMocker.mockClear();
});

describe('common-dictionary.service', () => {
  test('given #404 when commonDictionary then error', () => {
    commonDictionary$.pipe(first()).subscribe((err) => expect(err).toBe(null));
    commonDictionary$
      .pipe(first((res) => res !== null))
      .subscribe((err) => expect(err.message).toBeDefined());
  });
  test('given mock common-dictionary.json when commonDictionary then CommonDictionary', async () => {
    fetchMocker.mockOnceIf(
      /common_dictionary$/,
      JSON.stringify(FAKE_COMMON_DICTIONARY)
    );
    commonDictionary$
      .pipe(first((obs) => obs instanceof CommonDictionary))
      .subscribe((dic) => {
        expect(dic.default_dict).toBe('fake_dict');
        expect(dic.nodes[0].label).toBe('Political');
        expect(dic.tree[0].label).toBe('Political');
      });
  });
});
