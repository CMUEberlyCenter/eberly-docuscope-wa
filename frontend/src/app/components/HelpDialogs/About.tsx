import { FC } from "react";
import { Card, ListGroup, Modal } from "react-bootstrap";
import { showAbout, useShowAbout } from "../../service/help.service";
import { useScribeAvailable } from "../../service/scribe.service";
import { useSettings } from "../../service/settings.service";
import {
  useWritingTask,
  useWritingTasks,
} from "../../service/writing-task.service";

/** Modal for displaying information about the application. */
export const About: FC = () => {
  const show = useShowAbout();
  const { isLoading } = useWritingTasks();
  const writingTask = useWritingTask();
  const ScribeAvailable = useScribeAvailable();
  const settings = useSettings();

  return (
    <Modal show={show} onHide={() => showAbout(false)} scrollable>
      <Modal.Header closeButton>About {settings.brand}</Modal.Header>
      <Modal.Body>
        <p>
          {ScribeAvailable ? (
            <>
              <a href="https://www.cmu.edu/corecompetencies/communication/resources-and-tools/docuscope/index.html">
                {settings.brand}
              </a>{" "}
              is an environment for structuring writing tasks with the help of
              generative artificial intelligence.
            </>
          ) : (
            <>
              DocuScope is a text analysis environment with a suite of
              interactive visualization tools for corpus-based rhetorical
              analysis. The DocuScope Project began in 1998 as a result of
              collaboration between David Kaufer and Suguru Ishizaki at Carnegie
              Mellon University. David created what we call the generic
              (default) dictionary, consisting of over 40 million linguistic
              patterns of English classified into over 100 categories of
              rhetorical effects.
            </>
          )}
        </p>

        <hr />

        <Card>
          <Card.Header>Application Information</Card.Header>
          <ListGroup variant="flush">
            <ListGroup.Item>Version: {__APP_VERSION__}</ListGroup.Item>
            <ListGroup.Item>
              Date: {new Date(__BUILD_DATE__).toLocaleString()}
            </ListGroup.Item>
          </ListGroup>
        </Card>

        <hr />

        <Card>
          <Card.Header>Expectations Details</Card.Header>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <ListGroup variant="flush">
              <ListGroup.Item>
                Name: {writingTask?.info.name ?? "unassigned"}
              </ListGroup.Item>
              <ListGroup.Item>
                Version: {writingTask?.info.version ?? "0.0.0"}
              </ListGroup.Item>
              <ListGroup.Item>
                Author: {writingTask?.info.author ?? "unassigned"}
              </ListGroup.Item>
              <ListGroup.Item>
                Copyright:{" "}
                {writingTask && <>&copy; {writingTask?.info.copyright}</>}
              </ListGroup.Item>
              <ListGroup.Item>
                Saved:{" "}
                {writingTask?.info.saved
                  ? new Date(writingTask.info.saved).toLocaleDateString()
                  : "true"}
              </ListGroup.Item>
            </ListGroup>
          )}
        </Card>
      </Modal.Body>
    </Modal>
  );
};
