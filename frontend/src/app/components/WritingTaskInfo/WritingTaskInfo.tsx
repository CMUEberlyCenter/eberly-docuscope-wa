import { FC } from "react";
import { Translation } from "react-i18next";
import { WritingTask } from "../../../lib/WritingTask";

type WritingTaskInfoProps = {
  task: WritingTask | null;
};
/**
 * Card for displaying Metadata about a writing task.
 * @param param0
 * @returns
 * @component
 */
export const WritingTaskInfo: FC<WritingTaskInfoProps> = ({ task }) => (
  <Translation>
    {(t) => (
      <div className="border rounded p-3 bg-light w-100 mh-100 overflow-auto">
        <h4>{task?.info.name ?? t("select_task.null")}</h4>
        <p>{task?.rules.overview}</p>
        <p>
          {t("select_task.version", { version: task?.info.version ?? "-" })}
        </p>
        <p>
          {t("select_task.copyright", {
            copyright: task?.info.copyright ?? "-",
          })}
        </p>
      </div>
    )}
  </Translation>
);
