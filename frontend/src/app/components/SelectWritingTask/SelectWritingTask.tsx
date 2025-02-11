import { faArrowLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import {
  Button,
  CloseButton,
  Form,
  ListGroup,
  Modal,
  ModalProps,
  OverlayTrigger,
  Popover,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Transforms } from "slate";
import { useSlate } from "slate-react";
import { WritingTask, isWritingTask } from "../../../lib/WritingTask";
import { useLti, useLtiInfo } from "../../service/lti.service";
import {
  taskToClipboard,
  taskToEditor,
  useWritingTask,
  writingTask,
} from "../../service/writing-task.service";
import { WritingTaskFilter } from "../WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "../WritingTaskInfo/WritingTaskInfo";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";

/**
 * A modal dialog for selecting and displaying meta information about a writing task.
 * @param param0.show if true, show the modal.
 * @param param0.onHide callback to execute when modal is closed.
 * @returns
 */
const SelectWritingTask: FC<ModalProps> = ({ show, onHide, ...props }) => {
  const { t } = useTranslation();
  // const { data: writingTasks } = useWritingTasks(); // all public tasks
  const writing_task = useWritingTask(); // current task
  const inLti = useLti(); // in LTI context
  const ltiInfo = useLtiInfo(); // Information from LTI
  const [selected, setSelected] = useState<WritingTask | null>(writing_task);
  useEffect(() => setSelected(writing_task), [writing_task]);
  const [valid, setValid] = useState(true); // Uploaded file validity
  const [custom, setCustom] = useState<WritingTask | null>(null);
  useEffect(() => setCustom(ltiInfo?.writing_task ?? null), [ltiInfo]);
  const [showFile, setShowFile] = useState(false);
  const [data, setData] = useState<WritingTask[]>([]); // filtered list of tasks.
  const [showDetails, setShowDetails] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(false);


  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        const content = await files[0].text();
        const json = JSON.parse(content);
        if (isWritingTask(json)) {
          setValid(true);
          setCustom(json);
          setSelected(json);
          setShowFile(false);
        } else {
          setValid(false);
        }
      } catch (err) {
        // expecting JSON parser error.
        // TODO provide error message to invalid text.
        setValid(false);
        console.error(err);
      }
    }
  };

  const hide = useCallback(() => {
    setShowDetails(false);
    setSelected(null);
    onHide?.();
  }, [onHide]);
  const commit = useCallback(() => {
    writingTask.next(selected);
    hide();
  }, [hide, selected]);
  const editor = useSlate();
  const insert = useCallback(() => {
    if (selected) {
      Transforms.insertNodes(editor, taskToEditor(selected, includeDetails));
      commit();
    }
  }, [editor, selected, includeDetails, commit]);

  return (
    <Modal show={show} onHide={hide} size="xl" {...props}>
      <Modal.Header closeButton>
        {showDetails ? <Button variant="secondary" onClick={() => setShowDetails(false)} className="me-5"><FontAwesomeIcon icon={faArrowLeft} /></Button> : null}
        {t("select_task.title")}
        {showDetails && selected ? <WritingTaskTitle task={selected} className="ms-5" /> : null}
      </Modal.Header>
      <Modal.Body>
        {showDetails && selected ? <WritingTaskRulesTree style={{ maxHeight: "72vh", height: "72vh" }} task={selected} /> : <div
          className="d-flex flex-row align-items-stretch position-relative gap-3"
          style={{ maxHeight: "75vh", height: "75vh" }}
        >
          <WritingTaskFilter className="w-100" update={setData} />
          <div className="w-100 h-0">
            <ListGroup className="overflow-auto w-100 mh-100">
              {data.map((task) => (
                <ListGroup.Item
                  key={task.info.name}
                  active={selected === task}
                  action
                  onClick={() => setSelected(task)}
                >
                  {task.info.name}
                </ListGroup.Item>
              ))}
              {custom && (
                <ListGroup.Item
                  action
                  active={selected === custom}
                  onClick={() => setSelected(custom)}
                >
                  {custom.info.name}
                </ListGroup.Item>
              )}
              <ListGroup.Item
                action
                variant="warning"
                onClick={() => setSelected(null)}
              >
                {t("select_task.null")}
              </ListGroup.Item>
            </ListGroup>
          </div>
          <div className="w-100 h-0">
            <WritingTaskInfo task={selected} />
          </div>
        </div>
        }
      </Modal.Body>
      {showDetails ? (
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
            onClick={async () =>
              await navigator.clipboard.writeText(
                taskToClipboard(selected, includeDetails)
              )
            }
          >
            {t("clipboard")}
          </Button>
          <Button variant="secondary" disabled={!writingTask} onClick={insert}>
            {t("select_insert")}
          </Button>
          <Button variant="primary" disabled={!selected} onClick={commit}>
            {t("select")}
          </Button>
        </Modal.Footer>
      ) : (
        <Modal.Footer>
          {(!inLti || ltiInfo?.instructor) && (
            <OverlayTrigger
              onToggle={(nextShow) => setShowFile(nextShow)}
              show={showFile}
              trigger="click"
              placement="top"
              overlay={
                <Popover>
                  <Popover.Header className="d-flex justify-content-between">
                    <div>{t("select_task.upload")}</div>
                    <CloseButton onClick={() => setShowFile(false)} />
                  </Popover.Header>
                  <Popover.Body>
                    <Form noValidate>
                      <Form.Group>
                        <Form.Control
                          type="file"
                          onChange={onFileChange}
                          isInvalid={!valid}
                        />
                        <Form.Control.Feedback type="invalid">
                          {t("select_task.invalid_upload")}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Form>
                  </Popover.Body>
                </Popover>
              }
            >
              <Button className="me-auto">
                <FontAwesomeIcon icon={faPlus} />
              </Button>
            </OverlayTrigger>
          )}
          <Button variant="secondary" onClick={hide}>
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => {
              setShowDetails(true);
            }}
          >
            {t("next")}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};
export default SelectWritingTask;
