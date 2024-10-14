import { describe, expect, test } from 'vitest';
import { isWritingTask } from './WritingTask';
import * as CoverLeter from '../../test/CoverLetter.json';

describe('isWritingTask', () => {
  test('given null then false', () => {
    expect(isWritingTask(null)).toBeFalsy();
  });
  test('given non-object then false', () => {
    expect(isWritingTask(undefined)).toBeFalsy();
    expect(isWritingTask('foo')).toBeFalsy();
    expect(isWritingTask([])).toBeFalsy();
    expect(isWritingTask(true)).toBeFalsy();
  });
  test('given {} then false', () => {
    expect(isWritingTask({})).toBeFalsy();
  });
  test('given CoverLetter then true', () => {
    expect(isWritingTask(CoverLeter)).toBeTruthy();
  });
});
