import classNames from "classnames";
import { FC, HTMLProps, useId, useState } from "react";
import { Button } from "react-bootstrap";
import { Translation } from "react-i18next";
import OutlineDrawerIcon from "../../assets/icons/wtd_library.svg?react";
import {
  useSelectTaskAvailable,
  useWritingTask,
} from "../../service/writing-task.service";
import SelectWritingTask from "../SelectWritingTask/SelectWritingTask";
import WritingTaskDetails from "../WritingTaskDetails/WritingTaskDetails";

/** Component for displaying the title of the globally selected outline. */
export const WritingTaskButton: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const writingTask = useWritingTask();
  const selectAvailable = useSelectTaskAvailable();
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
              {selectAvailable && (
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
          {selectAvailable && !writingTask && (
            <Button
              variant="primary"
              aria-controls={selectId}
              onClick={() => setShowSelect(!showSelect)}
            >
              {t("select_task.title")}
            </Button>
          )}
          {!selectAvailable && !writingTask && (
            <h6 className="mb-1">{t("editor.menu.no_task")}</h6>
          )}
          <WritingTaskDetails
            id={taskId}
            show={showTask}
            onHide={() => setShowTask(false)}
          />
          {selectAvailable ? (
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
