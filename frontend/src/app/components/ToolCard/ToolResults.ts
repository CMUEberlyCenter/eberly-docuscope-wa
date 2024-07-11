import { Descendant } from "slate";
import { SelectedNotesProse } from "../../service/scribe.service";

export type ToolResults = {
  tool: string;
  datetime: Date;
  input: SelectedNotesProse ;
  result: string;
  document: Descendant[];
  bookmarked?: boolean;
  rating?: number;
};
