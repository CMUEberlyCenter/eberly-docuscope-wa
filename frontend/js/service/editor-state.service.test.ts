import { first } from 'rxjs';
import { describe, expect, test } from 'vitest';
import {
  editorState,
  editorState$,
  editorText,
  editorText$,
  lockedEditorText$,
} from './editor-state.service';

describe('editor-state.service', () => {
  test('editorState', () => {
    editorState$
      .pipe(first())
      .subscribe((state) =>
        expect(state, 'Initial value is true.').toBeTruthy()
      );
    editorState.next(false);
    editorState$
      .pipe(first())
      .subscribe((state) => expect(state, 'False now.').toBeFalsy());
  });
  //test('serialize');
  test('editorText', () => {
    editorText$
      .pipe(first())
      .subscribe((text) => expect(text, 'Initial editor text').toBe(''));
    editorText.next([{ text: 'A line of text in a paragraph.' }]);
    editorText$
      .pipe(first())
      .subscribe((text) => expect(text).toBe('A line of text in a paragraph.'));
    editorText.next([]);
  });
  test('lockedEditorText', () => {
    lockedEditorText$
      .pipe(first())
      .subscribe((text) => expect(text, 'Initial value').toBe(''));
  });
});
