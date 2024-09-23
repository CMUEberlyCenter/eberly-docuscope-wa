import classNames from "classnames";
import { FC, HTMLProps } from "react";
import { Translation } from "react-i18next";
import { useWritingTask } from "../../service/writing-task.service";

/** Component for displaying the title of the globally selected outline. */
export const WritingTaskTitle: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const writingTask = useWritingTask();
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
            {writingTask?.info.name ?? t("editor.menu.no_task")}
          </h6>
        </div>
      )}
    </Translation>
  );
};
