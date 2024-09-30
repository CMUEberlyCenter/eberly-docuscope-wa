import { Descendant, Range } from 'slate';
import { Rule } from '../../lib/WritingTask';

export interface SelectedText {
  text: string;
  fragment?: Descendant[];
  range?: Range;
  html?: string;
}
export interface SelectedNotesProse extends SelectedText {
  prose?: string;
}

export type Tool =
  | 'prose'
  | 'bullets'
  | 'expectation'
  | 'flow'
  | 'copyedit'
  | 'grammar';
interface ToolData<T> {
  tool: Tool;
  datetime: Date;
  input: SelectedNotesProse;
  result: T | undefined | null;
  bookmarked?: boolean;
  error?: Error;
}

export interface ProseTool extends ToolData<string> {
  tool: 'prose';
}
export interface BulletTool extends ToolData<string> {
  tool: 'bullets';
}

export type ExpectationData = {
  rating?: number;
  general_assessment: string;
  issues: {
    description: string;
    suggestions: string[];
  }[];
};

export interface ExpectationTool extends ToolData<ExpectationData> {
  tool: 'expectation';
  expectation?: Rule;
}

/** Expected form of result for 'copyedit' */
export type CopyEditResponse = {
  revision: string; // html
  clean_revision: string; // html
  explanation: string; // html
};

export interface CopyEditTool extends ToolData<CopyEditResponse> {
  tool: 'copyedit';
}

export interface GrammarTool extends ToolData<CopyEditResponse> {
  tool: 'grammar';
}

export type LocalCoherenceResponse = {
  rating?: number;
  general_assessment: string;
  issues: { description: string; suggestions: string[] }[];
};

export interface FlowTool extends ToolData<LocalCoherenceResponse> {
  tool: 'flow'; // local-coherence
}

export type ToolResult =
  | ProseTool
  | BulletTool
  | ExpectationTool
  | CopyEditTool
  | FlowTool
  | GrammarTool;
