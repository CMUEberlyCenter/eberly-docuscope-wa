import { ClipboardIconButton } from "#components/ClipboardIconButton/ClipboardIconButton";
import { MyProseLinks } from "#components/MyProseLinks/MyProseLinks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card.tsx";
import { WritingTaskFilter } from "#components/WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "#components/WritingTaskInfo/WritingTaskInfo";
import { DbWritingTask } from "#lib/WritingTask";
import { FC, useState } from "react";
import { Badge, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { Data } from "./+data";

export const Page: FC = () => {
  const { t } = useTranslation("admin");
  const { tasks, privateTasks } = useData<Data>();
  const [data, setData] = useState<DbWritingTask[]>([]);
  const [selected, setSelected] = useState<DbWritingTask | null>(null);
  const hostname = new URL(import.meta.env.BASE_URL, window.location.href); // base url for link
  const [selectedPrivate, setSelectedPrivate] = useState<DbWritingTask | null>(
    null
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin:writing_tasks.public.title")}
            <Badge bg="primary" className="tw:ms-2">
              {data.length}/{tasks.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t("admin:writing_tasks.public.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="tw:text-base">
          <div
            className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
            style={{ maxHeight: "70vh", minHeight: 0 }}
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
                </ListGroup>
              </div>
            </div>
            <div className="w-50 overflow-auto">
              <MyProseLinks hostname={hostname} selected={selected} />
              <WritingTaskInfo task={selected} />
            </div>
          </div>
        </CardContent>
      </Card>
      {privateTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("writing_tasks.private.title")}
              <Badge bg="primary" className="tw:ms-2">
                {privateTasks.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t("writing_tasks.private.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="tw:text-base">
            <ListGroup as="ul">
              {privateTasks.map((task) => (
                <ListGroup.Item
                  as="li"
                  key={task._id}
                  action
                  onClick={() =>
                    setSelectedPrivate(
                      selectedPrivate?._id === task._id ? null : task
                    )
                  }
                >
                  <div className="d-flex w-100 gap-3">
                    <h5>{task.info.name}</h5>
                    <div>
                      {t("writing_tasks.private.version", {
                        version: task.info.version,
                      })}
                    </div>
                    <div>
                      {t("writing_tasks.private.saved", {
                        saved: new Date(task.info.saved).toLocaleString(),
                      })}
                    </div>
                    {task.modified && (
                      <div>
                        {t("writing_tasks.private.uploaded", {
                          uploaded: new Date(task.modified).toLocaleString(),
                        })}
                      </div>
                    )}
                    <a href={`/myprose/${task._id}`}>
                      {t("writing_tasks.private.main")}
                    </a>
                    <ClipboardIconButton
                      onClick={() =>
                        navigator.clipboard.writeText(
                          new URL(`/myprose/${task._id}`, hostname).toString()
                        )
                      }
                    />
                  </div>
                  {selectedPrivate?._id === task._id && (
                    <pre className="overflow-auto">
                      {JSON.stringify(task, null, 2)}
                    </pre>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </CardContent>
        </Card>
      )}
    </>
  );
};
