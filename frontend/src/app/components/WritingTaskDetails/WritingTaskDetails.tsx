import { FC, useCallback, useState } from "react";
import { Button, Form, Modal, ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import sanitizeHtml from "sanitize-html";
import { Node, Transforms } from "slate";
import { useSlate } from "slate-react";
import { WritingTask } from "../../../lib/WritingTask";
import { useWritingTask } from "../../service/writing-task.service";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";

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

/** Serialize to text for the clipboard. */
const taskToClipboard = (task: WritingTask | null, includeDetails: boolean): string => {
  if (!task) return "";
  const lines = includeDetails ? [task.rules.overview] : [];
  lines.push(...task.rules.rules.flatMap((rule) => [rule.name, ...includeDetails ? [descriptionToSlate(rule.description)] : [],
  ...rule.children.flatMap((cluster) => ['\t' + cluster.name, ...includeDetails ? [descriptionToSlate(cluster.description)] : []])]));
  return lines.join("\n\n");
}

// type ModalProps = {
//   /** if the modal is visible. */
//   show: boolean;
//   /** Callback for when */
//   onHide: () => void;
// };
/**
 * Modal dialog component for viewing the outline of the writing task.
 * @argument show
 * @argument "onHide" callback to call on hiding the modal.
 * @returns
 */
const WritingTaskDetails: FC<ModalProps> = ({ show, onHide, ...props }) => {
  const { t } = useTranslation();
  const writingTask = useWritingTask();
  // const [selected, setSelected] = useState<Rule | null>(null);
  const [includeDetails, setIncludeDetails] = useState(false);
  const editor = useSlate();
  const insert = useCallback(() => {
    if (writingTask) {
      Transforms.insertNodes(editor, taskToEditor(writingTask, includeDetails));
      onHide && onHide();
    }
  }, [editor, writingTask, includeDetails]);

  return (
    <Modal show={show} onHide={onHide} size="lg" {...props}>
      <Modal.Header closeButton className="py-1">
        <Modal.Title>
          <WritingTaskTitle />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <WritingTaskRulesTree style={{ maxHeight: "70vh" }} />
      </Modal.Body>
      <Modal.Footer>
        <Form.Check
          type="checkbox"
          label={t("details.include")}
          disabled={!writingTask}
          checked={includeDetails}
          onChange={() => setIncludeDetails(!includeDetails)}
        />
        <Button
          variant="secondary"
          disabled={!writingTask}
          onClick={async () => await navigator.clipboard.writeText(taskToClipboard(writingTask, includeDetails))}
        >
          {t("clipboard")}
        </Button>
        <Button variant="dark" disabled={!writingTask} onClick={insert}>
          {t("details.insert")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default WritingTaskDetails;
