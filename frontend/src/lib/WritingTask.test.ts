import { describe, expect, test } from 'vitest';
import * as CoverLetter from '../../test/CoverLetter.json';
import {
  extractKeywords,
  getExpectations,
  groupByCategory,
  hasKeywords,
  isEnabled,
  isWritingTask,
} from './WritingTask';

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
    expect(isWritingTask(CoverLetter)).toBeTruthy();
  });
});

describe('getExpectations', () => {
  test('given null then empty array', () => {
    const exp = getExpectations(null);
    expect(exp.length).toBe(0);
  });
  test('given CoverLetter then array', () => {
    const exp = getExpectations(CoverLetter);
    expect(exp.length).toBe(6);
    expect(exp.at(0)?.name).toBe('Address the reader.');
    expect(exp.every((e) => e.children.length === 0));
  });
});

describe('extractKeywords', () => {
  test('given CoverLetter then 2 keywords', () => {
    const keywords = extractKeywords([CoverLetter]);
    expect(keywords.length).toBe(2);
  });
});

describe('groupByCategory', () => {
  test('given [] then empty object', () => {
    const grouped = groupByCategory([]);
    expect(Object.keys(grouped).length).toBe(0);
  });
  test('given ["context:Professional", "mode:Persuasive"] then 2 categories', () => {
    const grouped = groupByCategory([
      'context:Professional',
      'mode:Persuasive',
    ]);
    expect(Object.keys(grouped).length).toBe(2);
    expect('context' in grouped).toBeTruthy();
    expect('mode' in grouped).toBeTruthy();
    expect(grouped['context']?.length).toBe(1);
    expect(grouped['mode']?.length).toBe(1);
  });
});

describe('hasKeywords', () => {
  test('given CoverLetter and [] then false', () => {
    expect(hasKeywords(CoverLetter, [])).toBe(false);
  });
  test('given CoverLetter without keywords then false', () => {
    expect(
      hasKeywords(
        {
          ...CoverLetter,
          ...{ info: { ...CoverLetter.info, ...{ keywords: [] } } },
        },
        ['context:Professional']
      )
    ).toBe(false);
  });
  test('given CoverLetter and context:Professional then true', () => {
    expect(hasKeywords(CoverLetter, ['context:Professional'])).toBe(true);
  });
  test('given CoverLetter and no_such_keyword then false', () => {
    expect(hasKeywords(CoverLetter, ['no_such_keyword'])).toBe(false);
  });
  test('given CoverLetter and ["context:Professional", "mode:nsk"] then false', () => {
    // test if intersection between types works as expected.
    expect(hasKeywords(CoverLetter, ['context:Professional', 'mode:nsk'])).toBe(
      false
    );
  });
  test('given CoverLetter and ["context:Professional", "mode:Persuasive"] then true', () => {
    // test if intersection between types works as expected.
    expect(
      hasKeywords(CoverLetter, ['context:Professional', 'mode:Persuasive'])
    ).toBe(true);
  });
});

describe('isEnabled', () => {
  test('given CoverLetter without tools then true if not prominent_topics', () => {
    // testing null review_tools returns true for most things to support old WTDs
    const nulled_tools = {
      ...CoverLetter,
      ...{ info: { ...CoverLetter.info, review_tools: undefined } },
    };
    expect(isEnabled(nulled_tools, 'expectations')).toBeTruthy();
    expect(isEnabled(nulled_tools, 'prominent_topics')).toBeFalsy();
  });
  test('given CoverLetter and invalid then false', () => {
    // test if no match then false.
    expect(isEnabled(CoverLetter, 'invalid')).toBeFalsy();
  });
  test('given CoverLetter and "expectations" then true', () => {
    // test if enabled then true.
    expect(isEnabled(CoverLetter, 'expectations')).toBeTruthy();
  });
  test('given CoverLetter and "prominent_topics" then false', () => {
    // test if disabled then false.
    expect(isEnabled(CoverLetter, 'prominent_topics')).toBeFalsy();
  });
});
