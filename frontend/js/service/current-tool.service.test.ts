import { first } from 'rxjs';
import { describe, expect, test } from 'vitest';
import { currentTool, currentTool$ } from './current-tool.service';

describe('current-tool.service', () => {
  // rxjs marble like syntax for inputs and outputs.
  test('given -b a=expectations b=impressions when currentTool then ^ab', () => {
    currentTool$
      .pipe(first())
      .subscribe((val) => expect(val, 'Initial value').toBe('expectations'));
    currentTool.next('impressions');
    currentTool$
      .pipe(first())
      .subscribe((val) => expect(val).toBe('impressions'));
  });
});
