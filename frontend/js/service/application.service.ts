/** @fileoverview Access application context information from injected global variable. */

declare const window: {
  applicationContext?: {
    version?: string;
    // builtOn?: string;
  }
} & Window;

export const VERSION = window.applicationContext?.version ?? '0.0.0';
// export const BUILT_ON = window.applicationContext?.builtOn ?? 'undefined';
