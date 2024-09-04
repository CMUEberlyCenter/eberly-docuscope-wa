import { FC, useCallback, useState } from "react";
import { Button, Form, ListGroup, Modal } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import sanitizeHtml from "sanitize-html";
import { Node, Transforms } from "slate";
import { useSlate } from "slate-react";
import { Rule, WritingTask } from "../../../lib/WritingTask";
import { useWritingTask } from "../../service/writing-task.service";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import "./WritingTaskDetails.scss";

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

type ModalProps = {
  show: boolean;
  onHide: () => void;
};
/**
 * Modal dialog for viewing the outline of the writing task.
 * @param param0
 * @returns
 */
const WritingTaskDetails: FC<ModalProps> = ({ show, onHide }) => {
  const { t } = useTranslation();
  const writingTask = useWritingTask();
  const [selected, setSelected] = useState<Rule | null>(null);
  const [includeDetails, setIncludeDetails] = useState(false);
  const editor = useSlate();
  const insert = useCallback(() => {
    if (writingTask) {
      Transforms.insertNodes(editor, taskToEditor(writingTask, includeDetails));
      onHide();
    }
  }, [editor, writingTask, includeDetails]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton className="py-1">
        <Modal.Title>
          <WritingTaskTitle />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div
          className="d-flex flex-row align-items-stretch gap-3 position-relative"
          style={{ maxHeight: "70vh" }}
        >
          <div className="h-0 overflow-auto">
            <ListGroup className="writing-task-tree">
              {writingTask?.rules.rules.map((rule) => (
                <ListGroup.Item
                  action
                  as="div"
                  key={`${rule.name}`}
                  aria-expanded="true"
                  active={selected === rule}
                >
                  <div className="d-flex">
                    <Button
                      size="sm"
                      variant="none"
                      className="expand-toggle"
                      onClick={(e) => {
                        const p = e.currentTarget.closest("[aria-expanded]");
                        p?.setAttribute(
                          "aria-expanded",
                          p.getAttribute("aria-expanded") === "true"
                            ? "false"
                            : "true"
                        );
                      }}
                    >
                      <i className="fa-solid fa-caret-down flex-shrink-0"></i>
                    </Button>
                    <div
                      className="fw-bold flex-grow-1 pointer"
                      onClick={() =>
                        setSelected(rule === selected ? null : rule)
                      }
                    >
                      {rule.name}
                    </div>
                  </div>
                  <div className="expanded">
                    <ListGroup>
                      {rule.children.map((cluster) => (
                        <ListGroup.Item
                          action
                          key={cluster.name}
                          className="pointer"
                          active={cluster === selected}
                          onClick={() =>
                            setSelected(cluster === selected ? null : cluster)
                          }
                        >
                          {cluster.name}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
          <div className="container-fluid rounded bg-light p-3 h-0 overflow-auto">
            {!selected && (
              <>
                <h5>
                  {writingTask?.info.name}{" "}
                  <span className="text-muted">{t("details.overview")}</span>
                </h5>
                <p>{writingTask?.rules.overview}</p>
              </>
            )}
            {selected && (
              <>
                <h6>{t("details.about")}</h6>
                <h5>{selected.name}</h5>
                <div
                  dangerouslySetInnerHTML={{ __html: selected.description }}
                />
              </>
            )}
          </div>
        </div>
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
          onClick={() => console.log("TODO")}
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
