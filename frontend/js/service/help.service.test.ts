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
    test('given -b a=false b=true when showHelp then ^ab', () => {
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
    test('given # a=loading... b=...unavailable when help$ then ^ab', () => {
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
    test('given a=loading... b=help.html when help$ then ^ab', () => {
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
    test('given -b a=false b=true when showGettingStarted$ then ^ab', () => {
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
    test('given # a=loading... b=...unavailable when gettingStarted$ then ^ab', () => {
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
    test('given a=loading... b=getting_started.html when gettingStarted$ then ^ab', () => {
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
    test('given a=false b=true -b when showTroubleshooting$ then ^ab', () => {
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
    test('given #404 a=loading... b=...unavailable when troubleshooting$ then ^ab', () => {
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
    test('given a=loading... b=troubleshooting.html when troubleshooting$ then ^ab', () => {
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
