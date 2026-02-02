import { FC } from "react";
import { Button, ButtonProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import sanitizeHtml from "sanitize-html";
import { Optional } from "../../src";
import { WritingTask } from "../../src/lib/WritingTask";

/** Serialize to text for the clipboard. */
const taskToClipboard = (
  task: Optional<WritingTask>,
  includeDetails: boolean
): string => {
  if (!task) return "";
  const lines = includeDetails ? [task.rules.overview] : [];
  lines.push(
    ...task.rules.rules.flatMap((rule) => [
      rule.name,
      ...(includeDetails
        ? [sanitizeHtml(rule.description, { allowedTags: [] })]
        : []),
      ...rule.children.flatMap((cluster) => [
        "\t" + cluster.name,
        ...(includeDetails
          ? [sanitizeHtml(cluster.description, { allowedTags: [] })]
          : []),
      ]),
    ])
  );
  return lines.join("\n\n");
};

/** Button component for copying a writing task to the clipboard. */
export const CopyTaskToClipboardButton: FC<
  ButtonProps & {
    task: Optional<WritingTask>;
    includeDetails: boolean;
  }
> = ({ task, includeDetails, disabled, onClick, ...props }) => {
  const { t } = useTranslation();
  return (
    <Button
      disabled={!task || disabled}
      onClick={async (evt) => {
        await navigator.clipboard.writeText(
          taskToClipboard(task, includeDetails)
        );
        onClick?.(evt);
      }}
      {...props}
    >
      {t("clipboard")}
    </Button>
  );
};
