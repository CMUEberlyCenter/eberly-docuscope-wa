/**
 * @fileoverview Service for runtime retireval of help files.
 *
 * Reads the various "assets/*.html" files which can be easily replaced in
 * various environments.
 */
 import { bind } from '@react-rxjs/core';
 import { BehaviorSubject, catchError, of, shareReplay } from 'rxjs';
 import { fromFetch } from 'rxjs/fetch';
 
 const HELP_URL = new URL('../assets/help.html', import.meta.url);
 const GETTING_STARTED_URL = new URL('../assets/getting_started.html', import.meta.url);
 const TROUBLESHOOTING_URL = new URL('../assets/troubleshooting.html', import.meta.url);
 
 const show_help = new BehaviorSubject(false);
 export const showHelp = (show: boolean) => show_help.next(show);
 export const [useShowHelp, showHelp$] = bind(show_help, false);
 export const [useHelp, help$] = bind(
   fromFetch<string>(HELP_URL.toString(), {selector: response => response.text()}).pipe(
     shareReplay(1),
     catchError((err) => {
       console.warn(`Failed to load ${HELP_URL.toString()}: ${err}`);
       return of('Help content is unavailable.');
     })
   ), '<h3>Loading...</h3>'
 );

 const show_getting_started = new BehaviorSubject(false);
 export const showGettingStarted = (show: boolean) => show_getting_started.next(show);
 export const [useShowGettingStarted, showGettingStarted$] = bind(show_getting_started, false);
 export const [useGettingStarted, gettingStarted$] = bind(
    fromFetch<string>(GETTING_STARTED_URL.toString(), {selector: response => response.text()}).pipe(
      shareReplay(1),
      catchError((err) => {
        console.warn(`Failed to load ${GETTING_STARTED_URL.toString()}: ${err}`);
        return of('Getting Started content is unavailable.');
      })
    ), '<h3>Loading...</h3>'
  );

  const show_troubleshooting = new BehaviorSubject(false);
  export const showTroubleshooting = (show: boolean) => show_troubleshooting.next(show);
  export const [useShowTroubeshooting, showTroubleshooting$] = bind(show_troubleshooting, false);
  export const [useTroubleshooting, troubleshooting$] = bind(
    fromFetch<string>(TROUBLESHOOTING_URL.toString(), {selector: response => response.text()}).pipe(
      shareReplay(1),
      catchError((err) => {
        console.warn(`Failed to load ${TROUBLESHOOTING_URL.toString()}: ${err}`);
        return of('Troubleshooting content is unavailable.');
      })
    ), '<h3>Loading...</h3>'
  );
  