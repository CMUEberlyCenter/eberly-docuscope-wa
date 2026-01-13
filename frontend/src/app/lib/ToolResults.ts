import { type Descendant, Range } from 'slate';

export interface SelectedText {
  text: string;
  fragment?: Descendant[];
  range?: Range;
  html?: string;
}
interface SelectedNotesProse extends SelectedText {
  prose?: string;
}

export type Tool = 'prose' | 'bullets';
// | 'expectation'
// | 'flow'
// | 'copyedit'
// | 'grammar';
interface ToolData<T> {
  tool: Tool;
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

// type ExpectationData = {
//   rating?: number;
//   general_assessment: string;
//   issues: {
//     description: string;
//     suggestions: string[];
//   }[];
// };

// interface ExpectationTool extends ToolData<ExpectationData> {
//   tool: 'expectation';
//   expectation?: Rule;
// }

/** Expected form of result for 'copyedit' */
// export type CopyEditResponse = {
//   revision: string; // html
//   clean_revision: string; // html
//   explanation: string; // html
// };

// interface CopyEditTool extends ToolData<CopyEditResponse> {
//   tool: 'copyedit';
// }

// interface GrammarTool extends ToolData<CopyEditResponse> {
//   tool: 'grammar';
// }

// export type LocalCoherenceResponse = {
//   rating?: number;
//   general_assessment: string;
//   issues: { description: string; suggestions: string[] }[];
// };

// interface FlowTool extends ToolData<LocalCoherenceResponse> {
//   tool: 'flow'; // local-coherence
// }

export type ToolResult = ProseTool | BulletTool;
// | ExpectationTool
// | CopyEditTool
// | FlowTool
// | GrammarTool;
