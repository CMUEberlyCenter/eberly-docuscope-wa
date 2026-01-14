import { describe, expect, test } from 'vitest';
import * as CoverLetter from '../../test/CoverLetter.json';
import {
  equivalentWritingTasks,
  extractKeywords,
  getExpectationByIndex,
  getExpectations,
  getIndexOfExpectation,
  groupByCategory,
  hasKeywords,
  isEnabled,
  isWritingTask,
  WritingTask,
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
  test('given multiple writing tasks then unique keywords', () => {
    const task1: WritingTask = {
      ...CoverLetter,
      ...{
        info: {
          ...CoverLetter.info,
          name: 'Task 1',
          keywords: ['context:Academic', 'mode:Informative'],
        },
      },
    };
    const task2: WritingTask = {
      ...CoverLetter,
      ...{
        info: {
          ...CoverLetter.info,
          name: 'Task 2',
          keywords: ['context:Professional', 'mode:Persuasive'],
        },
      },
    };
    const task3: WritingTask = {
      ...CoverLetter,
      ...{
        info: {
          ...CoverLetter.info,
          name: 'Task 3',
          keywords: ['context:Academic', 'style:Formal'],
        },
      },
    };
    const keywords = extractKeywords([task1, task2, task3]);
    expect(keywords.length).toBe(5);
    expect(keywords).toContain('context:Academic');
    expect(keywords).toContain('mode:Informative');
    expect(keywords).toContain('context:Professional');
    expect(keywords).toContain('mode:Persuasive');
    expect(keywords).toContain('style:Formal');
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
  test('given multiple keywords then grouped categories', () => {
    const keywords = [
      'context:Academic',
      'mode:Informative',
      'context:Professional',
      'mode:Persuasive',
      'style:Formal',
    ];
    const grouped = groupByCategory(keywords);
    expect(Object.keys(grouped).length).toBe(3);
    expect(grouped['context']?.length).toBe(2);
    expect(grouped['mode']?.length).toBe(2);
    expect(grouped['style']?.length).toBe(1);
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
  test('given writing task and multiple keywords then correct boolean', () => {
    const task: WritingTask = {
      ...CoverLetter,
      ...{
        info: {
          ...CoverLetter.info,
          name: 'Task',
          keywords: ['context:Academic', 'mode:Informative', 'style:Formal'],
        },
      },
    };
    expect(hasKeywords(task, [])).toBe(false);
    expect(hasKeywords(task, ['context:Academic'])).toBe(true);
    expect(hasKeywords(task, ['mode:Informative'])).toBe(true);
    expect(hasKeywords(task, ['style:Formal'])).toBe(true);
    expect(hasKeywords(task, ['context:Professional'])).toBe(false);
    expect(hasKeywords(task, ['context:Academic', 'mode:Informative'])).toBe(
      true
    );
    expect(hasKeywords(task, ['context:Academic', 'mode:Persuasive'])).toBe(
      false
    );
    expect(
      hasKeywords(task, [
        'context:Academic',
        'mode:Informative',
        'style:Formal',
      ])
    ).toBe(true);
    expect(
      hasKeywords(task, [
        'context:Academic',
        'mode:Informative',
        'style:Casual',
      ])
    ).toBe(false);
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
  test('given null and any tool then false', () => {
    expect(isEnabled(null, 'expectations')).toBeFalsy();
  });
});

describe('equivalentWritingTasks', () => {
  test('given two identical writing tasks then true', () => {
    expect(equivalentWritingTasks(CoverLetter, CoverLetter)).toBeTruthy();
  });
  test('given WritingTask and null then false', () => {
    expect(equivalentWritingTasks(CoverLetter, null)).toBeFalsy();
  });
  test('given two different writing tasks then false', () => {
    const modified: typeof CoverLetter = {
      ...CoverLetter,
      ...{
        info: { ...CoverLetter.info, ...{ name: 'Modified Task' } },
      },
    };
    expect(equivalentWritingTasks(CoverLetter, modified)).toBeFalsy();
  });
  test('given two null writing tasks then false', () => {
    expect(equivalentWritingTasks(null, null)).toBeFalsy();
  });
  test('given WritingTask and undefined then false', () => {
    expect(equivalentWritingTasks(CoverLetter, undefined)).toBeFalsy();
  });
  test('given two different but equivalent writing tasks then true', () => {
    const modified: typeof CoverLetter = {
      ...CoverLetter,
      ...{
        info: { ...CoverLetter.info, ...{ name: 'Cover Letter' } },
        extra_field: 'This field is extra and should be ignored',
      },
    };
    expect(equivalentWritingTasks(CoverLetter, modified)).toBeTruthy();
  });
});

describe('getExpectationByIndex', () => {
  test('given CoverLetter and valid index then Rule', () => {
    const rule = getExpectationByIndex(CoverLetter, 2);
    expect(rule).toBeDefined();
    expect(rule?.name).toBe('What job are you applying for?');
  });
  test('given CoverLetter and invalid index then undefined', () => {
    const rule = getExpectationByIndex(CoverLetter, 10);
    expect(rule).toBeUndefined();
  });
});

describe('getIndexOfExpectation', () => {
  test('given CoverLetter and existing Rule then valid index', () => {
    const rule = getExpectationByIndex(CoverLetter, 3);
    expect(rule).toBeDefined();
    expect(getIndexOfExpectation(CoverLetter, rule!)).toBe(3);
  });
  test('given CoverLetter and non-existing Rule then -1', () => {
    const nonExistingRule = {
      name: 'Non-existing',
      description: '',
      type: 'rule',
      is_group: false,
      children: [],
    };
    expect(getIndexOfExpectation(CoverLetter, nonExistingRule)).toBe(-1);
  });
});
