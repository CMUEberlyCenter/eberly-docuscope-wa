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
  // rxjs marble like syntax for inputs and outputs
  test('given -b a=true b=false when editorState then ^ab', () => {
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
  test('given -b a=<empty string> b=<some text> when editorText then ^ab', () => {
    editorText$
      .pipe(first())
      .subscribe((text) => expect(text, 'Initial editor text').toBe(''));
    editorText.next([{ text: 'A line of text in a paragraph.' }]);
    editorText$
      .pipe(first())
      .subscribe((text) => expect(text).toBe('A line of text in a paragraph.'));
    editorText.next([]);
  });
  test('given - a=<empty string> when lockedEditorText then ^a', () => {
    lockedEditorText$
      .pipe(first())
      .subscribe((text) => expect(text, 'Initial value').toBe(''));
  });
});
