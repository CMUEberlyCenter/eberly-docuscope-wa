/**
 * @fileoverview Hooks and observables for editor state changes.
 */
import { bind } from '@react-rxjs/core';
//import { createSignal } from '@react-rxjs/utils';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
} from 'rxjs';
import { Descendant, Node } from 'slate';

// For tracking Editor editable toggle.
//export const [editorStateChange$, setEditorState] = createSignal<boolean>();
export const editorState = new BehaviorSubject(true);
export const setEditorState = (state: boolean) => editorState.next(state);
export const [useEditorState, editorState$] = bind(editorState, true);

const serialize = (nodes: Descendant[]): string => {
  return nodes.map((n: Descendant) => Node.string(n)).join('\n\n');
};

// For tracking the Editor text content.
export const editorText = new BehaviorSubject<Descendant[]>([]);
export const [useEditorText, editorText$] = bind(
  editorText.pipe(
    distinctUntilChanged((prev, next) => serialize(prev) === serialize(next)),
    map(serialize)
  ),
  ''
);

// Emit text on locking.
const lockedText = combineLatest({
  state: editorState$,
  text: editorText$,
}).pipe(
  filter((c) => !c.state), // only when not editable
  filter((c) => c.text.trim().length > 0), // not just whitespace
  map((c) => c.text)
);

// For use in components, pushes only when text is locked.
export const [useLockedEditorText, lockedEditorText$] = bind(lockedText, '');
