import {
  faBold,
  faItalic,
  faStrikethrough,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, ReactNode, useCallback, useState } from "react";
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  DropdownButton,
  Form,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  Descendant,
  Editor,
  createEditor,
  Element as SlateElement,
  Transforms,
} from "slate";
import {
  Editable,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  useSlate,
  withReact,
} from "slate-react";
import { withHistory } from "slate-history";
import { editorText } from "../../service/editor-state.service";
import { useWritingTask } from "../../service/writing-task.service";
import { CustomText } from "../../slate";
import Split from "react-split";
import ToolCard from "../ToolCard/ToolCard";
import { useTranslation } from "react-i18next";

const Element: FC<RenderElementProps> = ({ attributes, children, element }) => {
  switch (element.type) {
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "heading-three":
      return <h3 {...attributes}>{children}</h3>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Leaf: FC<RenderLeafProps> = ({ children, leaf, attributes }) => (
  <span
    {...attributes}
    style={{
      fontWeight: "bold" in leaf && leaf.bold ? "bold" : "normal",
      textDecoration:
        "underline" in leaf &&
        "strikethrough" in leaf &&
        leaf.underline &&
        leaf.strikethrough
          ? "underline line-through"
          : "underline" in leaf && leaf.underline
            ? "underline"
            : "strikethrough" in leaf && leaf.strikethrough
              ? "line-through"
              : undefined,
      fontStyle: "italic" in leaf && leaf.italic ? "italic" : "initial",
    }}
  >
    {children}
  </span>
);

type Markings = "bold" | "underline" | "italic" | "strikethrough";
type LeafProps = Omit<CustomText, "text"> & {
  [index in Markings]?: boolean | undefined;
};
const isMarkActive = (editor: Editor, format: Markings) => {
  const marks: LeafProps | null = Editor.marks(editor);
  return marks && format in marks ? marks[format] === true : false;
};
const toggleMark = (editor: Editor, format: Markings) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};
const isBlockActive = (editor: Editor, format: string): boolean => {
  const [match] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });
  return !!match;
};
const LIST_TYPES = ["numbered-list", "bulleted-list"];

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type),
    split: true,
  });
  const newProperties: Partial<SlateElement> = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};
const MarkButton: FC<{
  format: Markings;
  children: ReactNode;
  tooltip: string;
}> = ({ format, children, tooltip }) => {
  const editor = useSlate();
  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
      <Button
        active={isMarkActive(editor, format)}
        onMouseDown={(e) => {
          e.preventDefault();
          toggleMark(editor, format);
        }}
        variant="light"
      >
        {children}
        <span className="visually-hidden sr-only">{tooltip}</span>
      </Button>
    </OverlayTrigger>
  );
};

const CustomEditor: FC = () => {
  const { t } = useTranslation();
  const [editor] = useState(() => withReact(withHistory(createEditor())));
  const [content, setContent] = useState<Descendant[]>(
    // get from sessno storage
    JSON.parse(sessionStorage.getItem("content") ?? "null") || [
      { type: "paragraph", children: [{ text: "" }] },
    ]
  );
  const writingTask = useWritingTask();

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  );
  const renderElement = useCallback(
    (props: RenderElementProps) => <Element {...props} />,
    []
  );

  return (
    <Slate
      editor={editor}
      initialValue={content}
      onChange={(content: Descendant[]) => {
        // only if change is not selection change.
        if (editor.operations.some((op) => "set_selection" !== op.type)) {
          editorText.next(content);
          setContent(content);
          sessionStorage.setItem("content", JSON.stringify(content));
        }
      }}
    >
      <Split
        className="container-fluid h-100 v-100 d-flex flex-row"
        sizes={[60, 40]}
        minSize={[400, 320]}
        expandToMin={true}
      >
        <main className="d-flex overflow-none h-100 flex-column">
          <ButtonToolbar aria-label="Editor Tools">
            <ButtonGroup>
              <DropdownButton
                as={ButtonGroup}
                title={t("editor.menu.file")}
                variant="light"
              >
                <Dropdown.Item eventKey="open" disabled>
                  {t("editor.menu.open")}
                </Dropdown.Item>
                <Dropdown.Item disabled
                  eventKey="save"
                  onClick={() => console.log(content)}
                >
                  {t("editor.menu.save")}
                </Dropdown.Item>
              </DropdownButton>
              <DropdownButton
                as={ButtonGroup}
                title={t("editor.menu.view")}
                variant="light"
              >
                <Dropdown.Item eventKey="open" disabled>???</Dropdown.Item>
              </DropdownButton>
              <Form.Select
                aria-label="Block format"
                size="sm"
                defaultValue={"paragraph"}
                onChange={(e) => {
                  const format = e.target.value;
                  toggleBlock(editor, format);
                }}
              >
                <option value={"paragraph"}>
                  {t("editor.menu.paragraph")}
                </option>
                <option value={"heading-one"}>{t("editor.menu.h1")}</option>
                <option value={"heading-two"}>{t("editor.menu.h2")}</option>
                <option value={"heading-three"}>{t("editor.menu.h3")}</option>
                <option value={"heading-four"}>{t("editor.menu.h4")}</option>
                <option value={"bulleted-list"}>{t("editor.menu.list")}</option>
                <option value={"numbered-list"}>
                  {t("editor.menu.numbered")}
                </option>
              </Form.Select>
              <MarkButton format="bold" tooltip={t("editor.menu.bold")}>
                <FontAwesomeIcon icon={faBold} />
              </MarkButton>
              <MarkButton format="italic" tooltip={t("editor.menu.italic")}>
                <FontAwesomeIcon icon={faItalic} />
              </MarkButton>
              <MarkButton
                format="underline"
                tooltip={t("editor.menu.underline")}
              >
                <FontAwesomeIcon icon={faUnderline} />
              </MarkButton>
              <MarkButton
                format="strikethrough"
                tooltip={t("editor.menu.strike")}
              >
                <FontAwesomeIcon icon={faStrikethrough} />
              </MarkButton>
            </ButtonGroup>
            <div className="ms-3">
              <h6 className="mb-0 text-muted">{t("editor.menu.task")}</h6>
              <h5>{writingTask?.info.name ?? t("editor.menu.no_task")}</h5>
            </div>
          </ButtonToolbar>
          <Editable
            className="p-2 flex-grow-1 overflow-auto"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            spellCheck
            autoFocus
          />
        </main>
        <ToolCard />
      </Split>
    </Slate>
  );
};

export default CustomEditor;
