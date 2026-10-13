import { WritingTask } from "#/lib/WritingTask";
import { FC } from "react";
import { Button, ButtonProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import sanitizeHtml from "sanitize-html";

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

/**
 * Button component for copying a writing task to the clipboard.
 * ```tsx
 * <CopyTaskToClipboardButton task={task} includeDetails={true} />
 * ```
 */
export const CopyTaskToClipboardButton: FC<
  {
    /** The writing task JSON to copy to the clipboard. */
    task: Optional<WritingTask>;
    /** Whether to include rule descriptions in the copied text. */
    includeDetails: boolean;
  } & ButtonProps
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
