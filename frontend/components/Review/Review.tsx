import { trackScreenView } from "#/client/tracking";
import { isEnabled } from "#/lib/WritingTask";
import {
  BigPictureButtonToolbar,
  BigPictureTool,
} from "#components/ReviewNavigation/BigPictureButtonToolbar.tsx";
import {
  FineTuningButtonToolbar,
  FineTuningTool,
} from "#components/ReviewNavigation/FineTuningButtonToolbar.tsx";
import { Activity, type FC, useEffect, useState, useTransition } from "react";
import { Alert, Tab, Tabs } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";
import { useFileText } from "../FileUpload/FileTextContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { Expectations, ExpectationsDataProvider } from "./Expectations";
import {
  LinesOfArguments,
  LinesOfArgumentsReviewProvider,
} from "./LinesOfArguments";
import { LogicalFlow, LogicalFlowReviewProvider } from "./LogicalFlow";
import { NullTool } from "./NullTool";
import {
  ParagraphClarity,
  ParagraphClarityReviewProvider,
} from "./ParagraphClarity";
import {
  ProfessionalTone,
  ProfessionalToneReviewProvider,
} from "./ProfessionalTone";
import {
  ProminentTopics,
  ProminentTopicsReviewProvider,
} from "./ProminentTopics";
import "./Review.scss";
import { Sentences, SentencesDataProvider } from "./Sentences";
import { Sources, SourcesReviewProvider } from "./Sources";
import {
  OrganizationDataProvider,
  TopicalProgression,
} from "./TopicalProgression";

// tab event keys
type TabKey = "big_picture" | "fine_tuning";
// tool event keys

