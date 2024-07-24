import { DBRef } from "mongodb";
import { Analysis } from '../../lib/ReviewResponse';
import { WritingTask } from "../../lib/WritingTask";


export type Review = {
  writing_task: WritingTask | null | DBRef;
  assignment?: string;
  user?: string;
  document: string;
  analysis: Analysis[];
}
