import { WritingTask } from "#/lib/WritingTask.ts";
import { WritingTaskFilter } from "#components/WritingTaskFilter/WritingTaskFilter.tsx";
import { WritingTaskInfo } from "#components/WritingTaskInfo/WritingTaskInfo.tsx";
import { WritingTaskRulesTree } from "#components/WritingTaskRulesTree/WritingTaskRulesTree.tsx";
import {
  Activity,
  ViewTransition,
  startTransition,
  useState,
  type FC,
} from "react";
import { Button, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { Data } from "./+data";
import "./style.css";

const Page: FC = () => {
  const { t } = useTranslation();
  const { tasks } = useData<Data>();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<WritingTask | null>(null);
  const [data, setData] = useState<WritingTask[]>(() => tasks);
  return (
    <>
      <nav className="tw:h-full tw:flex tw:flex-row tw:overflow-hidden tw:grow">
        <Activity mode={index === 0 ? "visible" : "hidden"}>
          <ViewTransition enter="slide-in-left" exit="slide-out-left">
            <div className="tw:flex tw:flex-row tw:gap-3 tw:align-items-stretch tw:h-full tw:w-full">
              <div className="tw:w-full">
                <h5 className="tw:font-bold">{t("select_task.title")}</h5>
                <WritingTaskFilter tasks={tasks} update={setData} />
              </div>
              <ListGroup className="overflow-auto h-100 w-100 minh-0">
                {data
                  .toSorted((a, b) => a.info.name.localeCompare(b.info.name))
                  .map((task) => (
                    <ListGroup.Item
                      key={task.info.name}
                      action
                      active={selected?.info.id === task.info.id}
                      onClick={() => startTransition(() => setSelected(task))}
                    >
                      {task.info.name}
                    </ListGroup.Item>
                  ))}
              </ListGroup>
              <div className="tw:flex tw:flex-col tw:gap-2 tw:align-items-stretch tw:w-full tw:h-full">
                <WritingTaskInfo
                  task={selected}
                  className="tw:grow tw:overflow-hidden"
                />
                <div className="tw:flex tw:flex-row tw:justify-content-end">
                  <Button
                    variant="secondary"
                    onClick={() => startTransition(() => setIndex(1))}
                    disabled={!selected}
                  >
                    {t("deeplinking.next")}
                  </Button>
                </div>
              </div>
            </div>
          </ViewTransition>
        </Activity>
        <Activity mode={index === 1 ? "visible" : "hidden"}>
          <ViewTransition enter="slide-in-right" exit="slide-out-right">
            <div className="tw:w-full tw:h-full tw:flex tw:flex-col tw:gap-2 tw:align-items-stretch tw:grow">
              <WritingTaskRulesTree
                task={selected}
                includeTitle
                className="tw:border-2 tw:rounded tw:h-full"
              />
              <div>
                <Button
                  variant="secondary"
                  onClick={() => startTransition(() => setIndex(0))}
                >
                  {t("deeplinking.previous")}
                </Button>
              </div>
            </div>
          </ViewTransition>
        </Activity>
      </nav>
      <main className="m-3 d-flex justify-content-around flex-row align-items-center gap-3">
        <Activity mode={!selected ? "visible" : "hidden"}>
          <span>{t("select_task.title")}</span>
        </Activity>
        <Activity mode={selected ? "visible" : "hidden"}>
          <div>
            <a href={`/myprose/${selected?.info.id}`}>{selected?.info.name}</a>
          </div>
          <div>
            <a href={`/myprose/${selected?.info.id}/draft`}>
              {selected?.info.name} - {t("deeplinking.option.draft")}
            </a>
          </div>
          <div>
            <a href={`/myprose/${selected?.info.id}/review`}>
              {selected?.info.name} - {t("deeplinking.option.review")}
            </a>
          </div>
        </Activity>
      </main>
    </>
  );
};

export default Page;
