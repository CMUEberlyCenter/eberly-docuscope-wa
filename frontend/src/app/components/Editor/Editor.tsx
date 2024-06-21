import { faBold, faItalic, faStrikethrough, faUnderline } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useState } from "react";
import { ButtonGroup, ButtonToolbar, Dropdown, DropdownButton, ToggleButton } from "react-bootstrap";
import { Descendant, createEditor } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { editorText } from "../../service/editor-state.service";
import { useWritingTask } from "../../service/writing-task.service";

const Editor: FC = () => {
  const [editor] = useState(() => withReact(createEditor()));
  const [content, setContent] = useState<Descendant[]>(
    // get from sessno storage
    JSON.parse(sessionStorage.getItem("content") ?? "null") ||
    [{ type: "paragraph", children: [{ text: "" }] }]);
  const writingTask = useWritingTask();
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [strikethrough, setStrikethrough] = useState(false);

  return (
    <main className="h-100 overflow-hidden flex-grow-1">
      <ButtonToolbar aria-label="Editor Tools">
        <ButtonGroup>
          <DropdownButton as={ButtonGroup} title="File" variant="light">
            <Dropdown.Item eventKey="open">New Writing Task</Dropdown.Item>
            <Dropdown.Item eventKey="save">Save Notes</Dropdown.Item>
          </DropdownButton>
          <DropdownButton as={ButtonGroup} title="View" variant="light">
            <Dropdown.Item eventKey="open">???</Dropdown.Item>
          </DropdownButton>
          <DropdownButton as={ButtonGroup} title="Paragraph" variant="light">
            <Dropdown.Item eventKey="paragraph">Paragraph</Dropdown.Item>
            <Dropdown.Item eventKey="h1">H1</Dropdown.Item>
            <Dropdown.Item eventKey="h2">H2</Dropdown.Item>
            <Dropdown.Item eventKey="h3">H3</Dropdown.Item>
          </DropdownButton>
          <ToggleButton variant="light" checked={bold} onChange={(e) => setBold(e.currentTarget.checked)} id={"toggle-bold"} value={"bold"} type="checkbox"><FontAwesomeIcon icon={faBold} /></ToggleButton>
          <ToggleButton variant="light" checked={italic} onChange={(e) => setItalic(e.currentTarget.checked)} id={"toggle-italic"} value={"italic"} type="checkbox"><FontAwesomeIcon icon={faItalic} /></ToggleButton>
          <ToggleButton variant="light" checked={underline} onChange={(e) => setUnderline(e.currentTarget.checked)} id="toggle-underline" value={"underline"} type="checkbox"><FontAwesomeIcon icon={faUnderline} /></ToggleButton>
          <ToggleButton variant="light" checked={strikethrough} onChange={(e) => setStrikethrough(e.currentTarget.checked)} id="toggle-strikethrough" value={"strikethrough"} type="checkbox"><FontAwesomeIcon icon={faStrikethrough} /></ToggleButton>
        </ButtonGroup>
        <div className="ms-3">
          <h6 className="mb-0 text-muted">Writing Task:</h6>
          <h5>{writingTask?.info.name ?? 'None Selected'}</h5>
        </div>
      </ButtonToolbar>
      <div className="overflow-auto h-100 w-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ReactEditor.focus(editor);
        }}>
        <Slate editor={editor} initialValue={content} onChange={(content: Descendant[]) => {
          // only if change is not selection change.
          if (
            editor.operations.some((op) => "set_selection" !== op.type)
          ) {
            editorText.next(content);
            setContent(content);
            sessionStorage.setItem("content", JSON.stringify(content));
          }
        }}>
          <Editable></Editable>
        </Slate>
      </div>
    </main>
  );
};

export default Editor;