import type { ReviewTool } from "#/lib/ReviewResponse";
import { isEnabled } from "#/lib/WritingTask";
import { trackScreenView } from "#lib/tracking.js";
import { Activity, type FC, useEffect, useState, useTransition } from "react";
import {
  Alert,
  ButtonToolbar,
  OverlayTrigger,
  Tab,
  Tabs,
  Tooltip,
} from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";
import { useFileText } from "../FileUpload/FileTextContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { CivilTone, CivilToneReviewProvider } from "./CivilTone";
import { Credibility, CredibilityReviewProvider } from "./Credibility";
import {
  Expectations,
  ExpectationsButton,
  ExpectationsDataProvider,
} from "./Expectations";
import {
  LinesOfArguments,
  LinesOfArgumentsButton,
  LinesOfArgumentsReviewProvider,
} from "./LinesOfArguments";
import {
  LogicalFlow,
  LogicalFlowButton,
  LogicalFlowReviewProvider,
} from "./LogicalFlow";
import { NullTool } from "./NullTool";
import {
  Organization,
  OrganizationButton,
  OrganizationDataProvider,
} from "./Organization";
import {
  ParagraphClarity,
  ParagraphClarityButton,
  ParagraphClarityReviewProvider,
} from "./ParagraphClarity";
import {
  ProfessionalTone,
  ProfessionalToneButton,
  ProfessionalToneReviewProvider,
} from "./ProfessionalTone";
import {
  ProminentTopics,
  ProminentTopicsButton,
  ProminentTopicsReviewProvider,
} from "./ProminentTopics";
import "./Review.scss";
import { Sentences, SentencesButton, SentencesDataProvider } from "./Sentences";
import { Sources, SourcesButton, SourcesReviewProvider } from "./Sources";

// tab event keys
type TabKey = "big_picture" | "fine_tuning";
// tool event keys
type Tool = ReviewTool | "sentences" | "organization" | "impressions" | "null";

/** Top level component for displaying reviews. */
export const Review: FC = () => {
  const { t } = useTranslation("review");
  const [tab, setTab] = useState<TabKey>("big_picture");
  const [tool, setTool] = useState<Tool>("null");
  const [otherTool, setOtherTool] = useState<Tool>("null");
  const [userText] = useFileText();
  const [{ task: writingTask }] = useWritingTask();
  const { settings } = usePageContext();
  const ready = !!userText && userText.trim().length > 0;

  const toggleToolHandler =
    (selectedTool: Tool) => (evt: React.MouseEvent<HTMLButtonElement>) => {
      if (!evt.currentTarget.classList.contains("active")) {
        trackScreenView({
          screen_name: selectedTool,
          screen_class: "Review",
          task_id: writingTask?.info.id,
        });
      }
      setTool((prev) => (prev === selectedTool ? "null" : selectedTool));
    };
  const toggleOtherToolHandler =
    (selectedTool: Tool) => (evt: React.MouseEvent<HTMLButtonElement>) => {
      if (!evt.currentTarget.classList.contains("active")) {
        trackScreenView({
          screen_name: selectedTool,
          screen_class: "Review",
          task_id: writingTask?.info.id,
        });
      }
      setOtherTool((prev) => (prev === selectedTool ? "null" : selectedTool));
    };

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
    logicalFlowFeature;
  const fineTuningFeature =
    paragraphClarityFeature ||
    professionalToneFeature ||
    sentencesFeature ||
    sourcesFeature;

  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    // Reset to default tab/tool if writing task, file, or settings change.
    startTransition(() => {
      setTab(() => "big_picture");
      setTool(() => "null");
      setOtherTool(() => "null");
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
              <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
                {expectationsFeature ? (
                  !writingTask && ready ? (
                    <OverlayTrigger
                      placement="bottom"
                      overlay={
                        <Tooltip>
                          {t("instructions:expectations_scope_note")}
                          <hr />
                          {t("expectations.no_writing_task_tooltip")}
                        </Tooltip>
                      }
                    >
                      {/* div required to get tooltip overlay to work. */}
                      <div>
                        <ExpectationsButton disabled={true} />
                      </div>
                    </OverlayTrigger>
                  ) : (
                    <ExpectationsButton
                      disabled={!ready || isPending}
                      active={tool === "expectations"}
                      onClick={toggleToolHandler("expectations")}
                    />
                  )
                ) : null}
                {ideasFeature ? (
                  <ProminentTopicsButton
                    disabled={!ready || isPending}
                    active={tool === "prominent_topics"}
                    onClick={toggleToolHandler("prominent_topics")}
                  />
                ) : null}
                {argumentsFeature ? (
                  <LinesOfArgumentsButton
                    disabled={!ready || isPending}
                    active={tool === "lines_of_arguments"}
                    onClick={toggleToolHandler("lines_of_arguments")}
                  />
                ) : null}
                {logicalFlowFeature ? (
                  <LogicalFlowButton
                    disabled={!ready || isPending}
                    active={tool === "logical_flow"}
                    onClick={toggleToolHandler("logical_flow")}
                  />
                ) : null}
                {organizationFeature ? (
                  <OrganizationButton
                    disabled={!ready || isPending}
                    active={tool === "organization"}
                    onClick={toggleToolHandler("organization")}
                  />
                ) : null}
              </ButtonToolbar>
              <Activity mode={!tool || tool === "null" ? "visible" : "hidden"}>
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
              {tool === "organization" && (
                <OrganizationDataProvider>
                  <Organization />
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
              <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
                {paragraphClarityFeature ? (
                  <ParagraphClarityButton
                    disabled={!ready || isPending}
                    active={otherTool === "paragraph_clarity"}
                    onClick={toggleOtherToolHandler("paragraph_clarity")}
                  />
                ) : null}
                {sentencesFeature ? (
                  <SentencesButton
                    disabled={!ready || isPending}
                    active={otherTool === "sentences"}
                    onClick={toggleOtherToolHandler("sentences")}
                  />
                ) : null}
                {professionalToneFeature ? (
                  <ProfessionalToneButton
                    disabled={!ready || isPending}
                    active={otherTool === "professional_tone"}
                    onClick={toggleOtherToolHandler("professional_tone")}
                  />
                ) : null}
                {sourcesFeature ? (
                  <SourcesButton
                    disabled={!ready || isPending}
                    active={otherTool === "sources"}
                    onClick={toggleOtherToolHandler("sources")}
                  />
                ) : null}
              </ButtonToolbar>
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
                <Activity
                  mode={
                    !otherTool || otherTool === "null" ? "visible" : "hidden"
                  }
                >
                  <NullTool text={t("null.fine_tuning")} />
                </Activity>
                {otherTool === "civil_tone" && (
                  <CivilToneReviewProvider>
                    <CivilTone />
                  </CivilToneReviewProvider>
                )}
                {otherTool === "credibility" && (
                  <CredibilityReviewProvider>
                    <Credibility />
                  </CredibilityReviewProvider>
                )}
                {otherTool === "sentences" && (
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
