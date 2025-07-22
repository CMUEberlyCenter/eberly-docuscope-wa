import classNames from "classnames";
import { type FC, type HTMLProps, useId, useState } from "react";
import { Button } from "react-bootstrap";
import { Translation } from "react-i18next";
import OutlineDrawerIcon from "../../assets/icons/wtd_library.svg?react";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";

/** Component for displaying the title of the globally selected outline. */
export const WritingTaskButton: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { task: writingTask, taskId: writingTaskId } = useWritingTask();
  // const selectAvailable = useSelectTaskAvailable();
  const [showTask, setShowTask] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const taskId = useId();
  const selectId = useId();

  const cn = classNames(
    className,
    "d-flex align-items-center flex-row justify-content-center gap-1"
  );

  return (
    <Translation>
      {(t) => (
        <div className={cn} {...props}>
          {writingTask && (
            <>
              <span className="text-muted">{t("editor.menu.task")}</span>
              <Button
                variant="light"
                onClick={() => setShowTask(!showTask)}
                title={t("tool.button.view.title", {
                  title: writingTask.rules.name,
                })}
              >
                {writingTask.rules.name}
              </Button>
              {!writingTaskId && (
                <Button
                  aria-controls={taskId}
                  variant={"light"}
                  onClick={() => setShowSelect(true)}
                >
                  <OutlineDrawerIcon height={24} />
                  <span className="visually-hidden sr-only">
                    {t("select_task.title")}
                  </span>
                </Button>
              )}
            </>
          )}
          {!writingTaskId && !writingTask && (
            <Button
              variant="primary"
              aria-controls={selectId}
              onClick={() => setShowSelect(!showSelect)}
            >
              {t("select_task.title")}
            </Button>
          )}
          {writingTaskId && !writingTask && (
            <h6 className="mb-1">{t("editor.menu.no_task")}</h6>
          )}
          <WritingTaskDetails
            id={taskId}
            show={showTask}
            writingTask={writingTask}
            onHide={() => setShowTask(false)}
          />
          {!writingTaskId ? (
            <SelectWritingTask
              id={selectId}
              show={showSelect}
              onHide={() => setShowSelect(false)}
            />
          ) : null}
        </div>
      )}
    </Translation>
  );
};
