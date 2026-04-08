/* @overview: This is the configuration page for LTI deeplinking. The user can select a writing task from a list. */
import { WritingTaskFilter } from "#components/WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "#components/WritingTaskInfo/WritingTaskInfo";
import { WritingTaskRulesTree } from "#components/WritingTaskRulesTree/WritingTaskRulesTree.js";
import { type WritingTask } from "#lib/WritingTask";
import { type FC, useId, useRef, useState } from "react";
import {
  Card,
  Carousel,
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

  return (
    <main
      className="p-3 border d-flex flex-column overflow-hidden deeplink"
      style={{ height: "600px", width: "800px" }}
    >
      <Card className="bg-light flex-grow-1 overflow-hidden writing-task-card">
        <Card.Body>
          <Carousel
            wrap={false}
            variant="dark"
            indicators={true}
            interval={null}
          >
            <Carousel.Item>
              <div className="d-flex flex-row gap-3 align-items-stretch first-carousel">
                <div className="w-100">
                  <h5 className="fw-bold">{t("select_task.title")}</h5>
                  <WritingTaskFilter tasks={tasks} update={setData} />
                </div>
                <ListGroup className="w-100 overflow-auto h-100">
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
                <div className="w-100 h-100">
                  <WritingTaskInfo task={selected} />
                </div>
              </div>
            </Carousel.Item>
            <Carousel.Item>
              <WritingTaskRulesTree
                detailsClassName="bg-white"
                task={selected}
                includeTitle
                className="last-carousel"
              />
            </Carousel.Item>
          </Carousel>
        </Card.Body>
      </Card>
      <Card className="bg-light mt-3">
        <Card.Body>
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
        </Card.Body>
      </Card>
      <footer></footer>
    </main>
  );
};
