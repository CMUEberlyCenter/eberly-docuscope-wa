/* @overview: This is the configuration page for LTI deeplinking. The user can select a writing task from a list. */
import { WritingTaskFilter } from "#components/WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "#components/WritingTaskInfo/WritingTaskInfo";
import { WritingTaskRulesTree } from "#components/WritingTaskRulesTree/WritingTaskRulesTree.js";
import { type WritingTask } from "#lib/WritingTask";
import { type FC, useId, useRef, useState } from "react";
import {
  Button,
  Form,
  ListGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";
import "./style.scss";

export const Page: FC = () => {
  const { t } = useTranslation();
  const { tasks } = useData<Data>();
  const [selected, setSelected] = useState<WritingTask | null>(null);
  const [data, setData] = useState<WritingTask[]>([]);

  const selectId = useId();
  const [tool, setTool] = useState<string>("");
  const targetRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);

  return (
    <main className="h-100 d-flex flex-column overflow-hidden gap-1 p-1 small">
      <div className="flex-grow-1 minh-0 h-100 overflow-hidden position-relative">
        {/* <Activity mode={index === 0 ? "visible" : "hidden"}> */}
        <div
          className={`minh-0 h-100 overflow-hidden position-absolute top-0 start-0 d-flex flex-row gap-3 align-items-stretch slide-container start ${index === 0 ? "active" : ""}`}
        >
          <div className="w-100">
            <h5 className="fw-bold">{t("select_task.title")}</h5>
            <WritingTaskFilter tasks={tasks} update={setData} />
          </div>
          <ListGroup className="w-100 overflow-auto minh-0 h-100">
            {data
              .toSorted((a, b) => a.info.name.localeCompare(b.info.name))
              .map((task) => (
                <ListGroup.Item
                  key={task.info.name}
                  action
                  active={selected === task}
                  onClick={() => setSelected(task)}
                >
                  {task.info.name}
                </ListGroup.Item>
              ))}
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
          <div className="w-100 h-100 minh-0 d-flex flex-column gap-2 align-items-stretch">
            <div className="flex-grow-1 minh-0 overflow-hidden">
              <WritingTaskInfo task={selected} className="" />
            </div>
            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                disabled={!selected}
                onClick={() => setIndex(1)}
              >
                {t("deeplinking.next")}
              </Button>
            </div>
          </div>
        </div>
        {/* </Activity> */}
        {/* <Activity mode={index === 1 ? "visible" : "hidden"}> */}
        <div
          className={`minh-0 h-100 w-100 overflow-hidden position-absolute top-0 start-0 d-flex flex-column gap-3 align-items-stretch slide-container end ${index === 1 ? "active" : ""}`}
        >
          <WritingTaskRulesTree
            detailsClassName="border border-2 rounded"
            task={selected}
            includeTitle
            className="flex-grow-1 minh-0"
          />
          <div>
            <Button
              variant="secondary"
              className=""
              onClick={() => setIndex(0)}
            >
              {t("deeplinking.previous")}
            </Button>
          </div>
        </div>
        {/* </Activity> */}
      </div>
      <hr />
      <div>
        <Form
          noValidate
          method="post"
          className="d-flex gap-2 justify-content-between align-items-center"
        >
          <input
            type="hidden"
            name="file"
            value={JSON.stringify(selected)}
            className="d-none"
            readOnly={true}
          />
          <label htmlFor={selectId} className="h5 fw-bold w-100">
            {t("deeplinking.select_tool")}
          </label>
          <div className="w-100">
            <select
              id={selectId}
              className="form-select"
              name="tool"
              required
              onChange={(e) => setTool(e.target.value)}
              value={tool}
            >
              <option value="">---</option>
              <option value="draft">{t("deeplinking.option.draft")}</option>
              <option value="review">{t("deeplinking.option.review")}</option>
            </select>
          </div>
          <div className="w-100 d-flex justify-content-end">
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
                  ref={targetRef}
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selected || !tool || true}
                  title={
                    !selected || !tool ? t("deeplinking.disabled") : undefined
                  }
                >
                  {t("select")}
                </button>
              </div>
            </OverlayTrigger>
          </div>
        </Form>
      </div>
    </main>
  );
};
