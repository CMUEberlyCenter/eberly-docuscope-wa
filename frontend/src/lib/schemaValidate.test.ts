import { describe, expect, test } from 'vitest';
import BadCoverLetter from '../../test/CoverLetter-bad.json';
import CoverLetter from '../../test/CoverLetter.json';
import { validateWritingTask } from './schemaValidate';

describe('validateWritingTask', () => {
  test('given null then false', () => {
    expect(validateWritingTask !== undefined).toBeTruthy();
    expect(validateWritingTask && validateWritingTask(null)).toBeFalsy();
    expect(validateWritingTask({})).toBeTruthy(); // empty always returns true
    expect(validateWritingTask([])).toBeFalsy();
    expect(validateWritingTask('')).toBeFalsy();
  });
  test('given CoverLetter then true', () => {
    expect(validateWritingTask !== undefined).toBeTruthy();
    expect(validateWritingTask(CoverLetter)).toBeTruthy();
  });
  test('given CoverLetter-bad then false', () => {
    expect(validateWritingTask !== undefined).toBeTruthy();
    expect(validateWritingTask(BadCoverLetter)).toBeFalsy();
  });
});
