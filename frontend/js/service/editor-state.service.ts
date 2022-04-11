/* Observables for editor state changes */
import { bind } from '@react-rxjs/core';
import { BehaviorSubject } from 'rxjs';

// For tracking Editor editable toggle.
export const editorState = new BehaviorSubject(true);
export const [useEditorState, editorState$] = bind(editorState, true);

// For tracking the Editor text content.
// Currently updated only when Editor editable toggle changes.
export const editorText = new BehaviorSubject('');
export const [useEditorText, editorText$] = bind(editorText, '');
//editorText$.subscribe(() => console.log('editor text update'));
