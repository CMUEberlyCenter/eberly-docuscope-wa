import { describe, expect, test } from 'vitest';
import { server } from '../testing/mock_request';
import { settings$ } from './settings.service';
import { rest} from 'msw';

describe('settings.service', () => {
  test('server error', () => {
    // needs to be first to get around caching.
    server.use(
      rest.get(/settings.json$/, (_req, res, _ctx) => res.networkError('File not found'))
    )
    settings$.subscribe((settings) => {
      expect(settings.common_dictionary).toBe(
        'https://docuscope.eberly.cmu.edu/common_dictionary'
      );
    })
  })
  test('subscription', () => {
    settings$.subscribe((settings) => {
      expect(settings.common_dictionary).toBe(
        'https://docuscope.eberly.cmu.edu/common_dictionary'
      );
      expect(settings.tagger).toBe('https://docuscope.eberly.cmu.edu/tagger/tag');
    });
  });
});
