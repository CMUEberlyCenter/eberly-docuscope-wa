import classNames from "classnames";
import type { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";
import type { Optional } from "../../../index.d";
import type { WritingTask } from "../../../lib/WritingTask";

/** Component for displaying the title of the globally selected outline. */
export const WritingTaskTitle: FC<
  HTMLProps<HTMLDivElement> & { task?: Optional<WritingTask> }
> = ({ className, task, ...props }) => {
  const cn = classNames(
    className,
    "d-flex align-items-start flex-column justify-content-center"
  );

  return (
    <Translation>
      {(t) => (
        <div className={cn} {...props}>
          <span className="mb-0 text-muted" style={{ fontSize: "12px" }}>
            {t("editor.menu.task")}
          </span>
          <h6 className="mb-1">
            {task?.info.name ?? t("editor.menu.no_task")}
          </h6>
        </div>
      )}
    </Translation>
  );
};
