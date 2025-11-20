import { faArrowLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FC,
} from "react";
import {
  Button,
  CloseButton,
  Form,
  ListGroup,
  Modal,
  OverlayTrigger,
  Popover,
  type ModalProps,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { isWritingTask, type WritingTask } from "../../../lib/WritingTask";
import OutlineDrawerIcon from "../../assets/icons/wtd_library.svg?react";
import { useWritingTasks } from "../../service/writing-task.service";
import {
  useSetWritingTask,
  useWritingTask,
} from "../WritingTaskContext/WritingTaskContext";
import { WritingTaskFilter } from "../WritingTaskFilter/WritingTaskFilter";
import { WritingTaskInfo } from "../WritingTaskInfo/WritingTaskInfo";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";

/** Button component for showing the task viewer. */
export const TaskViewerButton: FC = () => {
  const [show, setShow] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const { t } = useTranslation();
  const id = useId();
  const selectId = useId();
  const { task: writingTask, taskId } = useWritingTask();
  return (
    <div className="d-flex align-items-baseline gap-1 py-1">
      {writingTask && (
        <>
          <span className="text-muted">{t("editor.menu.task")}</span>
          <Button
            variant="secondary"
            onClick={() => setShow(!show)}
            aria-controls={id}
            title={t("tool.button.view.title", {
              title: writingTask.rules.name,
            })}
          >
            {writingTask.rules.name}
          </Button>
          {!taskId && (
            <Button
              variant="secondary"
              onClick={() => setShowSelect(true)}
              aria-controls={selectId}
            >
              <OutlineDrawerIcon height={24} />
              <span className="visually-hidden sr-only">
                {t("select_task.title")}
              </span>
            </Button>
          )}
        </>
      )}
      {!taskId && !writingTask && (
        <Button
          variant="primary"
          aria-controls={selectId}
          onClick={() => setShowSelect(!showSelect)}
        >
          {t("select_task.title")}
        </Button>
      )}
      {taskId && !writingTask && (
        <h6 className="mb-1">{t("editor.menu.no_task")}</h6>
      )}

      <TaskViewer id={id} show={show} onHide={() => setShow(false)} />
      {!taskId && (
        <TaskSelector
          id={selectId}
          show={showSelect}
          onHide={() => setShowSelect(false)}
        />
      )}
    </div>
  );
};

/** Modal component for displaying the outline. */
const TaskViewer: FC<ModalProps> = (props) => {
  const { task } = useWritingTask();
  return (
    <Modal {...props} size="lg">
      <Modal.Header closeButton className="py-1">
        <Modal.Title>
          <WritingTaskTitle task={task} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <WritingTaskRulesTree task={task} style={{ maxHeight: "70vh" }} />
      </Modal.Body>
    </Modal>
  );
};

const TaskSelector: FC<ModalProps> = ({ show, onHide, ...props }) => {
  const { t } = useTranslation();
  const { task } = useWritingTask();
  const { data: tasks } = useWritingTasks();
  const setWritingTask = useSetWritingTask();
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState<WritingTask | null | undefined>(
    task
  );
  const [valid, setValid] = useState(true);
  const [custom, setCustom] = useState<WritingTask | null>(null);
  const [data, setData] = useState<WritingTask[]>([]); // filtered list of tasks.
  const [showFile, setShowFile] = useState(false);
  useEffect(() => setSelected(task), [task]);

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    try {
      const contents = await files[0].text();
      const json = JSON.parse(contents);
      if (isWritingTask(json)) {
        setValid(true);
        setCustom(json);
        setSelected(json);
        setShowDetails(true);
      } else {
        setValid(false);
      }
    } catch (err) {
      setValid(false);
      console.error(err);
    }
  };

  const hide = useCallback(() => {
    setShowDetails(false);
    setSelected(undefined);
    onHide?.();
  }, [onHide]);
  const commit = useCallback(() => {
    setWritingTask({ task: selected });
    hide();
  }, [hide, selected, setWritingTask]);

  return (
    <Modal show={show} onHide={hide} size="xl" {...props}>
      <Modal.Header closeButton>
        {showDetails ? (
          <Button
            variant="secondary"
            onClick={() => setShowDetails(false)}
            className="me-5"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
        ) : null}
        {t("select_task.title")}
        {showDetails && selected ? (
          <WritingTaskTitle task={selected} className="ms-5" />
        ) : null}
      </Modal.Header>
      <Modal.Body>
        {showDetails && selected ? (
          <WritingTaskRulesTree
            style={{ maxHeight: "72vh", height: "72vh" }}
            task={selected}
          />
        ) : (
          <div
            className="d-flex flex-row align-items-stretch position-relative gap-3"
            style={{ maxHeight: "75vh", height: "75vh" }}
          >
            <WritingTaskFilter
              className="w-100"
              update={setData}
              tasks={tasks}
            />
            <div className="w-100 h-0">
              <ListGroup className="overflow-auto w-100 mh-100">
                {data
                  .toSorted((a, b) => a.info.name.localeCompare(b.info.name))
                  .map((task) => (
                    <ListGroup.Item
                      key={task.info.id ?? task.info.name}
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
                  onClick={() => setSelected(undefined)}
                >
                  {t("select_task.null")}
                </ListGroup.Item>
              </ListGroup>
            </div>
            <div className="w-100 h-0">
              <WritingTaskInfo task={selected} />
            </div>
          </div>
        )}
      </Modal.Body>
      {showDetails ? (
        <Modal.Footer>
          <Button variant="primary" disabled={!selected} onClick={commit}>
            {t("select")}
          </Button>
        </Modal.Footer>
      ) : (
        <Modal.Footer>
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
                        onChange={uploadFile}
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
