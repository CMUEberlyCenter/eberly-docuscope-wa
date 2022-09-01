import { describe, test, expect } from "vitest";
import { showTroubleshooting, showGettingStarted, showGettingStarted$, showHelp, showHelp$, showTroubleshooting$ } from "./help.service";
import { first } from "rxjs";

describe('help.service', () => {
  describe('help', () => {
    test('showHelp', () => {
      showHelp$.pipe(first()).subscribe(help => expect(help, 'Initial value is false.').toBeFalsy());
      showHelp(true);
      showHelp$.pipe(first()).subscribe(help => expect(help, 'True after show call.').toBeTruthy());
    });
  });
  describe('getting_started', () => {
    test('showGettingStarted', () => {
      showGettingStarted$.pipe(first()).subscribe(started => expect(started, 'Initial value is false.').toBeFalsy());
      showGettingStarted(true);
      showGettingStarted$.pipe(first()).subscribe(started => expect(started, 'True after show call.').toBeTruthy());
    });
  });
  describe('troubleshooting', () => {
    test('showTroubleshooting', () => {
      showTroubleshooting$.pipe(first()).subscribe(trouble => expect(trouble, 'Initial value is false.').toBeFalsy());
      showTroubleshooting(true);
      showTroubleshooting$.pipe(first()).subscribe(trouble => expect(trouble, 'True after show call.').toBeTruthy());
    })
  });
})