/** Top level component for displaying reviews. */
export const Review: FC = () => {
  const { t } = useTranslation("review");
  const [tab, setTab] = useState<TabKey>("big_picture");
  const [tool, setTool] = useState<BigPictureTool | null>(null);
  const [otherTool, setOtherTool] = useState<FineTuningTool | null>(null);
  const [userText] = useFileText();
  const [{ task: writingTask }] = useWritingTask();
  const { settings } = usePageContext();

  const selectTool = (selectedTool: BigPictureTool) => {
    setTool((prev) => (prev === selectedTool ? null : selectedTool));
  };
  useEffect(() => {
    if (tool) {
      trackScreenView({
        screen_name: tool,
        screen_class: "Review",
        task_id: writingTask?.info.id,
      });
    }
  }, [tool, writingTask]);
  const selectOtherTool = (selectedTool: FineTuningTool) => {
    setOtherTool((prev) => (prev === selectedTool ? null : selectedTool));
  };
  useEffect(() => {
    if (otherTool) {
      trackScreenView({
        screen_name: otherTool,
        screen_class: "Review",
        task_id: writingTask?.info.id,
      });
    }
  }, [otherTool, writingTask]);

  // As per #230 most features are available even without a writing task if
  // enabled in settings.  The server settings have priority over writing tasks.
  const expectationsFeature =
    !!settings?.expectations &&
    (!writingTask || isEnabled(writingTask, "expectations"));
  const ideasFeature =
    !!settings?.prominent_topics &&
    (!writingTask || isEnabled(writingTask, "prominent_topics"));
  const argumentsFeature =
    !!settings?.lines_of_arguments &&
    isEnabled(writingTask, "lines_of_arguments");
  const logicalFlowFeature =
    !!settings?.logical_flow &&
    (!writingTask || isEnabled(writingTask, "logical_flow"));
  const paragraphClarityFeature =
    !!settings?.paragraph_clarity &&
    (!writingTask || isEnabled(writingTask, "paragraph_clarity"));
  const professionalToneFeature =
    !!settings?.professional_tone &&
    (!writingTask || isEnabled(writingTask, "professional_tone"));
  const sentencesFeature =
    !!settings?.sentence_density &&
    (!writingTask || isEnabled(writingTask, "sentence_density"));
  const sourcesFeature =
    !!settings?.sources && (!writingTask || isEnabled(writingTask, "sources"));
  const organizationFeature =
    !!settings?.term_matrix &&
    (!writingTask || isEnabled(writingTask, "term_matrix"));
  const bigPictureFeature =
    expectationsFeature ||
    argumentsFeature ||
    ideasFeature ||
    logicalFlowFeature ||
    organizationFeature;
  const fineTuningFeature =
    paragraphClarityFeature ||
    professionalToneFeature ||
    sentencesFeature ||
    sourcesFeature;

  const [isPending, startTransition] = useTransition();
  const ready = !!userText && userText.trim().length > 0 && !isPending;

  useEffect(() => {
    // Reset to default tab/tool if writing task, file, or settings change.
    startTransition(() => {
      setTab(() => "big_picture");
      setTool(() => null);
      setOtherTool(() => null);
    });
  }, [settings, writingTask, userText]);
  return (
    <>
      {!bigPictureFeature && !fineTuningFeature && (
        <NullTool text={t("null.no_writing_task")} />
      )}
      <Tabs
        activeKey={tab}
        aria-disabled={isPending}
        onSelect={(k) => {
          setTab(k as TabKey);
        }}
        variant="underline"
        className="justify-content-around inverse-color"
      >
        {bigPictureFeature ? (
          <Tab
            eventKey="big_picture"
            title={t("tabs.big_picture")}
            className="h-100"
          >
            <div className="h-100 d-flex flex-column overflow-auto">
              <BigPictureButtonToolbar
                activeTool={tool}
                onSelect={selectTool}
                task={writingTask}
                enabled={
                  ready
                    ? [
                        "expectations",
                        "lines_of_arguments",
                        "logical_flow",
                        "prominent_topics",
                        "term_matrix",
                      ]
                    : []
                }
              />
              <Activity mode={!tool ? "visible" : "hidden"}>
                <NullTool text={t("null.big_picture")} />
              </Activity>
              <Activity mode={tool === "expectations" ? "visible" : "hidden"}>
                <ExpectationsDataProvider>
                  <Expectations />
                </ExpectationsDataProvider>
              </Activity>
              {tool === "prominent_topics" && (
                <ProminentTopicsReviewProvider>
                  <ProminentTopics />
                </ProminentTopicsReviewProvider>
              )}
              {tool === "lines_of_arguments" && (
                <LinesOfArgumentsReviewProvider>
                  <LinesOfArguments />
                </LinesOfArgumentsReviewProvider>
              )}
              {tool === "logical_flow" && (
                <LogicalFlowReviewProvider>
                  <LogicalFlow />
                </LogicalFlowReviewProvider>
              )}
              {tool === "topical_progression" && (
                <OrganizationDataProvider>
                  <TopicalProgression />
                </OrganizationDataProvider>
              )}
              {/* Add Big Picture tools here. */}
            </div>
          </Tab>
        ) : null}
        {fineTuningFeature ? (
          <Tab
            eventKey="fine_tuning"
            title={t("tabs.fine_tuning")}
            className="h-100"
          >
            <div className="h-100 d-flex flex-column overflow-auto">
              <FineTuningButtonToolbar
                activeTool={otherTool}
                onSelect={selectOtherTool}
                task={writingTask}
                enabled={
                  ready
                    ? [
                        "paragraph_clarity",
                        "sentence_density",
                        "professional_tone",
                        "sources",
                      ]
                    : []
                }
              />
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <Alert>
                    <Alert.Heading>{t("error.header")}</Alert.Heading>
                    {t("error.content")}
                    {t("error.details", {
                      details: {
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      },
                    })}
                  </Alert>
                )}
              >
                <Activity mode={!otherTool ? "visible" : "hidden"}>
                  <NullTool text={t("null.fine_tuning")} />
                </Activity>
                {otherTool === "sentence_clarity" && (
                  <SentencesDataProvider>
                    <Sentences />
                  </SentencesDataProvider>
                )}
                {otherTool === "paragraph_clarity" && (
                  <ParagraphClarityReviewProvider>
                    <ParagraphClarity />
                  </ParagraphClarityReviewProvider>
                )}
                {otherTool === "professional_tone" && (
                  <ProfessionalToneReviewProvider>
                    <ProfessionalTone />
                  </ProfessionalToneReviewProvider>
                )}
                {otherTool === "sources" && (
                  <SourcesReviewProvider>
                    <Sources />
                  </SourcesReviewProvider>
                )}
                {/* Add more tool displays here. */}
              </ErrorBoundary>
            </div>
          </Tab>
        ) : null}
      </Tabs>
    </>
  );
};
