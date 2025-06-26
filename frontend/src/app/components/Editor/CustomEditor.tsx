import {
  faBold,
  faItalic,
  faStrikethrough,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Packer } from "docx";
import { convertToHtml } from "mammoth";
import { type FC, useCallback, useEffect, useState } from "react";
import {
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  DropdownButton,
  Form,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { createEditor, type Descendant, Editor, Transforms } from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate, withReact } from "slate-react";
import { deserializeHtmlText, serialize, serializeDocx } from "../../lib/slate";
import { FileDownload } from "../FileDownload/FileDownload";
import {
  useInitiateUploadFile,
  useSetUploadErrors,
  useUploadFile,
} from "../FileUpload/FileUploadContext";
import ToolCard from "../ToolCard/ToolCard";
import { WritingTaskButton } from "../WritingTaskButton/WritingTaskButton";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import "./CustomEditor.scss";
import { FormatDropdown } from "./FormatDropdown";
import { MarkButton } from "./MarkButton";
import { renderElement, renderLeaf } from "./SlateElements";

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
  const [selection, setSelection] = useState<boolean>(false);

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

  // Import a docx file
  const upload = useUploadFile();
  const setErrors = useSetUploadErrors();

  const loadFile = useCallback(
    async (file: File) => {
      try {
        if (
          file.type !==
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          throw new TypeError(file.name);
        }

        const arrayBuffer = await file.arrayBuffer();
        const { value, messages } = await convertToHtml(
          { arrayBuffer },
          { styleMap: "u => u" }
        );
        if (messages.length) {
          setErrors(messages);
          // setShowErrors(true);
          console.log(messages);
        }
        const content = deserializeHtmlText(value);
        if (content) {
          // FIXME this currently appends content.
          Transforms.insertNodes(editor, content);
        }
      } catch (err) {
        if (err instanceof Error) {
          setErrors([{ type: "error", message: err.message, error: err }]);
          // setShowErrors(true);
          console.error(err);
        } else {
          console.error("Caught non-error", err);
        }
      }
    },
    [editor]
  );
  useEffect(() => {
    if (upload) {
      loadFile(upload);
    }
  }, [upload]);
  const loadSaveFileOps = {
    id: "myprose",
    types: [
      {
        accept: {
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            [".docx"],
        },
      },
    ],
  };
  const uploadFile = useInitiateUploadFile();

  // Stuff for exporting docx file.
  const [docx, setDocx] = useState<Blob | null>(null);
  const { task: writingTask, username, ltiActivityTitle } = useWritingTask();
  const saveAs = useCallback(async () => {
    if (content) {
      const blob = await Packer.toBlob(
        serializeDocx(content, writingTask, username)
      );
      if (
        "showSaveFilePicker" in window &&
        typeof window.showSaveFilePicker === "function"
      ) {
        const rootname =
          upload?.name ||
          ltiActivityTitle ||
          writingTask?.rules.name ||
          "myProse";
        try {
          const handle: FileSystemFileHandle = await window.showSaveFilePicker({
            ...loadSaveFileOps,
            suggestedName: `${rootname}`,
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          if (!(err instanceof DOMException)) {
            setErrors([{ type: "error", message: "Failed Write", error: err }]);
            // setShowErrors(true);
            console.error(err);
            return;
          }
          switch (err.name) {
            case "AbortError":
              break; // user cancelled
            case "SecurityError":
              // fallback to download if filesystem api is not available. (in iframe in LMS without filesystem access)
              setDocx(blob);
              // setErrors([
              //   { type: "error", message: "Security Error", error: err },
              // ]);
              // setShowErrors(true);
              break; // os reject
            default:
              console.error(err);
          }
        }
      } else {
        setDocx(blob);
      }
    } else {
      setDocx(null);
    }
  }, [content, ltiActivityTitle, writingTask]);

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
        } else {
          const sel = editor.selection
            ? serialize(Editor.fragment(editor, editor.selection)).trim()
                .length > 0
            : false;
          if (sel !== selection) {
            // debounce
            setSelection(sel);
          }
        }
      }}
    >
      <Split
        className="container-fluid vh-100 w-100 d-flex flex-row align-items-stretch"
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
                <Dropdown.Item eventKey="open" onClick={() => uploadFile()}>
                  {t("editor.menu.open")}
                </Dropdown.Item>
                {/* TODO file upload form if filesystem api is not available. */}
                <Dropdown.Item eventKey="save" onClick={() => saveAs()}>
                  {t("editor.menu.save")}
                </Dropdown.Item>
                {docx && (
                  <FileDownload
                    content={docx}
                    title={
                      ltiActivityTitle ||
                      writingTask?.rules.name ||
                      "myProse"
                    }
                  />
                )}
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
            className="p-2 flex-grow-1 overflow-auto user-text"
            style={{ fontSize: `${zoom}%` }}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            spellCheck
            autoFocus
          />
        </main>
        <ToolCard hasSelection={selection} />
      </Split>
    </Slate>
  );
};

export default CustomEditor;
