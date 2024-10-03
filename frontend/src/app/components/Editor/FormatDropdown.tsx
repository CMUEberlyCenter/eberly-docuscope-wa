import { FC, ReactNode, useEffect, useState } from "react";
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
  const [active, setActive] = useState(false);
  const selection = useSlateSelection();
  useEffect(() => {
    if (!selection) {
      setActive(eventKey === "paragraph");
    } else {
      const [match] = [
        ...Editor.nodes(editor, {
          at: Editor.unhangRange(editor, selection),
          match: (n) =>
            !Editor.isEditor(n) && Element.isElement(n) && n.type === eventKey,
        }),
      ];
      setActive(!!match);
    }
  }, [selection, eventKey]);

  return (
    <Dropdown.Item active={active} eventKey={eventKey}>
      {children}
    </Dropdown.Item>
  );
};

export const FormatDropdown: FC = () => {
  const [label, setLabel] = useState("paragraph");
  const editor = useSlate();
  const selection = useSlateSelection();
  const { t } = useTranslation();
  useEffect(() => {
    const type = activeBlockType(editor);
    switch (type) {
      case "heading-one":
        setLabel(t("editor.menu.h1"));
        break;
      case "heading-two":
        setLabel(t("editor.menu.h2"));
        break;
      case "heading-three":
        setLabel(t("editor.menu.h3"));
        break;
      case "heading-four":
        setLabel(t("editor.menu.h4"));
        break;
      case "heading-five":
        setLabel(t("editor.menu.h5"));
        break;
      case "heading-six":
        setLabel(t("editor.menu.h6"));
        break;
      case "bulleted-list":
        setLabel(t("editor.menu.list"));
        break;
      case "numbered-list":
        setLabel(t("editor.menu.numbered"));
        break;
      case "paragraph":
      default:
        setLabel(t("editor.menu.paragraph"));
    }
  }, [selection, editor, t]);
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
        {label}
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
