import { isWritingTask, type WritingTask } from './WritingTask';

const LanguageCodeMap: Map<string, string> = new Map([
  // Needs to be updated as more languages are supported. Should ideally be provided by the server.
  ['english', 'en'],
  ['spanish', 'es'],
]);
/** Get the language code for the user based on their writing task. */
export function userLanguage(task: WritingTask | unknown): string {
  if (!isWritingTask(task) || !task.info.user_lang) {
    return '*'; // default to onTopic default (english) if the writing task or user language is not valid.
  }
  return LanguageCodeMap.get(task.info.user_lang.toLowerCase()) || '*';
}
// function targetLanguage(task: WritingTask): string {
//   return LanguageCodeMap.get(task.info.user_lang.toLowerCase()) || '*';
// }
