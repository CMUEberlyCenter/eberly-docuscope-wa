/**
 * @fileoverview Hooks and observables for signaling the current tool.
 */
import { bind } from '@react-rxjs/core';
import { BehaviorSubject, combineLatest, filter, map } from 'rxjs';
import { lockedEditorText$ } from './editor-state.service';

export type Tool =
  | 'expectations'
  | 'coherence'
  | 'clarity'
  | 'impressions'
  | null;

export const currentTool = new BehaviorSubject<Tool>('expectations');
export const [useCurrentTool, currentTool$] = bind(currentTool, 'expectations');

// On locking with text and tool is clarity, then emit text.
export const [useClarityText /*clarityText$*/] = bind(
  combineLatest({ text: lockedEditorText$, tool: currentTool$ }).pipe(
    filter((data) => data.tool === 'clarity'),
    map((data) => data.text)
  ),
  ''
);
