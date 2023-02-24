import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { elementAt, first } from 'rxjs';
import { afterAll, describe, expect, test } from 'vitest';
import {
  gettingStarted$,
  help$,
  showGettingStarted,
  showGettingStarted$,
  showHelp,
  showHelp$,
  showTroubleshooting,
  showTroubleshooting$,
  troubleshooting$,
} from './help.service';

afterAll(() => {
  fetchMocker.mockClear();
});

describe('help.service', () => {
  describe('help', () => {
    test('showHelp', () => {
      showHelp$
        .pipe(first())
        .subscribe((help) =>
          expect(help, 'Initial value is false.').toBeFalsy()
        );
      showHelp(true);
      showHelp$
        .pipe(first())
        .subscribe((help) =>
          expect(help, 'True after show call.').toBeTruthy()
        );
    });
    test('error loading help', () => {
      fetchMocker.mockRejectOnce();
      help$
        .pipe(first())
        .subscribe((help) =>
          expect(help).toBe('<h3 class="text-info">Loading...</h3>')
        );
      help$
        .pipe(elementAt(1))
        .subscribe((help) =>
          expect(help).toBe(
            '<h2 class="text-danger">Help content is unavailable.</h2>'
          )
        );
    });
    test('loading help', () => {
      fetchMocker.mockOnceIf(/help.html$/, 'help content');
      help$
        .pipe(first())
        .subscribe((help) =>
          expect(help).toBe('<h3 class="text-info">Loading...</h3>')
        );
      help$
        .pipe(elementAt(1))
        .subscribe((help) => expect(help).toBe('help content'));
    });
  });
  describe('getting_started', () => {
    test('showGettingStarted', () => {
      showGettingStarted$
        .pipe(first())
        .subscribe((started) =>
          expect(started, 'Initial value is false.').toBeFalsy()
        );
      showGettingStarted(true);
      showGettingStarted$
        .pipe(first())
        .subscribe((started) =>
          expect(started, 'True after show call.').toBeTruthy()
        );
    });
    test('error loading getting started', () => {
      fetchMocker.mockRejectOnce();
      gettingStarted$
        .pipe(first())
        .subscribe((help) =>
          expect(help).toBe('<h3 class="text-info">Loading...</h3>')
        );
      gettingStarted$
        .pipe(elementAt(1))
        .subscribe((help) =>
          expect(help).toBe(
            '<h2 class="text-danger">Getting Started content is unavailable.</h2>'
          )
        );
    });
    test('loading getting started', () => {
      fetchMocker.mockOnceIf(/getting_started.html$/, 'getting started');
      gettingStarted$
        .pipe(first())
        .subscribe((help) =>
          expect(help).toBe('<h3 class="text-info">Loading...</h3>')
        );
      gettingStarted$
        .pipe(elementAt(1))
        .subscribe((help) => expect(help).toBe('getting started'));
    });
  });
  describe('troubleshooting', () => {
    test('showTroubleshooting', () => {
      showTroubleshooting$
        .pipe(first())
        .subscribe((trouble) =>
          expect(trouble, 'Initial value is false.').toBeFalsy()
        );
      showTroubleshooting(true);
      showTroubleshooting$
        .pipe(first())
        .subscribe((trouble) =>
          expect(trouble, 'True after show call.').toBeTruthy()
        );
    });
    test('error loading troubleshooting', () => {
      fetchMocker.mockRejectOnce();
      troubleshooting$
        .pipe(first())
        .subscribe((help) =>
          expect(help).toBe('<h3 class="text-info">Loading...</h3>')
        );
      troubleshooting$
        .pipe(first((help) => help != '<h3 class="text-info">Loading...</h3>'))
        .subscribe((help) =>
          expect(help).toBe(
            '<h2 class="text-danger">Troubleshooting content is unavailable.</h2>'
          )
        );
    });
    test('loading troubleshooting', () => {
      fetchMocker.mockOnceIf(/troubleshooting.html/, 'troubleshooting');
      troubleshooting$
        .pipe(first())
        .subscribe((help) =>
          expect(help).toBe('<h3 class="text-info">Loading...</h3>')
        );
      troubleshooting$
        .pipe(elementAt(1))
        .subscribe((help) => expect(help).toBe('troubleshooting'));
    });
  });
});
