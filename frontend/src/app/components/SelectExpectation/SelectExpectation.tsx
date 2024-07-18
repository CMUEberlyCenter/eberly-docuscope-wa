import { FC, useCallback, useState } from "react";
import { useWritingTask } from "../../service/writing-task.service";
import {
  Button,
  Card,
  Col,
  Container,
  ListGroup,
  Modal,
  ModalProps,
  Row,
  Stack,
} from "react-bootstrap";
import "./SelectExpectation.scss";
import { Rule } from "../../../lib/WritingTask";
import { useTranslation } from "react-i18next";

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
    <Modal onHide={onHide} {...props} size="lg" scrollable>
      <Modal.Header closeButton>{t("expectation.title")}</Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            <Col>
              <Card>
                <Card.Body className="overflow-auto">
                  <Card.Subtitle>{t("expectation.task")}</Card.Subtitle>
                  <Card.Title>{writingTask?.info.name}</Card.Title>
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
                              const p =
                                e.currentTarget.closest("[aria-expanded]");
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
                                  setSelected(
                                    cluster === selected ? null : cluster
                                  )
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
                </Card.Body>
              </Card>
            </Col>
            <Col>
              <Stack direction="vertical">
                <Card>
                  <Card.Body>
                    <Card.Title>{writingTask?.info.name}</Card.Title>
                    <Card.Text>{writingTask?.rules.overview}</Card.Text>
                  </Card.Body>
                </Card>
                {selected && (
                  <Card>
                    <Card.Body>
                      <Card.Title>{selected.name}</Card.Title>
                      <Card.Text
                        dangerouslySetInnerHTML={{
                          __html: selected.description,
                        }}
                      />
                    </Card.Body>
                  </Card>
                )}
              </Stack>
            </Col>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>{t("cancel")}</Button>
        <Button onClick={onSelect}>{t("select")}</Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectExpectation;
