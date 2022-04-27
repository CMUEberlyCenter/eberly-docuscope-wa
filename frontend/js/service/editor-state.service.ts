/* Observables for editor state changes */
import { bind } from '@react-rxjs/core';
import { BehaviorSubject, map } from 'rxjs';
import { Descendant, Node } from 'slate';

// For tracking Editor editable toggle.
export const editorState = new BehaviorSubject(true);
export const [useEditorState, editorState$] = bind(editorState, true);

const serialize = (nodes: Descendant[]): string => {
  console.log(nodes);
  return nodes.map((n: Descendant) => Node.string(n)).join("\n\n");
};

// For tracking the Editor text content.
// Currently updated only when Editor editable toggle changes.
export const editorText = new BehaviorSubject<Descendant[]>([]);
export const [useEditorText, editorText$] = bind(editorText.pipe(map(serialize)), '');
//editorText$.subscribe(() => console.log('editor text update'));
