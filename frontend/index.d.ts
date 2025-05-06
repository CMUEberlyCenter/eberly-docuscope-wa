import type { Analysis } from "./src/lib/ReviewResponse";
import type { WritingTask } from "./src/lib/WritingTask";

// declare global {
//   namespace Vike {
//     interface PageContextServer {
//       i18n?: i18n;
//       t?: TFunction;
//       token?: IdToken
//       session?: SessionData;
//       writing_task_id?: string;
//     }
//     interface PageContext {
//       locale?: string;
//     }
//   }
// }

// export interface PageContextServer extends Vike.PageContextServer {}

declare module 'express-session' {
  interface SessionData {
    document?: string;
    segmented?: string;
    writing_task?: WritingTask;
    writing_task_id?: string;
    analysis?: Analysis[];
  }
}
// declare const __APP_VERSION__: string;
// declare const __APP_DESCRIPTION__: string;

// export { };

