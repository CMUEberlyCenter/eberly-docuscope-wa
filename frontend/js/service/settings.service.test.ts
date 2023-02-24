import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { elementAt } from 'rxjs';
import { afterAll, describe, expect, test } from 'vitest';
import { settings$ } from './settings.service';

afterAll(() => {
  fetchMocker.mockClear();
});

describe('settings.service', () => {
  test('server error', () => {
    // needs to be first to get around caching.
    fetchMocker.mockRejectOnce();
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
    fetchMocker.mockOnceIf(
      /settings.json$/,
      JSON.stringify({
        common_dictionary: 'common_dictionary',
        tagger: 'tag',
      })
    );
    settings$.pipe(elementAt(1)).subscribe((settings) => {
      expect(settings.common_dictionary).toBe('common_dictionary');
    });
  });
});
