import { FC, useCallback, useState } from "react";
import { Button, ListGroup, Modal, ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Rule } from "../../../lib/WritingTask";
import { useWritingTask } from "../../service/writing-task.service";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import "./SelectExpectation.scss";

type SelectExpectationProps = ModalProps & { select?: (rule: Rule) => void };
const SelectExpectation: FC<SelectExpectationProps> = ({
  onHide,
  select,
  ...props
}) => {
  const { t } = useTranslation();
  const writingTask = useWritingTask();
  const [selected, setSelected] = useState<Rule | null>(null);
  // need only expectation selection
  const onSelect = useCallback(() => {
    if (select && selected) select(selected);
    if (onHide) onHide();
  }, [select, onHide, selected]);

  return (
    <Modal onHide={onHide} {...props} size="lg">
      <Modal.Header closeButton className="bg-light">
        {t("expectation.title")}
      </Modal.Header>
      <Modal.Body>
        <div
          className="d-flex flex-row align-items-stretch position-relative gap-3"
          style={{ maxHeight: "70vh" }}
        >
          <div className="w-100 h-0 overflow-auto">
            <WritingTaskTitle />
            <ListGroup className="expectation-tree">
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
                      // onClick={() =>
                      //   setSelected(rule === selected ? null : rule)
                      // }
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
        <Button onClick={onHide}>{t("cancel")}</Button>
        <Button variant="dark" onClick={onSelect}>
          {t("select")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectExpectation;
