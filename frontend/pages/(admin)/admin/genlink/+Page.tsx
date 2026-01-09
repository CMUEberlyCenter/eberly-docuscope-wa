import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Activity, ChangeEvent, FC, useState } from "react";
import { Button, Card, Form, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { ClipboardIconButton } from "../../../../components/ClipboardIconButton/ClipboardIconButton";
import { MyProseLinks } from "../../../../components/MyProseLinks/MyProseLinks";
import { WritingTaskFilter } from "../../../../components/WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "../../../../components/WritingTaskInfo/WritingTaskInfo";
import { validateWritingTask } from "../../../../src/lib/schemaValidate";
import {
  type DbWritingTask,
  isEnabled,
  isWritingTask,
  WritingTask,
} from "../../../../src/lib/WritingTask";
import { Data } from "./+data";

export const Page: FC = () => {
  const { t } = useTranslation();
  const { t: tr } = useTranslation("review");
  const { previews, tasks } = useData<Data>();
  const { settings } = usePageContext();

  const [data, setData] = useState<DbWritingTask[]>([]);
  const [selected, setSelected] = useState<DbWritingTask | null>(null);
  const hostname = new URL(import.meta.env.BASE_URL, window.location.href); // base url for link
  const [custom, setCustom] = useState<WritingTask | null>(null); // Uploaded file content.
  const [valid, setValid] = useState(true); // Uploaded file validity.
  const [error, setError] = useState(""); // Error messages for uploaded file.
  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    if (files.length > 1) {
      setValid(false);
      setError(t("select_task.multiple_file_error"));
      return;
    }

    try {
      const content = await files[0].text();
      const json = JSON.parse(content);
      if (!validateWritingTask(json)) {
        setValid(false);
        setError(JSON.stringify(validateWritingTask.errors));
      } else if (isWritingTask(json)) {
        setValid(true);
        json.info.id = undefined; // ensure no id for uploaded task
        json.public = false; // ensure private for uploaded task
        setCustom(json);
        setSelected(json);
      } else {
        setValid(false);
        setError(t("select_task.invalid_upload"));
      }
    } catch (err) {
      // expecting JSON parser error.
      // TODO provide error message to invalid text.
      setValid(false);
      console.error(err);
      if (err instanceof SyntaxError) {
        setError(t("select_task.malformed_json"));
      } else {
        setError(t("select_task.invalid_upload"));
      }
    }
  };
  const [document, setDocument] = useState<File | null>(null);
  const [validDocument, setValidDocument] = useState(true); // Uploaded file validity.
  const [errorDocument, setErrorDocument] = useState(""); // Error messages for uploaded file.

  const onDocumentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setDocument(null);
      return;
    }
    if (files.length > 1) {
      setValidDocument(false);
      setErrorDocument(t("select_task.multiple_file_error"));
      setDocument(null);
      return;
    }
    setDocument(files[0]);
    // TODO handle document upload
  };

  return (
    <>
      <Card>
        <Card.Header>{t("admin.genlink.title")}</Card.Header>
        <Card.Body>
          <Card.Text>{t("admin.genlink.description")}</Card.Text>
          <div
            className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
            style={{ maxHeight: "30rem" }}
          >
            <div className="d-flex flex-column align-items-stretch gap-3 w-50">
              <div className="d-flex flex-row align-items-stretch gap-3 flex-grow-1 overflow-hidden">
                <WritingTaskFilter tasks={tasks} update={setData} />
                <ListGroup className="overflow-auto w-100 mh-100">
                  {data
                    .toSorted((a, b) => a.info.name.localeCompare(b.info.name))
                    .map((task) => (
                      <ListGroup.Item
                        key={task.info.id ?? task.info.name}
                        action
                        active={selected === task}
                        onClick={() => setSelected(task)}
                      >
                        {task.info.name}
                      </ListGroup.Item>
                    ))}
                  {custom && (
                    <ListGroup.Item
                      key={"custom"}
                      action
                      active={selected === custom}
                      onClick={() => setSelected(custom)}
                    >
                      {custom.info.name}
                    </ListGroup.Item>
                  )}
                  <ListGroup.Item
                    key="null"
                    action
                    variant="warning"
                    active={!selected}
                    onClick={() => setSelected(null)}
                  >
                    {t("select_task.null")}
                  </ListGroup.Item>
                </ListGroup>
              </div>
              <Form.Group>
                <Form.Label>{t("deeplinking.upload")}</Form.Label>
                <Form.Control
                  type="file"
                  onChange={onFileChange}
                  accept=".json"
                  isInvalid={!valid}
                />
                <Form.Control.Feedback type="invalid">
                  {error}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="w-50 overflow-auto">
              <MyProseLinks hostname={hostname} selected={selected} />
              <WritingTaskInfo task={selected} />
            </div>
          </div>

          <hr />
          <div>
            <h5>{t("admin.genlink.document.title")}</h5>
            <p>{t("admin.genlink.document.description")}</p>
            <Form
              method="POST"
              action={"/api/v2/preview"}
              encType="multipart/form-data"
            >
              <input
                type="hidden"
                name="task"
                value={JSON.stringify(selected)}
                className="d-none"
                readOnly={true}
              />
              <Form.Group>
                <Form.Label>{t("admin.genlink.document.upload")}</Form.Label>
                <Form.Control
                  type="file"
                  name="document"
                  onChange={onDocumentChange}
                  accept=".docx"
                  disabled={!selected}
                  isInvalid={!validDocument}
                />
                <Form.Control.Feedback type="invalid">
                  {errorDocument}
                </Form.Control.Feedback>
              </Form.Group>
              <Activity mode={!selected ? "hidden" : "visible"}>
                <Form.Group className="container mt-3">
                  <Form.Label>{t("admin.genlink.document.tools")}</Form.Label>
                  <div className="row">
                    {selected?.info.review_tools
                      ?.filter(
                        ({ tool }) =>
                          settings &&
                          tool in settings &&
                          settings[tool as keyof typeof settings]
                      )
                      .map(({ tool, enabled }) => (
                        <div
                          className="col-lg-2 col-md-4 col-sm-6 form-check"
                          key={tool}
                        >
                          <label className="form-check-label">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              disabled={!selected || !isEnabled(selected, tool)}
                              name={`tool_config[]`}
                              value={tool}
                              defaultChecked={enabled}
                            />
                            {tr(`review:${tool}.title`)}
                          </label>
                        </div>
                      ))}
                  </div>
                </Form.Group>
              </Activity>
              <Button type="submit" disabled={!selected || !document}>
                {t("admin.genlink.submit")}
              </Button>
            </Form>
          </div>
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>{t("admin.genlink.existing_previews")}</Card.Header>
        <ListGroup variant="flush">
          {previews.map(({ id, task, filename, timestamp }) => (
            <ListGroup.Item key={`${id}`}>
              <a href={`/preview/${id}`}>
                {task.info.name}: {filename} (
                {new Date(timestamp).toLocaleString()})
              </a>
              <ClipboardIconButton
                onClick={() =>
                  navigator.clipboard.writeText(
                    new URL(`/preview/${id}`, hostname).toString()
                  )
                }
              />
              <Button
                variant="icon"
                className="text-danger"
                onClick={() => {
                  fetch(`/api/v2/preview/${id}`, { method: "DELETE" })
                    .then((response) => {
                      if (response.ok) {
                        // Optionally, you can add logic to remove the deleted preview from the UI
                        window.location.reload();
                      } else {
                        console.error("Failed to delete preview");
                      }
                    })
                    .catch((error) => {
                      console.error("Error deleting preview:", error);
                    });
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    </>
  );
};
