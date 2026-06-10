declare module 'mammoth/mammoth.browser' {
  import type { Result, Options, BrowserInput } from 'mammoth';
  export function convertToHtml(
    input: BrowserInput,
    options?: Options
  ): Promise<Result>;
  export function extractRawText(input: BrowserInput): Promise<Result>;
}
