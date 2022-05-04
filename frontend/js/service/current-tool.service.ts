import { bind } from '@react-rxjs/core';
import { BehaviorSubject } from 'rxjs';

export const currentTool = new BehaviorSubject<string | null>('expectations');
export const [useCurrentTool, currentTool$] = bind(currentTool, 'expectations');
