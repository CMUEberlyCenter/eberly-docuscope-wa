import { FC } from "react";
import { Stack, StackProps } from "react-bootstrap";
import { Translation } from "react-i18next";
import { useWritingTask } from "../../service/writing-task.service";

export const WritingTaskTitle: FC<StackProps> = (props) => {
  const writingTask = useWritingTask();

  return (
    <Translation>
      {(t) => (
        <Stack {...props}>
          <span className="mb-0 text-muted" style={{ fontSize: "75%" }}>
            {t("editor.menu.task")}
          </span>
          <h6>{writingTask?.info.name ?? t("editor.menu.no_task")}</h6>
        </Stack>
      )}
    </Translation>
  );
};
