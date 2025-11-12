/* @overview: This page allows the user to generate a link for a writing task. The user can select a writing task from a list, or upload a custom writing task file. The page also displays the generated link and allows the user to copy it to the clipboard. */
import { type ChangeEvent, type FC, useState } from "react";
import { Form, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { ClipboardIconButton } from "../../../src/app/components/ClipboardIconButton/ClipboardIconButton";
import { WritingTaskFilter } from "../../../src/app/components/WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "../../../src/app/components/WritingTaskInfo/WritingTaskInfo";
import { validateWritingTask } from "../../../src/lib/schemaValidate";
import { isWritingTask, type WritingTask } from "../../../src/lib/WritingTask";
import type { Data } from "./+data";

const WritingTaskLink: FC<{ href: URL; title: string }> = ({ href, title }) => {
  const url = href.toString();
  return (
    <div className="d-flex flex-column justify-content-between">
      <a href={url}>{title}</a>
      <span>
        {url}
        <ClipboardIconButton
          onClick={() => navigator.clipboard.writeText(url)}
        />
      </span>
    </div>
  );
};
type IdWritingTask = WritingTask & { _id?: string };

const Page: FC = () => {
  const { t } = useTranslation();
  const { tasks } = useData<Data>();
  /** Currently selected writing task. */
  const [selected, setSelected] = useState<IdWritingTask | null>(null);
  const [custom, setCustom] = useState<IdWritingTask | null>(null); // Uploaded file content.
  const [valid, setValid] = useState(true); // Uploaded file validity.
  const [error, setError] = useState(""); // Error messages for uploaded file.
  const hostname = new URL(import.meta.env.BASE_URL, window.location.href); // base url for link
  const [data, setData] = useState<WritingTask[]>([]);

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

  return (
    <main className="vh-100 vw-100 d-flex flex-column card px-0">
      <header className="text-center card-header">
        <h1>{t("genlink.title")}</h1>
      </header>
      <div className="card-body overflow-hidden">
        <div className="d-flex flex-column h-100 w-100 gap-3">
          <div
            className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
            style={{ minHeight: 0 }}
          >
            <WritingTaskFilter
              className="w-100"
              update={setData}
              tasks={tasks}
            />
            <ListGroup className="overflow-auto w-100 mh-100">
              {data
                .toSorted((a, b) => a.info.name.localeCompare(b.info.name))
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
              <div className="mb-1 py-1">
                <header>
                  <h4 className="d-inline">{t("genlink.link")}</h4>
                </header>
                <ListGroup>
                  {selected ? (
                    <>
                      <ListGroup.Item>
                        <WritingTaskLink
                          href={
                            new URL(
                              `/myprose/${selected !== custom && selected.public && selected.info.id ? selected.info.id : selected._id}`,
                              hostname
                            )
                          }
                          title={t("genlink.top_template", {
                            title: selected.info.name,
                          })}
                        />
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <WritingTaskLink
                          href={
                            new URL(
                              `/myprose/${selected !== custom && selected.public && selected.info.id ? selected.info.id : selected._id}/draft`,
                              hostname
                            )
                          }
                          title={t("genlink.draft_template", {
                            title: selected.info.name,
                          })}
                        />
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <WritingTaskLink
                          href={
                            new URL(
                              `/myprose/${selected !== custom && selected.public && selected.info.id ? selected.info.id : selected._id}/review`,
                              hostname
                            )
                          }
                          title={t("genlink.review_template", {
                            title: selected.info.name,
                          })}
                        />
                      </ListGroup.Item>
                    </>
                  ) : (
                    <>
                      <ListGroup.Item>
                        <WritingTaskLink
                          href={new URL("/myprose", hostname)}
                          title={t("document.title")}
                        />
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <WritingTaskLink
                          href={new URL("/draft", hostname)}
                          title={t("genlink.draft")}
                        />
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <WritingTaskLink
                          href={new URL("/review", hostname)}
                          title={t("genlink.review")}
                        />
                      </ListGroup.Item>
                    </>
                  )}
                </ListGroup>
              </div>
              <WritingTaskInfo task={selected} />
            </div>
          </div>
        </div>
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
  // return (
  //   <div>
  //     <h1 suppressHydrationWarning={true} data-allow-mismatch="text">{t('genlink.title')}</h1>
  //     <p>This is the Generate Link page.</p>
  //   </div>
  // );
};
export default Page;
