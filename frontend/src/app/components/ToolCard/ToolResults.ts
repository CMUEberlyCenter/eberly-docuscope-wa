import { Descendant } from "slate";
import { SelectedNotesProse } from "../../service/scribe.service";
import { Rule } from "../../../lib/WritingTask";

export type Tool = 'prose'|'bullets'|'expectation'|'flow'|'copyedit'|'sentences';
export type ToolResults = {
  tool: Tool;
  datetime: Date;
  input: SelectedNotesProse ;
  result: string;
  document?: Descendant[]; // likely unnecessary given separate review
  bookmarked?: boolean;
  rating?: number;
  expectation?: Rule;
  // TODO add writing task?
};
