import type { Analysis } from './lib/ReviewResponse';
import type { WritingTask } from './lib/WritingTask';
import type { IdToken } from 'ltijs';

type Optional<T> = T | undefined | null;

declare module 'express-session' {
  interface SessionData {
    document?: string;
    segmented?: string;
    writing_task?: WritingTask;
    writing_task_id?: string;
    analysis?: Analysis[];
    token?: IdToken;
  }
}

type JsonValue =
  string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
