import { DBRef } from 'mongodb';
import { Analysis } from '../../lib/ReviewResponse';
import { WritingTask } from '../../lib/WritingTask';

export type Review = {
  assignment?: string;
  document: string; // html
  text: string; // plain text
  user?: string;
  writing_task: WritingTask | null | DBRef;
  analysis: Analysis[];
};

export const isReview = (obj: Review | unknown): obj is Review =>
  !!obj &&
  typeof obj === 'object' &&
  'document' in obj &&
  'text' in obj &&
  'writing_task' in obj &&
  'analysis' in obj;
