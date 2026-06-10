import { type FC, type ReactNode } from "react";
import { ButtonGroup, Dropdown } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Editor, Element, Transforms } from "slate";
import { useSlate, useSlateSelection } from "slate-react";

const LIST_TYPES = ["numbered-list", "bulleted-list"];

const isBlockActive = (editor: Editor, format: string): boolean => {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = [
    ...Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) && Element.isElement(n) && n.type === format,
    }),
  ];
  return !!match;
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      Element.isElement(n) &&
      LIST_TYPES.includes(n.type),
    split: true,
  });
  const newProperties: Partial<Element> = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

type ActiveBlockType =
  | "heading-one"
  | "heading-two"
  | "heading-three"
  | "heading-four"
  | "heading-five"
  | "heading-six"
  | "bulleted-list"
  | "numbered-list"
  | "paragraph";
const activeBlockType = (editor: Editor): ActiveBlockType => {
  const active = (
    [
      "heading-one",
      "heading-two",
      "heading-three",
      "heading-four",
      "heading-five",
      "heading-six",
      "bulleted-list",
      "numbered-list",
      "paragraph",
    ] as ActiveBlockType[]
  ).find((format) => isBlockActive(editor, format));
  return active ?? "paragraph";
};

const BlockItem: FC<{
  eventKey: string;
  children: ReactNode;
}> = ({ eventKey, children }) => {
  const editor = useSlate();
  const selection = useSlateSelection();
  const isActive = () => {
    if (!selection) {
      return eventKey === "paragraph";
    } else {
      const [match] = [
        ...Editor.nodes(editor, {
          at: Editor.unhangRange(editor, selection),
          match: (n) =>
            !Editor.isEditor(n) && Element.isElement(n) && n.type === eventKey,
        }),
      ];
      return !!match;
    }
  };

  return (
    <Dropdown.Item active={isActive()} eventKey={eventKey}>
      {children}
    </Dropdown.Item>
  );
};

/**
 * Format Dropdown Component.
 * Changes the block type of the current selection in the editor. The label of the dropdown reflects the block type of the current selection, defaulting to "Paragraph" if multiple block types are present or if the selection is empty.
 * @example
 *   (&lt;FormatDropdown /&gt;)
 * @see https://docs.slatejs.org/concepts/11-typescript#typescript-and-slate-react for more information on using Slate with TypeScript.
 */
export const FormatDropdown: FC = () => {
  const editor = useSlate();
  const { t } = useTranslation();
  const label = (() => {
    switch (activeBlockType(editor)) {
      case "heading-one":
        return "editor.menu.h1";
      case "heading-two":
        return "editor.menu.h2";
      case "heading-three":
        return "editor.menu.h3";
      case "heading-four":
        return "editor.menu.h4";
      case "heading-five":
        return "editor.menu.h5";
      case "heading-six":
        return "editor.menu.h6";
      case "bulleted-list":
        return "editor.menu.list";
      case "numbered-list":
        return "editor.menu.numbered";
      case "paragraph":
      default:
        return "editor.menu.paragraph";
    }
  })();
  return (
    <Dropdown
      as={ButtonGroup}
      onSelect={(eventKey: string | null, _event) => {
        toggleBlock(editor, eventKey ?? "paragraph");
      }}
    >
      <Dropdown.Toggle
        variant="light"
        className="text-end"
        // style={{ width: "10em" }}
      >
        {t(label)}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <BlockItem eventKey={"paragraph"}>
          {t("editor.menu.paragraph")}
        </BlockItem>
        <BlockItem eventKey={"heading-one"}>{t("editor.menu.h1")}</BlockItem>
        <BlockItem eventKey={"heading-two"}>{t("editor.menu.h2")}</BlockItem>
        <BlockItem eventKey={"heading-three"}>{t("editor.menu.h3")}</BlockItem>
        <BlockItem eventKey={"heading-four"}>{t("editor.menu.h4")}</BlockItem>
        <BlockItem eventKey={"heading-five"}>{t("editor.menu.h5")}</BlockItem>
        <BlockItem eventKey={"heading-six"}>{t("editor.menu.h6")}</BlockItem>
        <BlockItem eventKey={"bulleted-list"}>
          {t("editor.menu.list")}
        </BlockItem>
        <BlockItem eventKey={"numbered-list"}>
          {t("editor.menu.numbered")}
        </BlockItem>
      </Dropdown.Menu>
    </Dropdown>
  );
};
