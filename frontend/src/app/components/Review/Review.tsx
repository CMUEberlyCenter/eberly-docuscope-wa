import { FC, useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import logo from "../../assets/logo.svg";
import { useSettings } from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";


export const Review: FC = () => {
  const { t } = useTranslation('review');
  const settings = useSettings();
  const [showWritingTask, setShowWritingTask] = useState(false);
  const writingTask = useWritingTask(); // TODO writingTask.next(...)

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
        <div className="p-2 flex-grow-1 overflow-auto">
          User writing
        </div>
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
                {t("tool.button.view.title")}
              </Button>
            )}
          </Card.Footer>
          {/* TODO non-editor linked task viewer */}
        </Card>
      </aside>
    </Split>)
};