import type { ReviewTool } from "#/lib/ReviewResponse";
import { isEnabled } from "#/lib/WritingTask";
import AdditionalToolsIcon from "#assets/icons/additional_tools_icon.svg?react";
import { Activity, type FC, useEffect, useState, useTransition } from "react";
import {
  Alert,
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  OverlayTrigger,
  Stack,
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
import { Organization, OrganizationDataProvider } from "./Organization";
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
import { Sources, SourcesReviewProvider } from "./Sources";

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
  const { task: writingTask } = useWritingTask();
  const { settings } = usePageContext();
  const ready = !!userText && userText.trim().length > 0;

  const toggleToolHandler =
    (selectedTool: Tool) => (evt: React.MouseEvent<HTMLButtonElement>) => {
      if (!evt.currentTarget.classList.contains("active")) {
        gtag("event", "screen_view", {
          app_name: "myProse-snapshot",
          screen_name: `${writingTask?.info.id ?? "NO_TASK"}_${selectedTool}`,
        });
      }
      setTool((prev) => (prev === selectedTool ? "null" : selectedTool));
    };
  const toggleOtherToolHandler =
    (selectedTool: Tool) => (evt: React.MouseEvent<HTMLButtonElement>) => {
      if (!evt.currentTarget.classList.contains("active")) {
        gtag("event", "screen_view", {
          app_name: "myProse-snapshot",
          screen_name: `${writingTask?.info.id ?? "NO_TASK"}_${selectedTool}`,
        });
      }
      setOtherTool((prev) => (prev === selectedTool ? "null" : selectedTool));
    };

  // As per #230 most features are available even without a writing task if
  // enabled in settings.  The server settings have priority over writing tasks.
  const civilToneFeature =
    !!settings?.civil_tone &&
    (!writingTask || isEnabled(writingTask, "civil_tone"));
  const credibilityFeature =
    !!settings?.credibility &&
    (!writingTask || isEnabled(writingTask, "credibility"));
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
  const impressionsFeature = false; /*settings.impressions && isEnabled(writingTask, "impressions")*/
  const organizationFeature =
    !!settings?.term_matrix &&
    (!writingTask || isEnabled(writingTask, "term_matrix"));
  const additionalToolsFeature =
    civilToneFeature ||
    credibilityFeature ||
    sourcesFeature ||
    organizationFeature ||
    impressionsFeature;
  const bigPictureFeature =
    expectationsFeature ||
    argumentsFeature ||
    ideasFeature ||
    logicalFlowFeature;
  const fineTuningFeature =
    additionalToolsFeature ||
    paragraphClarityFeature ||
    professionalToneFeature ||
    sentencesFeature;

  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    // Reset to default tab/tool if writing task or settings change.
    startTransition(() => {
      setTab(() => "big_picture");
      setTool(() => "null");
      setOtherTool(() => "null");
    });
  }, [settings, writingTask]);

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
                {additionalToolsFeature ? (
                  <Dropdown
                    as={ButtonGroup}
                    className="bg-white shadow-sm rounded-2"
                  >
                    <OverlayTrigger
                      placement="bottom"
                      overlay={
                        <Tooltip>{t("additional_tools.tooltip")}</Tooltip>
                      }
                    >
                      <Dropdown.Toggle
                        variant="outline-primary"
                        className="tool_button tool_dropdown"
                        active={[
                          "sources",
                          "credibility",
                          "organization",
                          "civil_tone",
                          "impressions",
                        ].includes(otherTool)}
                      >
                        <Stack>
                          <AdditionalToolsIcon />
                          <span>{t("additional_tools.title")}</span>
                        </Stack>
                      </Dropdown.Toggle>
                    </OverlayTrigger>
                    <Dropdown.Menu className="additional-tools-menu">
                      {sourcesFeature ? (
                        <Dropdown.Item
                          onClick={toggleOtherToolHandler("sources")}
                          active={otherTool === "sources"}
                          disabled={!ready}
                        >
                          <h6 className="text-primary">{t("sources.title")}</h6>
                          <div className="text-wrap">
                            {t("instructions:sources_scope_note")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {credibilityFeature ? (
                        <Dropdown.Item
                          onClick={toggleOtherToolHandler("credibility")}
                          active={otherTool === "credibility"}
                          disabled={!ready}
                        >
                          <h6 className="text-primary">
                            {t("credibility.title")}
                          </h6>
                          <div className="text-wrap">
                            {t("instructions:credibility_scope_note")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {organizationFeature ? (
                        <Dropdown.Item
                          onClick={toggleOtherToolHandler("organization")}
                          active={otherTool === "organization"}
                          disabled={!ready}
                        >
                          <h6 className="text-primary">
                            {t("organization.title")}
                          </h6>
                          <div className="text-wrap">
                            {t("instructions:term_matrix_scope_note")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {civilToneFeature ? (
                        <Dropdown.Item
                          onClick={toggleOtherToolHandler("civil_tone")}
                          active={otherTool === "civil_tone"}
                          disabled={!ready || isPending}
                        >
                          <h6 className="text-primary">
                            {t("civil_tone.title")}
                          </h6>
                          <div className="text-wrap">
                            {t("instructions:civil_tone_scope_note")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {impressionsFeature ? (
                        <Dropdown.Item
                          onClick={toggleOtherToolHandler("impressions")}
                          active={otherTool === "impressions"}
                          disabled={!ready || isPending}
                        >
                          <h6 className="text-primary">
                            {t("impressions.title")}
                          </h6>
                          <div className="text-wrap">
                            {t("impressions.tooltip")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                    </Dropdown.Menu>
                  </Dropdown>
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
                {/* {otherTool === "impressions" && ( */}
                {/* <NullTool text={t("null.not_available")} /> */}
                {/* )} */}
                {otherTool === "organization" && (
                  <OrganizationDataProvider>
                    <Organization />
                  </OrganizationDataProvider>
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
