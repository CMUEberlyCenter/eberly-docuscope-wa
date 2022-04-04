import { bind } from '@react-rxjs/core';
import { BehaviorSubject } from 'rxjs';

export const editorState = new BehaviorSubject(true);
export const [useEditorState, editorState$] = bind(editorState, true);

export const editorText = new BehaviorSubject('');
export const [useEditorText, editorText$] = bind(editorText, '');
editorText$.subscribe(() => console.log('editor text update'));
