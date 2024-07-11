import { Descendant } from "slate";
import { SelectedNotesProse } from "../../service/scribe.service";

export type Tool = 'prose'|'bullets'|'expectation'|'flow'|'copyedit'|'sentences';
export type ToolResults = {
  tool: Tool;
  datetime: Date;
  input: SelectedNotesProse ;
  result: string;
  document: Descendant[];
  bookmarked?: boolean;
  rating?: number;
};
