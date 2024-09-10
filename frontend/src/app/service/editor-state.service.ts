/**
 * @fileoverview Hooks and observables for editor state changes.
 */
import { bind } from '@react-rxjs/core';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
} from 'rxjs';
import { Descendant, Node, Text } from 'slate';
import escapeHtml from 'escape-html';

// For tracking Editor editable toggle.
export const editorState = new BehaviorSubject(true);
export const setEditorState = (state: boolean) => editorState.next(state);
export const [useEditorState, editorState$] = bind(editorState, true);

/**
 * Convert editor's Descendants to a string with double newline between
 * paragraphs.
 */
export const serialize = (nodes: Descendant[]): string => {
  return nodes.map((n: Descendant) => Node.string(n)).join('\n\n');
};

/**
 * Serialize editor content nodes to an html string.
 * @param node Editor content
 * @returns HTMLized string
 */
export const serializeHtml = (node: Descendant | Descendant[]): string => {
  if (Array.isArray(node)) {
    return node.map(serializeHtml).join('\n');
  }
  if (Text.isText(node)) {
    let string = escapeHtml(node.text);
    if ('bold' in node && node.bold) {
      string = `<strong>${string}</strong>`;
    }
    if ('underline' in node && node.underline) {
      string = `<span style="text-decoration: underline;">${string}</span>`;
    }
    if ('strikethrough' in node && node.strikethrough) {
      string = `<span style="text-decoration: line-through;">${string}</span>`;
    }
    if ('italic' in node && node.italic) {
      string = `<span style="font-style: italic">${string}</span>`;
    }
    return string;
  }
  const children = node.children.map(serializeHtml).join('');
  switch (node.type) {
    case 'block-quote':
      return `<blockquote>${children}</blockquote>`;
    case 'bulleted-list':
      return `<ul>${children}</ul>`;
    case 'heading-one':
      return `<h1>${children}</h1>`;
    case 'heading-two':
      return `<h2>${children}</h2>`;
    case 'heading-three':
      return `<h3>${children}</h3>`;
    case 'heading-four':
      return `<h4>${children}</h4>`;
    case 'list-item':
      return `<li>${children}</li>`;
    case 'numbered-list':
      return `<ol>${children}</ol>`;
    default:
      return `<p>${children}</p>`;
  }
};

// For tracking the Editor text content.
export const editorText = new BehaviorSubject<Descendant[]>([]);
export const [useEditorContent, editorContent$] = bind(editorText, []);
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
