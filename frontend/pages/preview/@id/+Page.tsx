import { Activity, FC, useState } from "react";
import {
  Alert,
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  OverlayTrigger,
  Placeholder,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { SplitLayout } from "../../../layouts/SplitLayout";
import AdditionalToolsIcon from "../../../src/app/assets/icons/additional_tools_icon.svg?react";
import { Legal } from "../../../src/app/components/Legal/Legal";
import { CivilTonePreview } from "../../../src/app/components/Review/CivilTone";
import { CredibilityPreview } from "../../../src/app/components/Review/Credibility";
import {
  Expectations,
  ExpectationsButton,
} from "../../../src/app/components/Review/Expectations";
import {
  LinesOfArgumentsButton,
  LinesOfArgumentsPreview,
} from "../../../src/app/components/Review/LinesOfArguments";
import {
  LogicalFlowButton,
  LogicalFlowPreview,
} from "../../../src/app/components/Review/LogicalFlow";
import { NullTool } from "../../../src/app/components/Review/NullTool";
import { OrganizationPreview } from "../../../src/app/components/Review/Organization";
import {
  ParagraphClarityButton,
  ParagraphClarityPreview,
} from "../../../src/app/components/Review/ParagraphClarity";
import {
  ProfessionalToneButton,
  ProfessionalTonePreview,
} from "../../../src/app/components/Review/ProfessionalTone";
import {
  ProminentTopicsButton,
  ProminentTopicsPreview,
} from "../../../src/app/components/Review/ProminentTopics";
import "../../../src/app/components/Review/Review.scss";
import {
  Sentences,
  SentencesButton,
  SentencesPreview,
} from "../../../src/app/components/Review/Sentences";
import { SourcesPreview } from "../../../src/app/components/Review/Sources";
import { StageHeader } from "../../../src/app/components/StageHeader/StageHeader";
import { TaskViewerButton } from "../../../src/app/components/TaskViewer/TaskViewer";
import { UneditableIcon } from "../../../src/app/components/UneditableIcon/UneditableIcon";
import { UserText } from "../../../src/app/components/UserTextView/UserText";
import { ReviewTool } from "../../../src/lib/ReviewResponse";
import { isEnabled } from "../../../src/lib/WritingTask";
import { Data } from "./+data";

// tab event keys
type TabKey = "big_picture" | "fine_tuning";
// tool event keys
type Tool =
  | ReviewTool
  | "sentence_density"
  | "organization"
  | "impressions"
  | "null";

export const Page: FC = () => {
  const preview = useData<Data>();
  const { id: reviewID, filename, file, tool_config, task, analyses } = preview;
  console.log("Preview Page data:", preview);
  const { settings } = usePageContext();
  const { t } = useTranslation("review");
  const [tab, setTab] = useState<TabKey>("big_picture");
  const [tool, setTool] = useState<Tool>("null");
  const [secondaryTool, setSecondaryTool] = useState<Tool>("null");

  const toggleTool = (tool: Tool) => {
    setTool((prev) => (prev === tool ? "null" : tool));
  };
  const toggleSecondaryTool = (selectedTool: Tool) => {
    setSecondaryTool((prev) => (prev === selectedTool ? "null" : selectedTool));
  };
  const disabled = (tool: Tool): boolean => {
    return !tool_config.includes(tool);
  };
  const getAnalysis = (tool: ReviewTool) => {
    return analyses.find((a) => a.tool === tool);
  };

  return (
    <SplitLayout>
      <main className={"d-flex flex-column my-1"}>
        <header className="d-flex justify-content-between align-items-center border rounded-top bg-light px-3">
          <span>{filename}</span>
          <TaskViewerButton />
          <UneditableIcon />
        </header>
        <Activity mode={!file ? "visible" : "hidden"}>
          <Placeholder as="p" animation="glow" className="p-2">
            <Placeholder
              className="w-100 rounded"
              style={{ height: "10rem" }}
            />
            <Placeholder
              className="w-100 rounded my-2"
              style={{ height: "10rem" }}
            />
            <Placeholder
              className="w-100 rounded"
              style={{ height: "10rem" }}
            />
          </Placeholder>
        </Activity>
        <Activity mode={file ? "visible" : "hidden"}>
          <UserText className="overflow-auto border-top flex-grow-1" />
        </Activity>
      </main>
      <aside className="my-1 border rounded bg-light d-flex flex-column">
        <StageHeader title={t("title")} />
        <Tabs
          activeKey={tab}
          onSelect={(k) => {
            setTab(k as TabKey);
          }}
          variant="underline"
          className="justify-content-around inverse-color"
        >
          <Tab
            eventKey="big_picture"
            title={t("tabs.big_picture")}
            className="h-100"
          >
            <div className="h-100 d-flex flex-column overflow-auto">
              <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
                {settings?.expectations && isEnabled(task, "expectations") ? (
                  <ExpectationsButton
                    disabled={disabled("expectations")}
                    active={tool === "expectations"}
                    onClick={() => toggleTool("expectations")}
                  />
                ) : null}
                {settings?.prominent_topics &&
                isEnabled(task, "prominent_topics") ? (
                  <ProminentTopicsButton
                    disabled={disabled("prominent_topics")}
                    active={tool === "prominent_topics"}
                    onClick={() => toggleTool("prominent_topics")}
                  />
                ) : null}
                {settings?.lines_of_arguments &&
                isEnabled(task, "lines_of_arguments") ? (
                  <LinesOfArgumentsButton
                    disabled={disabled("lines_of_arguments")}
                    active={tool === "lines_of_arguments"}
                    onClick={() => toggleTool("lines_of_arguments")}
                  />
                ) : null}
                {settings?.logical_flow && isEnabled(task, "logical_flow") ? (
                  <LogicalFlowButton
                    disabled={disabled("logical_flow")}
                    active={tool === "logical_flow"}
                    onClick={() => toggleTool("logical_flow")}
                  />
                ) : null}
              </ButtonToolbar>
              <Activity mode={!tool || tool === "null" ? "visible" : "hidden"}>
                <NullTool text={t("null.big_picture")} />
              </Activity>
              <Activity mode={tool === "expectations" ? "visible" : "hidden"}>
                <Expectations />
              </Activity>
              {tool === "prominent_topics" && (
                <ProminentTopicsPreview
                  reviewID={reviewID}
                  analysis={getAnalysis("prominent_topics")}
                />
              )}
              {tool === "lines_of_arguments" && (
                <LinesOfArgumentsPreview
                  reviewID={reviewID}
                  analysis={getAnalysis("lines_of_arguments")}
                />
              )}
              {tool === "logical_flow" && (
                <LogicalFlowPreview
                  reviewID={reviewID}
                  analysis={getAnalysis("logical_flow")}
                />
              )}
              {/* Add Big Picture tools here. */}
            </div>
          </Tab>
          <Tab
            eventKey="fine_tuning"
            title={t("tabs.fine_tuning")}
            className="h-100"
          >
            <div className="h-100 d-flex flex-column overflow-auto">
              <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
                {settings?.paragraph_clarity &&
                isEnabled(task, "paragraph_clarity") ? (
                  <ParagraphClarityButton
                    disabled={disabled("paragraph_clarity")}
                    active={secondaryTool === "paragraph_clarity"}
                    onClick={() => toggleSecondaryTool("paragraph_clarity")}
                  />
                ) : null}
                {settings?.sentence_density &&
                isEnabled(task, "sentence_density") ? (
                  <SentencesButton
                    disabled={disabled("sentence_density")}
                    active={secondaryTool === "sentence_density"}
                    onClick={() => toggleSecondaryTool("sentence_density")}
                  />
                ) : null}
                {settings?.professional_tone &&
                isEnabled(task, "professional_tone") ? (
                  <ProfessionalToneButton
                    disabled={disabled("professional_tone")}
                    active={secondaryTool === "professional_tone"}
                    onClick={() => toggleSecondaryTool("professional_tone")}
                  />
                ) : null}
                <Dropdown
                  as={ButtonGroup}
                  className="bg-white shadow-sm rounded-2"
                >
                  <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip>{t("additional_tools.tooltip")}</Tooltip>}
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
                      ].includes(secondaryTool)}
                    >
                      <Stack>
                        <AdditionalToolsIcon />
                        <span>{t("additional_tools.title")}</span>
                      </Stack>
                    </Dropdown.Toggle>
                  </OverlayTrigger>
                  <Dropdown.Menu className="additional-tools-menu">
                    {settings?.sources && isEnabled(task, "sources") ? (
                      <Dropdown.Item
                        onClick={() => toggleSecondaryTool("sources")}
                        active={secondaryTool === "sources"}
                        disabled={disabled("sources")}
                      >
                        <h6 className="text-primary">{t("sources.title")}</h6>
                        <div className="text-wrap">
                          {t("instructions:sources_scope_note")}
                        </div>
                      </Dropdown.Item>
                    ) : null}
                    {settings?.credibility && isEnabled(task, "credibility") ? (
                      <Dropdown.Item
                        onClick={() => toggleSecondaryTool("credibility")}
                        active={secondaryTool === "credibility"}
                        disabled={disabled("credibility")}
                      >
                        <h6 className="text-primary">
                          {t("credibility.title")}
                        </h6>
                        <div className="text-wrap">
                          {t("instructions:credibility_scope_note")}
                        </div>
                      </Dropdown.Item>
                    ) : null}
                    {settings?.term_matrix && isEnabled(task, "term_matrix") ? (
                      <Dropdown.Item
                        onClick={() => toggleSecondaryTool("organization")}
                        active={secondaryTool === "organization"}
                        disabled={disabled("term_matrix")}
                      >
                        <h6 className="text-primary">
                          {t("organization.title")}
                        </h6>
                        <div className="text-wrap">
                          {t("instructions:term_matrix_scope_note")}
                        </div>
                      </Dropdown.Item>
                    ) : null}
                    {settings?.civil_tone && isEnabled(task, "civil_tone") ? (
                      <Dropdown.Item
                        onClick={() => toggleSecondaryTool("civil_tone")}
                        active={secondaryTool === "civil_tone"}
                        disabled={disabled("civil_tone")}
                      >
                        <h6 className="text-primary">
                          {t("civil_tone.title")}
                        </h6>
                        <div className="text-wrap">
                          {t("instructions:civil_tone_scope_note")}
                        </div>
                      </Dropdown.Item>
                    ) : null}
                  </Dropdown.Menu>
                </Dropdown>
              </ButtonToolbar>
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <Alert>
                    <Alert.Heading>{t("error.header")}</Alert.Heading>
                    {t("error.content")}
                    {t("error.details", {
                      details: { message: error.message },
                    })}
                  </Alert>
                )}
              >
                <Activity
                  mode={
                    !secondaryTool || secondaryTool === "null"
                      ? "visible"
                      : "hidden"
                  }
                >
                  <NullTool text={t("null.fine_tuning")} />
                </Activity>
                {secondaryTool === "civil_tone" && (
                  <CivilTonePreview
                    reviewID={reviewID}
                    analysis={getAnalysis("civil_tone")}
                  />
                )}
                {secondaryTool === "credibility" && (
                  <CredibilityPreview
                    reviewID={reviewID}
                    analysis={getAnalysis("credibility")}
                  />
                )}
                {/* {secondaryTool === "impressions" && ( */}
                {/* <NullTool text={t("null.not_available")} /> */}
                {/* )} */}
                {secondaryTool === "organization" && (
                  <OrganizationPreview
                    reviewID={reviewID}
                    analysis={getAnalysis("ontopic")}
                  />
                )}
                {secondaryTool === "sentence_density" && (
                  <SentencesPreview
                    reviewID={reviewID}
                    analysis={getAnalysis("ontopic")}
                  />
                )}
                {secondaryTool === "paragraph_clarity" && (
                  <ParagraphClarityPreview
                    reviewID={reviewID}
                    analysis={getAnalysis("paragraph_clarity")}
                  />
                )}
                {secondaryTool === "professional_tone" && (
                  <ProfessionalTonePreview
                    reviewID={reviewID}
                    analysis={getAnalysis("professional_tone")}
                  />
                )}
                {secondaryTool === "sources" && (
                  <SourcesPreview
                    reviewID={reviewID}
                    analysis={getAnalysis("sources")}
                  />
                )}
                {/* Add more tool displays here. */}
              </ErrorBoundary>
            </div>
          </Tab>
        </Tabs>
        <Legal />
      </aside>
    </SplitLayout>
  );
};
