import { first } from 'rxjs';
import { describe, expect } from 'vitest';
import { currentTool, currentTool$ } from './current-tool.service';

describe('current-tool.service', () => {
  test('currentTool', () => {
    currentTool$
      .pipe(first())
      .subscribe((val) => expect(val, 'Initial value').toBe('expectations'));
    currentTool.next('impressions');
    currentTool$
      .pipe(first())
      .subscribe((val) => expect(val).toBe('impressions'));
  });
});
