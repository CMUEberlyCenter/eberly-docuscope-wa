import { DBRef } from 'mongodb';
import type { Analysis } from '../../lib/ReviewResponse';
import { type WritingTask } from '../../lib/WritingTask';

export type Review = {
  /** Assignment identifier. */
  assignment?: string;
  /** HTML document content. */
  document: string; // html string
  /** HTML document content segmented into sentences. */
  segmented: string; // html string
  /** user identifier. */
  user?: string;
  /** Writing task specification. */
  writing_task: WritingTask | null | DBRef;
  /** All of the completed analyses. */
  analysis: Analysis[];
  /** Date submitted. */
  created?: Date;
};

// const isReview = (obj: Review | unknown): obj is Review =>
//   !!obj &&
//   typeof obj === 'object' &&
//   'document' in obj &&
//   typeof obj.document === 'string' &&
//   'writing_task' in obj &&
//   isWritingTask(obj.writing_task) &&
//   'analysis' in obj &&
//   Array.isArray(obj.analysis); // TODO add obj.analysis.every(isAnalysis)
