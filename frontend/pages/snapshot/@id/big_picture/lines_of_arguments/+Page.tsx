import {
  LinesOfArguments,
  LinesOfArgumentsSnapshotProvider,
} from "#components/Review/LinesOfArguments";
import { isEnabled } from "#lib/WritingTask";
import { FC } from "react";
import { Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses, task, tool_config } = useData<Data>();
  const { settings } = usePageContext();
  const { t } = useTranslation("review");
  // Following is to deny access to the Lines of Arguments tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.lines_of_arguments) {
    return (<Alert variant="danger">{t("lines_of_arguments.server_deny")}</Alert>);
  }
  if (task && !isEnabled(task, "lines_of_arguments")) {
    return (<Alert variant="danger">{t("lines_of_arguments.writing_task_deny")}</Alert>);
  }
  if (!tool_config.includes("lines_of_arguments")) {
    return (<Alert variant="danger">{t("lines_of_arguments.writing_task_deny")}</Alert>);
  }
  return (
    <LinesOfArgumentsSnapshotProvider snapshotId={id} analyses={analyses}>
      <LinesOfArguments />
    </LinesOfArgumentsSnapshotProvider>
  );
};
