/* @overview: This is the configuration page for LTI deeplinking. The user can select a writing task from a list, or upload a custom writing task in JSON format. */
import { type ChangeEvent, type FC, useState } from "react";
import { Form, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { WritingTaskInfo } from "../../../src/app/components/WritingTaskInfo/WritingTaskInfo";
import { isWritingTask, type WritingTask } from "../../../src/lib/WritingTask";
import type { Data } from "./+data";

export const Page: FC = () => {
  const { t } = useTranslation();
  const { tasks } = useData<Data>();
  const [selected, setSelected] = useState<WritingTask | null>(null);
  const [custom, setCustom] = useState<WritingTask | null>(null); // Uploaded file content.
  const [valid, setValid] = useState(true); // Uploaded file validity.
  // const [error, setError] = useState(""); // Error messages for uploaded file.

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        const content = await files[0].text();
        const json = JSON.parse(content);
        if (isWritingTask(json)) {
          setValid(true);
          setCustom(json);
          setSelected(json);
        } else {
          setValid(false);
        }
      } catch (err) {
        // expecting JSON parser error.
        // TODO provide error message to invalid text.
        setValid(false);
        console.error(err);
      }
    }
  };

  return (
    <main className="vh-100 vw-90 p-2">
      <div className="d-flex flex-column h-100 w-100 gap-3">
        <div
          className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
          style={{ minHeight: 0 }}
        >
          <ListGroup className="overflow-auto w-100">
            {tasks.map((task) => (
              <ListGroup.Item
                key={task.info.name}
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
          <div className="w-100 overflow-auto">
            <WritingTaskInfo task={selected} />
          </div>
        </div>
        <footer className="d-flex justify-content-between">
          <Form.Group>
            <Form.Control
              type="file"
              onChange={onFileChange}
              accept=".json"
              isInvalid={!valid}
            />
            <Form.Control.Feedback type="invalid">
              {t("select_task.invalid_upload")}
            </Form.Control.Feedback>
          </Form.Group>
          <Form noValidate method="post">
            <input
              type="hidden"
              name="file"
              value={JSON.stringify(selected)}
              className="d-none"
              readOnly={true}
            />
            <button type="submit" className="btn btn-primary">
              {t("select")}
            </button>
          </Form>
        </footer>
      </div>
    </main>
  );
};
