import { FC, useState } from "react";
import { Alert, Button, Card, Form, Navbar, Placeholder } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import logo from "../../assets/logo.svg";
import { useReview } from "../../service/review.service";
import { useSettings } from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";
import TaskViewer from "./TaskViewer";


export const Review: FC = () => {
  const { t } = useTranslation('review');
  const { t: tt } = useTranslation();
  const settings = useSettings();
  const review = useReview();
  const [showWritingTask, setShowWritingTask] = useState(false);
  const writingTask = useWritingTask();

  /* <!-- TODO limit tool availability based on writing task/settings --> */
  const sentencesFeature = true;
  const coherenceFeature = true;
  const ideasFeature = true;
  const impressionsFeature = false;
  const argumentsFeature = true;
  const expectationsFeature = true;
  const organizationFeature = true;

  return (
    <Split className="container-fluid h-100 v-100 d-flex flex-row"
      sizes={[60, 40]}
      minSize={[400, 320]}
      expandToMin={true}
    >
      <main className="d-flex overflow-none h-100 flex-column">
        <Navbar>
          {/* TODO add assignment and user info. */}
          <div className="ms-3">
            <h6 className="mb-0 text-muted">{tt("editor.menu.task")}</h6>
            <h5>{writingTask?.info.name ?? tt("editor.menu.no_task")}</h5>
          </div>
        </Navbar>
        {typeof review !== 'object' ?
          <Placeholder></Placeholder> :
          <div className="p-2 flex-grow-1 overflow-auto" dangerouslySetInnerHTML={{ __html: review?.document ?? '' }} />}
      </main>
      <aside>
        <Card className="h-100 w-100">
          <Card.Header>
            <div className="d-flex justify-content-between">
              <Card.Title>
                {t('title')}
              </Card.Title>
              <img
                style={{ height: "1.75em" }}
                src={logo}
                alt={settings.brand ?? "onTopic"}
              />
            </div>
            <Form.Select aria-label={t('select_tool')}>
              {sentencesFeature &&
                <option value="sentences">
                  {t('sentences.title')}
                </option>}
              {coherenceFeature && <option value="global_coherence">
                {t('global_coherence.title')}
              </option>}
              {ideasFeature && <option value="key_ideas">
                {t('key_ideas.title')}
              </option>}
              {argumentsFeature && <option value="arguments">
                {t('arguments.title')}
              </option>}
              {expectationsFeature && <option value="expectations">
                {t('expectations.title')}
              </option>}
              {organizationFeature && <option value="organization">
                {t('organization.title')}
              </option>}
              {impressionsFeature && (
                <option value="impressions">
                  {t('impressions.title')}
                </option>
              )}
            </Form.Select>
          </Card.Header>
          <Card.Body className="h-100 overflow-auto">
            <Alert variant="warning">TBD</Alert>
          </Card.Body>
          <Card.Footer>
            {writingTask && (
              <Button variant="outline-dark" onClick={() => setShowWritingTask(!showWritingTask)}>
                {tt("tool.button.view.title")}
              </Button>
            )}
          </Card.Footer>
          {/* TODO non-editor linked task viewer */}
        </Card>
        <TaskViewer show={showWritingTask} onHide={() => setShowWritingTask(false)} />
      </aside>
    </Split>)
};