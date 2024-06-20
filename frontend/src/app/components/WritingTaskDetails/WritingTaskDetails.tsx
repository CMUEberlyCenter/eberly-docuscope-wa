import { FC, useState } from "react";
import { Button, Card, Col, Container, ListGroup, Modal, Row, Stack } from "react-bootstrap";
import { Rule } from "../../../lib/WritingTask";
import { useWritingTask } from "../../service/writing-task.service";
import './WritingTaskDetails.scss';

type ModalProps = {
  show: boolean;
  onHide: () => void;
};
const WritingTaskDetails: FC<ModalProps> = ({ show, onHide }) => {
  const writingTask = useWritingTask();
  const [selected, setSelected] = useState<Rule | null>(null);

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {writingTask?.info.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            <Col>
              <ListGroup className="writing-task-tree">
                {writingTask?.rules.rules.map((rule) => (
                  <ListGroup.Item action as="div" key={`${rule.name}`}
                    aria-expanded="true"
                    active={selected === rule}>
                    <div className="d-flex">
                      <Button size="sm" variant="none" className="expand-toggle"
                        onClick={(e) => {
                          const p = e.currentTarget.closest("[aria-expanded]");
                          p?.setAttribute("aria-expanded", p.getAttribute("aria-expanded") === "true" ? "false" : "true");
                        }}>
                        <i className="fa-solid fa-caret-down flex-shrink-0"></i>
                      </Button>
                      <div className="fw-bold flex-grow-1 pointer" onClick={() => setSelected(rule === selected ? null : rule)}>
                        {rule.name}
                      </div>
                    </div>
                    <div className="expanded">
                      <ListGroup>
                        {rule.children.map((cluster) => (
                          <ListGroup.Item action key={cluster.name}
                            className="pointer"
                            active={cluster === selected}
                            onClick={() => setSelected(cluster === selected ? null : cluster)}>
                            {cluster.name}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Col>
            <Col>
              <Stack direction="vertical">
                <Card>
                  <Card.Body>
                    <Card.Title>{writingTask?.info.name}</Card.Title>
                    <Card.Text>{writingTask?.rules.overview}</Card.Text>
                  </Card.Body>
                </Card>
                {selected && <Card>
                  <Card.Body>
                    <Card.Title>{selected.name}</Card.Title>
                    <Card.Text dangerouslySetInnerHTML={{ __html: selected.description }} />
                  </Card.Body>
                </Card>}
              </Stack>
            </Col>
          </Row>
        </Container>
      </Modal.Body>
    </Modal>
  );
};
export default WritingTaskDetails;