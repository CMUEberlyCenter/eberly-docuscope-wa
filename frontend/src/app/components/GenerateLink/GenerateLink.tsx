import { ChangeEvent, FC, useEffect, useState } from "react";
import { Form, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { validateWritingTask } from "../../../lib/schemaValidate";
import {
  hasKeywords,
  isWritingTask,
  WritingTask,
} from "../../../lib/WritingTask";
import { useWritingTasks } from "../../service/writing-task.service";
import { ClipboardIconButton } from "../ClipboardIconButton/ClipboardIconButton";
import { Loading } from "../Loading/Loading";
import { WritingTaskFilter } from "../WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "../WritingTaskInfo/WritingTaskInfo";

type IdWritingTask = WritingTask & { _id?: string };

export const GenerateLink: FC = () => {
  const { t } = useTranslation();
  /** List of publicly available writing tasks and loading status. */
  const { data, isLoading } = useWritingTasks();
  /** Currently selected writing task. */
  const [selected, setSelected] = useState<IdWritingTask | null>(null);
  const [custom, setCustom] = useState<IdWritingTask | null>(null); // Uploaded file content.
  const [valid, setValid] = useState(true); // Uploaded file validity.
  const [error, setError] = useState(""); // Error messages for uploaded file.
  const hostname = new URL("/index.html", window.location.href); // base url for link
  const [url, setUrl] = useState(hostname); // URL for currently selected writing task.
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);

  useEffect(() => {
    window.document.title = t("genlink.title");
  }, [t]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
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
        } else if (!isWritingTask(json)) {
          setValid(false);
          setError(t("select_task.invalid_upload"));
        } else {
          const response = await fetch(
            new URL("/api/v2/writing_tasks", location.href),
            {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(json),
            }
          );
          if (!response.ok) {
            setValid(false);
            setError(await response.text());
            return;
          }
          setValid(true);
          const id = await response.text();
          const custom = { ...json, _id: id };
          setCustom(custom);
          setSelected(custom);
        }
      } catch (err) {
        setValid(false);
        if (err instanceof SyntaxError) {
          setError(t("select_task.malformed_json"));
        } else {
          setError(t("select_task.invalid_upload"));
        }
      }
    }
  };
  useEffect(() => {
    const target = new URL(hostname);
    if (selected && selected._id) {
      target.searchParams.append("writing_task", selected._id);
    }
    setUrl(target);
  }, [selected]);

  return (
    <main className="h-100 w-100 d-flex flex-column card px-0">
      <header className="text-center card-header">
        <h1>{t("genlink.title")}</h1>
      </header>
      <div className="card-body overflow-hidden">
        {isLoading ? (
          <Loading />
        ) : (
          <div className="d-flex flex-column h-100 w-100 gap-3">
            <div
              className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
              style={{ minHeight: 0 }}
            >
              <WritingTaskFilter className="w-100" update={setActiveKeywords} />
              <ListGroup className="overflow-auto w-100 mh-100">
                {data
                  ?.filter(
                    (task) =>
                      activeKeywords.length === 0 ||
                      hasKeywords(task, activeKeywords)
                  )
                  .map((task) => (
                    <ListGroup.Item
                      key={task.info.name}
                      active={selected === task}
                      action
                      onClick={() => setSelected(task)}
                    >
                      {task.info.name}
                    </ListGroup.Item>
                  ))}
                {custom && (
                  <ListGroup.Item
                    key="custom"
                    active={selected === custom}
                    action
                    onClick={() => setSelected(custom)}
                  >
                    {custom?.info.name}
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
              <div className="w-100 overflow-auto">
                <div className="border rounded container-fluid mb-1 py-1">
                  <h4 className="d-inline">{t("genlink.link")}</h4>
                  <a href={url.toString()} className="ms-4">
                    {selected?.info.name ?? "myProse"}
                  </a>
                  <p>
                    <ClipboardIconButton
                      onClick={() =>
                        navigator.clipboard.writeText(url.toString())
                      }
                    />
                    {url.toString()}
                  </p>
                </div>
                <WritingTaskInfo task={selected} />
              </div>
            </div>
          </div>
        )}
      </div>
      <footer className="card-footer">
        <Form noValidate>
          <Form.Group>
            <Form.Control
              type="file"
              onChange={onFileChange}
              isInvalid={!valid}
            />
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          </Form.Group>
        </Form>
      </footer>
    </main>
  );
};
