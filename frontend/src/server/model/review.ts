import { DBRef } from 'mongodb';
import { Analysis } from '../../lib/ReviewResponse';
import { isWritingTask, WritingTask } from '../../lib/WritingTask';

export type Review = {
  assignment?: string;
  document: string; // html
  text: string; // plain text
  user?: string;
  writing_task: WritingTask | null | DBRef;
  analysis: Analysis[];
  created?: Date;
  accessed?: Date;
};

export const isReview = (obj: Review | unknown): obj is Review =>
  !!obj &&
  typeof obj === 'object' &&
  'document' in obj &&
  typeof obj.document === 'string' &&
  'text' in obj &&
  typeof obj.text === 'string' &&
  'writing_task' in obj &&
  isWritingTask(obj.writing_task) &&
  'analysis' in obj;
