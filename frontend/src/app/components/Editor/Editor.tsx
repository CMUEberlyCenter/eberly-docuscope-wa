import { FC, useState } from "react";
import { Descendant, createEditor } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { editorText } from "../../service/editor-state.service";
import { Button, ButtonGroup, ButtonToolbar, Dropdown, DropdownButton } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBold, faItalic, faStrikethrough, faUnderline } from "@fortawesome/free-solid-svg-icons";
import { useWritingTask } from "../../service/writing-task.service";

const Editor: FC = () => {
  const [editor] = useState(() => withReact(createEditor()));
  const [content, setContent] = useState<Descendant[]>(
    // get from sessno storage
    JSON.parse(sessionStorage.getItem("content") ?? "null") ||
    [{ type: "paragraph", children: [{ text: "" }] }]);
    const writingTask = useWritingTask();
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
          <Button variant="light"><FontAwesomeIcon icon={faBold} /></Button>
          <Button variant="light"><FontAwesomeIcon icon={faItalic} /></Button>
          <Button variant="light"><FontAwesomeIcon icon={faUnderline} /></Button>
          <Button variant="light"><FontAwesomeIcon icon={faStrikethrough} /></Button>
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