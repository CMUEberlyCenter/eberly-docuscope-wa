import { bind } from '@react-rxjs/core';
import { BehaviorSubject } from 'rxjs';

export const editorState = new BehaviorSubject(true);

export const [useEditorState, editorState$] = bind(editorState, true);
