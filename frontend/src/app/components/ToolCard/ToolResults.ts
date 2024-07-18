import { Descendant } from 'slate';
import { Rule } from '../../../lib/WritingTask';
import {
  AssessmentData,
  CopyEditResponse,
  LocalCoherenceResponse,
  SelectedNotesProse,
} from '../../service/scribe.service';

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
  document?: Descendant[]; // likely unnecessary given separate review
  bookmarked?: boolean;
  // rating?: number;
  // expectation?: Rule;
  // TODO add writing task?
}

export interface ProseTool extends ToolData<string> {
  tool: 'prose';
}
export interface BulletTool extends ToolData<string> {
  tool: 'bullets';
}
export interface ExpectationTool extends ToolData<AssessmentData> {
  tool: 'expectation';
  expectation?: Rule;
}

export interface CopyEditTool extends ToolData<CopyEditResponse> {
  tool: 'copyedit';
}

export interface GrammarTool extends ToolData<CopyEditResponse> {
  tool: 'grammar';
}

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
