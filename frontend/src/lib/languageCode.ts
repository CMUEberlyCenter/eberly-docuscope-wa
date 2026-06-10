import { isWritingTask, type WritingTask } from './WritingTask';

const LanguageCodeMap: Map<string, string> = new Map([
  // Needs to be updated as more languages are supported. Should ideally be provided by the server.
  ['english', 'en'],
  ['spanish', 'es'],
]);

/** Resolve a language name to its ISO code. */
export function resolveLanguageCode(lang: string): string | undefined {
  return LanguageCodeMap.get(lang.toLowerCase());
}
/** Get the language code for the user based on their writing task. */
export function userLanguage(task: WritingTask | unknown): string {
  if (!isWritingTask(task) || !task.info.user_lang) {
    return '*'; // default to onTopic default (english) if the writing task or user language is not valid.
  }
  return resolveLanguageCode(task.info.user_lang.toLowerCase()) || '*';
}
