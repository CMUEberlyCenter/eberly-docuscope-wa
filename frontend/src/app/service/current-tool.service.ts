/**
 * @fileoverview Hooks and observables for signaling the current tool.
 */
import { bind } from '@react-rxjs/core';
import { BehaviorSubject } from 'rxjs';

// Enumeration of DocuScope tools plus null.
export type Tool =
  | 'expectations'
  | 'coherence'
  | 'clarity'
  | 'impressions'
  | null;

// Currently active DocuScope tool.
export const currentTool = new BehaviorSubject<Tool>('expectations');
export const [useCurrentTool, currentTool$] = bind(currentTool, 'expectations');
