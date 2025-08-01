import { DBRef } from 'mongodb';
import type { WritingTask } from '../../lib/WritingTask';

export type Assignment = {
  writing_task: WritingTask | DBRef; // which writing task file to use.
  assignment: string; // assignment id from LMS
  // docuscope options
  docuscope?: boolean; // global: if false, none of the rest matter.
  coherence?: boolean; // Coherence Tool
  clarity?: boolean; // Clarity Tool
  impressions?: boolean; // Impressions Tool
  // scribe options
  scribe?: boolean; // global: if false, none of the rest matter.
  notes_to_prose?: boolean;
  grammar?: boolean;
  copyedit?: boolean;
  expectation?: boolean;
  text2speech?: boolean;
  logical_flow?: boolean;
  topics?: boolean;
};
