import { FC } from "react";
import { Button, ButtonProps } from "react-bootstrap";
import sanitizeHtml from "sanitize-html";
import { Node, Transforms } from "slate";
import { useSlate } from "slate-react";
import { Optional } from "../../src";
import { WritingTask } from "../../src/lib/WritingTask";

/** Serialization of an html string. */
const descriptionToSlate = (description: string): string => {
  // TODO add markings.
  return sanitizeHtml(description, { allowedTags: [] });
};

/** Transform writing task json to Slate editor content. */
const taskToEditor = (task: WritingTask, details?: boolean): Node[] => [
  // { type: "heading-one", children: [{ text: task.info.name }] },
  ...(details
    ? [{ type: "paragraph", children: [{ text: task.rules.overview }] }]
    : []),
  ...task.rules.rules.flatMap((rule) => [
    {
      type: "heading-five",
      children: [{ text: rule.name }],
    },
    ...(details
      ? [
          {
            type: "paragraph",
            children: [{ text: descriptionToSlate(rule.description) }],
          },
        ]
      : []),
    ...rule.children.flatMap((child) => [
      { type: "heading-six", children: [{ text: child.name }] },
      ...(details
        ? [
            {
              type: "paragraph",
              children: [{ text: descriptionToSlate(child.description) }],
            },
          ]
        : []),
    ]),
  ]),
];

/** Button component for copying a writing task to the Slate editor. */
export const CopyTaskToEditorButton: FC<
  ButtonProps & {
    task: Optional<WritingTask>;
    includeDetails?: boolean;
    label?: string;
  }
> = ({ task, disabled, includeDetails, onClick, children, ...props }) => {
  const editor = useSlate();
  return (
    <Button
      disabled={!task || disabled}
      onClick={(evt) => {
        if (task) {
          Transforms.insertNodes(editor, taskToEditor(task, includeDetails));
        }
        onClick?.(evt);
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
