import fetchMock from 'fetch-mock';
import { first } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { FAKE_COMMON_DICTIONARY } from '../testing/fake-common-dictionary';
import {
  CommonDictionary,
  commonDictionary$,
} from './common-dictionary.service';

beforeAll(() => {
  fetchMock.get(/settings.json$/, {
    common_dictionary: 'http://localhost/common_dictionary',
    tagger: 'tag',
  });
  fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
});
afterEach(() => {
  fetchMock.resetHistory();
});

describe('common-dictionary.service', () => {
  test('commonDictionary error', () => {
    commonDictionary$.pipe(first()).subscribe((err) => expect(err).toBe(null));
    commonDictionary$
      .pipe(first((res) => res !== null))
      .subscribe((err) => expect(err.message).toBeDefined());
  });
  test('commonDictionary', async () => {
    fetchMock.get(/common_dictionary$/, FAKE_COMMON_DICTIONARY);
    commonDictionary$
      .pipe(first((obs) => obs instanceof CommonDictionary))
      .subscribe((dic) => {
        expect(dic.default_dict).toBe('fake_dict');
        expect(dic.nodes[0].label).toBe('Political');
        expect(dic.tree[0].label).toBe('Political');
      });
  });
});
