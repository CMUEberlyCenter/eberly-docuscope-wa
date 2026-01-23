import { BaseEditor } from 'slate';
import { ReactEditor } from 'slate-react';

type CustomDescendant = CustomText | CustomElement;
type CustomText = {
  text: string;
  type?: string;
  bold?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  italic?: boolean;
};
type CustomElement = { type: string; children: CustomText[] };
type ListElement = {
  type: 'bulleted-list' | 'numbered-list';
  children: CustomElement[];
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement | ListElement;
    Text: CustomText;
  }
}
