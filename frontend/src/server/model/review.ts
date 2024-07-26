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
