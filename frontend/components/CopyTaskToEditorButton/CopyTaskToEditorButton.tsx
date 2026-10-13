import { WritingTask } from "#/lib/WritingTask";
import { FC } from "react";
import { Button, ButtonProps } from "react-bootstrap";
import sanitizeHtml from "sanitize-html";
import { Node, Transforms } from "slate";
import { useSlate } from "slate-react";

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

/**
 * Button component for copying a writing task to the Slate editor.
 * @example
 * ```tsx
 * <CopyTaskToEditorButton task={task} includeDetails={true} />
 * ```
 * @param props Bootstrap Button properties, plus:
 * - `task`: The writing task JSON to copy to the editor.
 * - `includeDetails`: Whether to include rule descriptions in the copied text.
 * @returns A Button component that copies the writing task to the Slate editor when clicked.
 */
export const CopyTaskToEditorButton: FC<
  ButtonProps & {
    /** The writing task JSON to copy to the editor. */
    task: Optional<WritingTask>;
    /** Whether to include rule descriptions in the copied text. */
    includeDetails?: boolean;
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
