/* Observables for editor state changes */
import { bind } from '@react-rxjs/core';
import { BehaviorSubject, combineLatest, filter, map } from 'rxjs';
import { Descendant, Node } from 'slate';

// For tracking Editor editable toggle.
export const editorState = new BehaviorSubject(true);
export const [useEditorState, editorState$] = bind(editorState, true);

const serialize = (nodes: Descendant[]): string => {
  return nodes.map((n: Descendant) => Node.string(n)).join('\n\n');
};

// For tracking the Editor text content.
// Currently updated only when Editor editable toggle changes.
export const editorText = new BehaviorSubject<Descendant[]>([]);
export const [useEditorText, editorText$] = bind(
  editorText.pipe(map(serialize)),
  ''
);
//editorText$.subscribe(() => console.log('editor text update'));

// Emit text on locking.
const lockedText = combineLatest({
  state: editorState$,
  text: editorText$,
}).pipe(
  filter((c) => !c.state),
  filter((c) => c.text.trim().length > 0),
  map((c) => c.text)
);

export const [useLockedEditorText, lockedEditorText$] = bind(lockedText, '');
