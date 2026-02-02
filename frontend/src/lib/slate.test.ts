import { describe, expect, test } from 'vitest';
import { serialize } from './slate';

describe('lib/slate', () => {
  test('given [] when serialize then ""', () => {
    expect(serialize([])).toBe('');
  });
  test('given TextNode("foo") when serialize then "foo"', () => {
    expect(serialize({ text: 'foo' })).toBe('foo');
  });
  test('given {children:[{text:"foo"}]} when serialize then "foo"', () => {
    expect(serialize({ type: '', children: [{ text: 'foo' }] })).toBe('foo');
  });
  test('given {type: "bulleted-list", children: [{text:"foo"}, {text:"bar"}]} when serialize then "foo bar"', () => {
    expect(
      serialize({
        type: 'bulleted-list',
        children: [{ text: 'foo' }, { text: 'bar' }],
      })
    ).toBe('foo bar');
  });
  test('given structured text when serialize then content', () => {
    expect(
      serialize([
        { type: 'heading-one', children: [{ text: 'Cover Letter' }] },
        { type: 'heading-two', children: [{ text: 'heading 2' }] },
        { type: 'heading-three', children: [{ text: 'heading 3' }] },
        { type: 'heading-four', children: [{ text: 'heading 4' }] },
        { type: 'heading-five', children: [{ text: 'heading 5' }] },
        { type: 'heading-six', children: [{ text: 'heading 6' }] },
        {
          type: 'bulleted-list',
          children: [
            { type: 'list-item', children: [{ text: 'uli0' }] },
            { type: 'list-item', children: [{ text: 'uli1' }] },
          ],
        },
        { type: 'paragraph', children: [{ text: 'sep' }] },
        {
          type: 'numbered-list',
          children: [
            { type: 'list-item', children: [{ text: 'oli0' }] },
            { type: 'list-item', children: [{ text: 'oli1' }] },
          ],
        },
        {
          type: 'paragraph',
          children: [
            {
              text: 'I am writing to apply for a summer internship in graphic design, which I learned about through Janie Kagen, a friend of Mr. James Bond. As a second-year Communication Design major at Carnegie Mellon University, I have developed a strong dedication to design through my coursework and my extracurricular activities. My experience ranges from creating a board game from start to finish, to designing all graphic elements of a theatrical production. I feel that through my steadfast work ethic and my enthusiasm, I can be a valuable asset to your company as a summer intern. ',
            },
          ],
        },
        { type: 'paragraph', children: [{ text: '' }] },
      ])
    ).toBe(`Cover Letter

heading 2

heading 3

heading 4

heading 5

heading 6

uli0 uli1

sep

oli0 oli1

I am writing to apply for a summer internship in graphic design, which I learned about through Janie Kagen, a friend of Mr. James Bond. As a second-year Communication Design major at Carnegie Mellon University, I have developed a strong dedication to design through my coursework and my extracurricular activities. My experience ranges from creating a board game from start to finish, to designing all graphic elements of a theatrical production. I feel that through my steadfast work ethic and my enthusiasm, I can be a valuable asset to your company as a summer intern. 

`);
  });
});
