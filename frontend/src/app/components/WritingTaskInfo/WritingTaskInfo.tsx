import { FC } from "react";
import { Translation } from "react-i18next";
import type { WritingTask } from "../../../lib/WritingTask";

type WritingTaskInfoProps = {
  /** The writing task to display information about. */
  task: WritingTask | null;
};
/**
 * Component for displaying Metadata about a writing task (outline).
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
