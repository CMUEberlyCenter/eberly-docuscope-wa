/* @overview: This is the configuration page for LTI deeplinking. The user can select a writing task from a list, or upload a custom writing task in JSON format. */
import { type ChangeEvent, type FC, useId, useRef, useState } from "react";
import { Form, ListGroup, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { WritingTaskFilter } from "../../../src/app/components/WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "../../../src/app/components/WritingTaskInfo/WritingTaskInfo";
import { validateWritingTask } from "../../../src/lib/schemaValidate";
import { isWritingTask, type WritingTask } from "../../../src/lib/WritingTask";
import type { Data } from "./+data";

export const Page: FC = () => {
  const { t } = useTranslation();
  const { tasks } = useData<Data>();
  const [selected, setSelected] = useState<WritingTask | null>(null);
  const [custom, setCustom] = useState<WritingTask | null>(null); // Uploaded file content.
  const [valid, setValid] = useState(true); // Uploaded file validity.
  const [error, setError] = useState(""); // Error messages for uploaded file.
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
        } else if (isWritingTask(json)) {
          setValid(true);
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
    }
  };
  const selectId = useId();
  const [tool, setTool] = useState<string>("");
  const target = useRef<HTMLButtonElement>(null);

  // TODO: error page when not in LTI context.
  return (
    <main className="vh-100 vw-90 p-2">
      <div className="d-flex flex-column h-100 w-100 gap-3">
        <div
          className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
          style={{ minHeight: 0 }}
        >
          <WritingTaskFilter tasks={tasks} update={setData} />
          <ListGroup className="overflow-auto w-100">
            {data.map((task) => (
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
          <Form noValidate method="post" className="d-flex gap-2">
            <input
              type="hidden"
              name="file"
              value={JSON.stringify(selected)}
              className="d-none"
              readOnly={true}
            />
            <label htmlFor={selectId} className="">
              {t("deeplinking.select_tool")}
              <select
                id={selectId}
                className="form-select"
                name="tool"
                required
                onChange={(e) => setTool(e.target.value)}
                value={tool}
              >
                <option value="" selected>
                  ---
                </option>
                <option value="draft">{t("deeplinking.option.draft")}</option>
                <option value="review">{t("deeplinking.option.review")}</option>
              </select>
            </label>
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip>
                  {t(
                    !selected || !tool
                      ? "deeplinking.disabled"
                      : t("deeplinking.enabled")
                  )}
                </Tooltip>
              }
            >
              <div>
                <button
                  ref={target}
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selected || !tool}
                  title={
                    !selected || !tool ? t("deeplinking.disabled") : undefined
                  }
                >
                  {t("select")}
                </button>
              </div>
            </OverlayTrigger>
          </Form>
        </footer>
      </div>
    </main>
  );
};
