import { describe, expect, test } from 'vitest';
import { getExpectations, isWritingTask } from './WritingTask';
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

describe('getExpectations', () => {
  test('given CoverLetter then array', () => {
    const exp = getExpectations(CoverLeter);
    expect(exp.length).toBe(9);
    expect(exp.at(0)?.name).toBe('What positions are you applying for?');
    expect(exp.every((e) => e.children.length === 0));
  });
});
