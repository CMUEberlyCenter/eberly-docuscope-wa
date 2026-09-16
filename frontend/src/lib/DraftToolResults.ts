import type { Descendant, Range } from 'slate';

interface SelectedText {
  text: string;
  fragment?: Descendant[];
  range?: Range;
  html?: string;
}
interface SelectedNotesProse extends SelectedText {
  prose?: string;
}

/** Drafting tool type */
export type DraftTool = 'prose' | 'bullets';

interface ToolData<T> {
  tool: DraftTool;
  datetime: Date;
  input: SelectedNotesProse;
  result: T | undefined | null;
  bookmarked?: boolean;
  error?: Error;
}

interface ProseTool extends ToolData<string> {
  tool: 'prose';
}
interface BulletTool extends ToolData<string> {
  tool: 'bullets';
}

/** Form of drafting tool execution results. */
export type DraftToolResult = ProseTool | BulletTool;
