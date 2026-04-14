import type { WritingTask } from "#/lib/WritingTask";
import type { FC, HTMLAttributes } from "react";
import { Translation } from "react-i18next";

type WritingTaskInfoProps = HTMLAttributes<HTMLDivElement> & {
  /** The writing task to display information about. */
  task: WritingTask | null | undefined;
};
/**
 * Component for displaying Metadata about a writing task (outline).
 */
export const WritingTaskInfo: FC<WritingTaskInfoProps> = ({
  task,
  className = "bg-light",
  ...props
}) => (
  <Translation>
    {(t) => (
      <div
        className={`border rounded p-3 ${className} w-100 mh-100 overflow-auto`}
        {...props}
      >
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
