import { FC, useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Navbar,
  Placeholder,
  Stack,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Split from "react-split";
import { isReview } from "../../../server/model/review";
import { useReview } from "../../service/review.service";
import { useWritingTask } from "../../service/writing-task.service";
import { Arguments } from "./Arguments";
import { GlobalCoherence } from "./GlobalCoherence";
import { KeyIdeas } from "./KeyIdeas";
import { Organization } from "./Organization";
import { Sentences } from "./Sentences";
import TaskViewer from "./TaskViewer";
import { Logo } from "../Logo/Logo";

export const Review: FC = () => {
  const { t } = useTranslation("review");
  const { t: tt } = useTranslation();
  // const settings = useSettings();
  const review = useReview();
  const [showWritingTask, setShowWritingTask] = useState(false);
  const writingTask = useWritingTask();
  const [tool, setTool] = useState("");
  const [prose, setProse] = useState<string>("");
  useEffect(() => {
    window.document.title = t("document.title");
  }, [t]);
  useEffect(() => {
    if (isReview(review)) {
      const ontopic_doc = review.analysis.find(
        (analysis) => analysis.tool === "ontopic"
      )?.response.html;
      if (ontopic_doc && ["sentences", "organization"].includes(tool)) {
        setProse(ontopic_doc);
      } else {
        setProse(review.document);
      }
    } else {
      setProse("");
    }
  }, [review, tool]);

  /* <!-- TODO limit tool availability based on writing task/settings --> */
  const sentencesFeature = true;
  const coherenceFeature = true;
  const ideasFeature = true;
  const impressionsFeature = false;
  const argumentsFeature = true;
  const expectationsFeature = false; // moving to own
  const organizationFeature = true;

  return (
    <Split
      className="container-fluid h-100 w-100 d-flex flex-row"
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
        {typeof review !== "object" ? (
          <Placeholder></Placeholder>
        ) : (
          <div
            className="p-2 flex-grow-1 overflow-auto"
            dangerouslySetInnerHTML={{ __html: prose }}
          />
        )}
      </main>
      <aside>
        <Card className="h-100 w-100">
          <Card.Header>
            <div className="d-flex justify-content-between">
              <Card.Title>{t("title")}</Card.Title>
              <Logo/>
            </div>
            <Form.Select
              aria-label={t("select_tool")}
              value={tool}
              onChange={(e) => setTool(e.target.value)}
            >
              <option>{t("null.title")}</option>
              {sentencesFeature && (
                <option value="sentences">{t("sentences.title")}</option>
              )}
              {coherenceFeature && (
                <option value="global_coherence">
                  {t("global_coherence.title")}
                </option>
              )}
              {ideasFeature && (
                <option value="key_ideas">{t("key_ideas.title")}</option>
              )}
              {argumentsFeature && (
                <option value="arguments">{t("arguments.title")}</option>
              )}
              {expectationsFeature && (
                <option value="expectations">{t("expectations.title")}</option>
              )}
              {organizationFeature && (
                <option value="organization">{t("organization.title")}</option>
              )}
              {impressionsFeature && (
                <option disabled value="impressions">
                  {t("impressions.title")}
                </option>
              )}
            </Form.Select>
          </Card.Header>
          <Card.Body className="h-100 overflow-auto position-relative">
            {!tool && (
              <Stack className="position-absolute start-50 top-50 translate-middle">
                <span className="mx-auto text-center">{t("null.content")}</span>
              </Stack>
            )}
            {tool === "global_coherence" && <GlobalCoherence />}
            {tool === "key_ideas" && <KeyIdeas />}
            {tool === "arguments" && <Arguments />}
            {tool === "sentences" && <Sentences />}
            {tool === "organization" && <Organization />}
          </Card.Body>
          <Card.Footer>
            {writingTask && (
              <Button
                variant="outline-dark"
                onClick={() => setShowWritingTask(!showWritingTask)}
              >
                {tt("tool.button.view.title")}
              </Button>
            )}
          </Card.Footer>
        </Card>
        <TaskViewer
          show={showWritingTask}
          onHide={() => setShowWritingTask(false)}
        />
      </aside>
    </Split>
  );
};
