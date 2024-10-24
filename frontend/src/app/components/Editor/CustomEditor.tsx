import {
  faBold,
  faItalic,
  faStrikethrough,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Packer } from "docx";
import { FC, useCallback, useEffect, useState } from "react";
import {
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  DropdownButton,
  Form,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { createEditor, Descendant } from "slate";
import { withHistory } from "slate-history";
import {
  Editable,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from "slate-react";
import { serializeDocx } from "../../lib/slate";
import { FileDownload } from "../FileDownload/FileDownload";
import ToolCard from "../ToolCard/ToolCard";
import { WritingTaskButton } from "../WritingTaskButton/WritingTaskButton";
import "./CustomEditor.scss";
import { FormatDropdown } from "./FormatDropdown";
import { MarkButton } from "./MarkButton";
import { useWritingTask } from "../../service/writing-task.service";
import { useLtiInfo } from "../../service/lti.service";

/** Component for rendering editor content nodes. */
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
    case "heading-four":
      return <h4 {...attributes}>{children}</h4>;
    case "heading-five":
      return <h5 {...attributes}>{children}</h5>;
    case "heading-six":
      return <h6 {...attributes}>{children}</h6>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

/** Component for rendering editor content leaf nodes. */
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

const CustomEditor: FC = () => {
  const { t } = useTranslation();
  const [editor] = useState(() => withReact(withHistory(createEditor())));
  const [content, setContent] = useState<Descendant[]>(
    // get from session storage
    JSON.parse(sessionStorage.getItem("content") ?? "null") || [
      { type: "paragraph", children: [{ text: "" }] },
    ]
  );
  const [zoom, setZoom] = useState<number>(100);

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  );
  const renderElement = useCallback(
    (props: RenderElementProps) => <Element {...props} />,
    []
  );

  // Update document title based on translation.
  useEffect(() => {
    window.document.title = t("document.title");
  }, [t]);

  // useEffect(() => {
  //   console.log(selection);
  //   // if (!selection) return;
  //   // const [match] = [...Editor.nodes(editor, {
  //   //   at: Editor.unhangRange(editor, selection),
  //   //   match: (n) =>
  //   //     !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  //   // })];
  //   // return !!match;

  // }, [selection])

  // Stuff for exporting docx file.
  const [docx, setDocx] = useState<Blob | null>(null);
  const writingTask = useWritingTask();
  const lti = useLtiInfo();
  const saveAs = useCallback(() => {
    if (content) {
      Packer.toBlob(serializeDocx(content, writingTask, lti?.userInfo?.name)).then((blob) => setDocx(blob));
    } else {
      setDocx(null);
    }
  }, [content, lti, writingTask]);

  return (
    <Slate
      editor={editor}
      initialValue={content}
      onChange={(content: Descendant[]) => {
        // only if change is not selection change.
        if (editor.operations.some((op) => "set_selection" !== op.type)) {
          // editorText.next(content); // FIXME does not have initial // unneccesary with useSlate
          setContent(content);
          sessionStorage.setItem("content", JSON.stringify(content));
        }
      }}
    >
      <Split
        className="container-fluid h-100 w-100 d-flex flex-row align-items-stretch"
        sizes={[60, 40]}
        minSize={[400, 320]}
        expandToMin={true}
      >
        <main className="d-flex overflow-none flex-column my-1">
          <ButtonToolbar
            aria-label="Editor Tools"
            className="align-items-center mb-2"
          >
            <ButtonGroup>
              <DropdownButton
                as={ButtonGroup}
                title={t("editor.menu.file")}
                variant="light"
              >
                <Dropdown.Item eventKey="open" disabled>
                  {t("editor.menu.open")}
                </Dropdown.Item>
                <Dropdown.Item eventKey="save" onClick={() => saveAs()}>
                  {t("editor.menu.save")}
                </Dropdown.Item>
                {docx && <FileDownload content={docx} title={lti?.resource.title || writingTask?.rules.name} />}
              </DropdownButton>
              <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle variant="light">
                  {t("editor.menu.view")}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.ItemText>
                    <Form className="m-2">
                      <Form.Label>
                        {t("editor.menu.view.font_size", { zoom })}
                      </Form.Label>
                      <br />
                      <Form.Range
                        min={10}
                        max={300}
                        step={10}
                        onChange={(event) =>
                          setZoom(event.target.valueAsNumber)
                        }
                        value={zoom}
                      />
                    </Form>
                  </Dropdown.ItemText>
                </Dropdown.Menu>
              </Dropdown>
              <FormatDropdown />
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
            <WritingTaskButton className="ms-auto" />
          </ButtonToolbar>
          <Editable
            aria-label="user text"
            className="p-2 flex-grow-1 overflow-auto"
            style={{ fontSize: `${zoom}%` }}
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
