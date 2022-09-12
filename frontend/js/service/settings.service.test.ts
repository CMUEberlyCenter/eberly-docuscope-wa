import fetchMock from 'fetch-mock';
import { elementAt } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { settings$ } from './settings.service';

beforeAll(() => {
  fetchMock.catch(404);
});
afterAll(() => {
  fetchMock.restore();
});
afterEach(() => {
  fetchMock.reset();
});

describe('settings.service', () => {
  test('server error', () => {
    // needs to be first to get around caching.
    settings$.subscribe((settings) => {
      expect(settings.common_dictionary).toBe(
        'https://docuscope.eberly.cmu.edu/common_dictionary'
      );
    });
  });
  test('subscription', () => {
    settings$.subscribe((settings) => {
      expect(settings.common_dictionary).toBe(
        'https://docuscope.eberly.cmu.edu/common_dictionary'
      );
      expect(settings.tagger).toBe(
        'https://docuscope.eberly.cmu.edu/tagger/tag'
      );
    });
  });
  test('loading', () => {
    fetchMock.once(/settings.json$/, {
      common_dictionary: 'common_dictionary',
      tagger: 'tag',
    });
    settings$.pipe(elementAt(1)).subscribe((settings) => {
      expect(settings.common_dictionary).toBe('common_dictionary');
    });
  });
});
