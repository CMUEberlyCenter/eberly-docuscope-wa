import { vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { elementAt } from 'rxjs';
import { afterAll, describe, expect, test } from 'vitest';
import { settings$ } from './settings.service';

afterAll(() => {
  fetchMocker.mockClear();
});

describe('settings.service', () => {
  test('given # when settings$ then default', () => {
    // needs to be first to get around caching.
    fetchMocker.mockRejectOnce();
    settings$.subscribe((settings) => {
      expect(settings.common_dictionary).toBe(
        'https://docuscope.eberly.cmu.edu/common_dictionary'
      );
    });
  });
  test('when settings$ then assets/settings.json', () => {
    settings$.subscribe((settings) => {
      expect(settings.common_dictionary).toBe(
        'https://docuscope.eberly.cmu.edu/common_dictionary'
      );
      expect(settings.tagger).toBe(
        'https://docuscope.eberly.cmu.edu/tagger/tag'
      );
    });
  });
  test('given mock settings.json when settings$ then mock settings.json', () => {
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
