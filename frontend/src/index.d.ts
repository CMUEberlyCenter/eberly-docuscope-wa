import type { Analysis } from './lib/ReviewResponse';
import type { WritingTask } from './lib/WritingTask';

declare module 'express-session' {
  interface SessionData {
    document?: string;
    segmented?: string;
    writing_task?: WritingTask;
    writing_task_id?: string;
    analysis?: Analysis[];
  }
}
