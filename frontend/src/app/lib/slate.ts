import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  HeadingLevel,
  LevelFormat,
  Paragraph,
  SectionType,
  TextRun,
} from 'docx';
import escapeHtml from 'escape-html';
import { Descendant, Node, Text } from 'slate';
import { WritingTask } from '../../lib/WritingTask';
import { CustomElement, CustomText, ListElement } from '../slate';

/**
 * Convert editor's Descendants to a string with double newline between
 * paragraphs.
 */
export const serialize = (nodes: Descendant[]): string => {
  return nodes.map((n: Descendant) => Node.string(n)).join('\n\n');
};

/**
 * Serialize editor content nodes to an html string.
 * @param node Editor content
 * @returns HTMLized string
 */
export const serializeHtml = (node: Descendant | Descendant[]): string => {
  if (Array.isArray(node)) {
    return node.map(serializeHtml).join('\n');
  }
  if (Text.isText(node)) {
    let string = escapeHtml(node.text);
    if (node.bold) {
      string = `<strong>${string}</strong>`;
    }
    if (node.underline) {
      string = `<span style="text-decoration: underline;">${string}</span>`;
    }
    if (node.strikethrough) {
      string = `<span style="text-decoration: line-through;">${string}</span>`;
    }
    if (node.italic) {
      string = `<span style="font-style: italic">${string}</span>`;
    }
    return string;
  }
  const children = node.children.map(serializeHtml).join('');
  switch (node.type) {
    case 'block-quote':
      return `<blockquote>${children}</blockquote>`;
    case 'bulleted-list':
      return `<ul>${children}</ul>`;
    case 'heading-one':
      return `<h1>${children}</h1>`;
    case 'heading-two':
      return `<h2>${children}</h2>`;
    case 'heading-three':
      return `<h3>${children}</h3>`;
    case 'heading-four':
      return `<h4>${children}</h4>`;
    case 'list-item':
      return `<li>${children}</li>`;
    case 'numbered-list':
      return `<ol>${children}</ol>`;
    default:
      return `<p>${children}</p>`;
  }
};

////////// Docx serialization ///////////
const serializeTextRun = (customText: CustomText): TextRun =>
  new TextRun({
    text: customText.text,
    bold: !!customText.bold,
    italics: !!customText.italic,
    underline: customText.underline ? {} : undefined,
    strike: !!customText.strikethrough,
  });

const CONTINUOUS = {
  properties: { type: SectionType.CONTINUOUS },
};
const serializeParagraph = (customElement: CustomElement) =>
  new Paragraph({
    children: customElement.children.map((child) => serializeTextRun(child)),
  });

const HEADING = new Map([
  ['heading-one', HeadingLevel.HEADING_1],
  ['heading-two', HeadingLevel.HEADING_2],
  ['heading-three', HeadingLevel.HEADING_3],
  ['heading-four', HeadingLevel.HEADING_4],
  ['heading-five', HeadingLevel.HEADING_5],
  ['heading-six', HeadingLevel.HEADING_6],
]);
const serializeHeading = (customElement: CustomElement) =>
  new Paragraph({
    ...{ CONTINUOUS },
    children: customElement.children.map(serializeTextRun),
    heading: HEADING.get(customElement.type),
  });

const isCustomElement = (ele: CustomElement | unknown): ele is CustomElement =>
  !!ele &&
  typeof ele === 'object' &&
  'type' in ele &&
  typeof ele.type === 'string';
const isListElement = (li: ListElement | unknown): li is ListElement =>
  isCustomElement(li) && ['bulleted-list', 'numbered-list'].includes(li.type);
const isHeadingElement = (
  node: CustomElement | unknown
): node is CustomElement => isCustomElement(node) && HEADING.has(node.type);

// This only handles single depth but that is what is available in the editor
const serializeBulletList = (customElement: ListElement, level: number = 0) =>
  customElement.children.map(
    (li) =>
      new Paragraph({
        children: li.children.map(serializeTextRun),
        bullet: { level },
      })
  );

// This only handles single depth but that is what is available in the editor
const serializeNumberList = (
  customElement: ListElement,
  instance: number = 0,
  level: number = 0
) =>
  customElement.children.map(
    (li) =>
      new Paragraph({
        children: li.children.map(serializeTextRun),
        numbering: { level, reference: 'numbering', instance },
      })
  );

/**
 * Serialize editor content nodes to a Docx document.
 * @param content Editor content
 * @param writing_task The current writing task used for setting some fields.
 * @returns a document ready to be packed.
 */
export const serializeDocx = (
  content: Descendant[],
  writing_task?: WritingTask | null,
  creator?: string,
) => {
  return new Document({
    creator,
    description: writing_task?.rules.overview,
    title: writing_task?.rules.name,
    lastModifiedBy: 'myProse',
    numbering: {
      config: [
        {
          reference: 'numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            }, //TODO add more levels
          ],
        },
      ],
    },
    sections: [
      {
        ...CONTINUOUS,
        children: content.flatMap((node, i) => {
          if (Text.isText(node)) {
            return new Paragraph({
              children: [serializeTextRun(node)],
            });
          } else if (isListElement(node)) {
            switch (node.type) {
              case 'bulleted-list':
                return serializeBulletList(node);
              case 'numbered-list':
                return serializeNumberList(node, i);
            }
          } else if (isHeadingElement(node)) {
            return serializeHeading(node);
          }
          // 'block-quote' and paragraphs
          return serializeParagraph(node);
        }),
      },
    ],
  });
};
