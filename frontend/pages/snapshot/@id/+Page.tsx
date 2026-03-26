import { Activity, FC, useState } from "react";
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
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import AdditionalToolsIcon from "../../../assets/icons/additional_tools_icon.svg?react";
import {
  CivilTone,
  CivilToneSnapshotProvider,
} from "../../../components/Review/CivilTone";
import {
  Credibility,
  CredibilitySnapshotProvider,
} from "../../../components/Review/Credibility";
import {
  Expectations,
  ExpectationsButton,
  ExpectationSnapshotProvider,
} from "../../../components/Review/Expectations";
import {
  LinesOfArguments,
  LinesOfArgumentsButton,
  LinesOfArgumentsSnapshotProvider,
} from "../../../components/Review/LinesOfArguments";
import {
  LogicalFlow,
  LogicalFlowButton,
  LogicalFlowSnapshotProvider,
} from "../../../components/Review/LogicalFlow";
import { NullTool } from "../../../components/Review/NullTool";
import {
  Organization,
  OrganizationSnapshotProvider,
} from "../../../components/Review/Organization";
import {
  ParagraphClarity,
  ParagraphClarityButton,
  ParagraphClaritySnapshotProvider,
} from "../../../components/Review/ParagraphClarity";
import {
  ProfessionalTone,
  ProfessionalToneButton,
  ProfessionalToneSnapshotProvider,
} from "../../../components/Review/ProfessionalTone";
import {
  ProminentTopics,
  ProminentTopicsButton,
  ProminentTopicsSnapshotProvider,
} from "../../../components/Review/ProminentTopics";
import "../../../components/Review/Review.scss";
import {
  Sentences,
  SentencesButton,
  SentencesSnapshotProvider,
} from "../../../components/Review/Sentences";
import {
  Sources,
  SourcesSnapshotProvider,
} from "../../../components/Review/Sources";
import {
  isExpectationsData,
  ReviewTool,
} from "../../../src/lib/ReviewResponse";
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
  const { id: reviewID, tool_config, task, analyses } = useData<Data>();
  const { settings } = usePageContext();
  const { t } = useTranslation("review");
  const [tab, setTab] = useState<TabKey>("big_picture");
  const [tool, setTool] = useState<Tool>("null");
  const [secondaryTool, setSecondaryTool] = useState<Tool>("null");

  const toggleToolHandler =
    (selectedTool: Tool) => (evt: React.MouseEvent<HTMLButtonElement>) => {
      if (!evt.currentTarget.classList.contains("active")) {
        gtag("event", "screen_view", {
          app_name: "myProse-snapshot",
          screen_name: `${reviewID}_${task.info.id}_${selectedTool}`,
        });
      }
      setTool((prev) => (prev === selectedTool ? "null" : selectedTool));
    };
  const secondaryToggleHandler =
    (selectedTool: Tool) => (evt: React.MouseEvent<HTMLButtonElement>) => {
      if (!evt.currentTarget.classList.contains("active")) {
        gtag("event", "screen_view", {
          app_name: "myProse-snapshot",
          screen_name: `${reviewID}_${task.info.id}_${selectedTool}`,
        });
      }
      setSecondaryTool((prev) =>
        prev === selectedTool ? "null" : selectedTool
      );
    };
  const disabled = (tool: Tool): boolean => {
    return !tool_config.includes(tool);
  };
  const getExpectations = () => analyses.filter(isExpectationsData);

  return (
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
                onClick={toggleToolHandler("expectations")}
              />
            ) : null}
            {settings?.prominent_topics &&
            isEnabled(task, "prominent_topics") ? (
              <ProminentTopicsButton
                disabled={disabled("prominent_topics")}
                active={tool === "prominent_topics"}
                onClick={toggleToolHandler("prominent_topics")}
              />
            ) : null}
            {settings?.prominent_topics &&
            isEnabled(task, "prominent_topics") ? (
              <ProminentTopicsButton
                disabled={disabled("prominent_topics")}
                active={tool === "prominent_topics"}
                onClick={toggleToolHandler("prominent_topics")}
              />
            ) : null}
            {settings?.lines_of_arguments &&
            isEnabled(task, "lines_of_arguments") ? (
              <LinesOfArgumentsButton
                disabled={disabled("lines_of_arguments")}
                active={tool === "lines_of_arguments"}
                onClick={toggleToolHandler("lines_of_arguments")}
              />
            ) : null}
            {settings?.logical_flow && isEnabled(task, "logical_flow") ? (
              <LogicalFlowButton
                disabled={disabled("logical_flow")}
                active={tool === "logical_flow"}
                onClick={toggleToolHandler("logical_flow")}
              />
            ) : null}
          </ButtonToolbar>
          <Activity mode={!tool || tool === "null" ? "visible" : "hidden"}>
            <NullTool text={t("null.big_picture")} />
          </Activity>
          <Activity mode={tool === "expectations" ? "visible" : "hidden"}>
            <ExpectationSnapshotProvider
              snapshotID={reviewID}
              analysis={getExpectations()}
              task={task}
            >
              <Expectations />
            </ExpectationSnapshotProvider>
          </Activity>
          {tool === "prominent_topics" && (
            <ProminentTopicsSnapshotProvider
              snapshotId={reviewID}
              analyses={analyses}
            >
              <ProminentTopics />
            </ProminentTopicsSnapshotProvider>
          )}
          {tool === "lines_of_arguments" && (
            <LinesOfArgumentsSnapshotProvider
              snapshotId={reviewID}
              analyses={analyses}
            >
              <LinesOfArguments />
            </LinesOfArgumentsSnapshotProvider>
          )}
          {tool === "logical_flow" && (
            <LogicalFlowSnapshotProvider
              snapshotId={reviewID}
              analyses={analyses}
            >
              <LogicalFlow />
            </LogicalFlowSnapshotProvider>
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
                onClick={secondaryToggleHandler("paragraph_clarity")}
              />
            ) : null}
            {settings?.sentence_density &&
            isEnabled(task, "sentence_density") ? (
              <SentencesButton
                disabled={disabled("sentence_density")}
                active={secondaryTool === "sentence_density"}
                onClick={secondaryToggleHandler("sentence_density")}
              />
            ) : null}
            {settings?.professional_tone &&
            isEnabled(task, "professional_tone") ? (
              <ProfessionalToneButton
                disabled={disabled("professional_tone")}
                active={secondaryTool === "professional_tone"}
                onClick={secondaryToggleHandler("professional_tone")}
              />
            ) : null}
            <Dropdown as={ButtonGroup} className="bg-white shadow-sm rounded-2">
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
                    onClick={secondaryToggleHandler("sources")}
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
                    onClick={secondaryToggleHandler("credibility")}
                    active={secondaryTool === "credibility"}
                    disabled={disabled("credibility")}
                  >
                    <h6 className="text-primary">{t("credibility.title")}</h6>
                    <div className="text-wrap">
                      {t("instructions:credibility_scope_note")}
                    </div>
                  </Dropdown.Item>
                ) : null}
                {settings?.term_matrix && isEnabled(task, "term_matrix") ? (
                  <Dropdown.Item
                    onClick={secondaryToggleHandler("organization")}
                    active={secondaryTool === "organization"}
                    disabled={disabled("term_matrix")}
                  >
                    <h6 className="text-primary">{t("organization.title")}</h6>
                    <div className="text-wrap">
                      {t("instructions:term_matrix_scope_note")}
                    </div>
                  </Dropdown.Item>
                ) : null}
                {settings?.civil_tone && isEnabled(task, "civil_tone") ? (
                  <Dropdown.Item
                    onClick={secondaryToggleHandler("civil_tone")}
                    active={secondaryTool === "civil_tone"}
                    disabled={disabled("civil_tone")}
                  >
                    <h6 className="text-primary">{t("civil_tone.title")}</h6>
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
                  details: {
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
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
              <CivilToneSnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <CivilTone />
              </CivilToneSnapshotProvider>
            )}
            {secondaryTool === "credibility" && (
              <CredibilitySnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <Credibility />
              </CredibilitySnapshotProvider>
            )}
            {/* {secondaryTool === "impressions" && ( */}
            {/* <NullTool text={t("null.not_available")} /> */}
            {/* )} */}
            {secondaryTool === "organization" && (
              <OrganizationSnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <Organization />
              </OrganizationSnapshotProvider>
            )}
            {secondaryTool === "sentence_density" && (
              <SentencesSnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <Sentences />
              </SentencesSnapshotProvider>
            )}
            {secondaryTool === "paragraph_clarity" && (
              <ParagraphClaritySnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <ParagraphClarity />
              </ParagraphClaritySnapshotProvider>
            )}
            {secondaryTool === "professional_tone" && (
              <ProfessionalToneSnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <ProfessionalTone />
              </ProfessionalToneSnapshotProvider>
            )}
            {secondaryTool === "sources" && (
              <SourcesSnapshotProvider
                snapshotId={reviewID}
                analyses={analyses}
              >
                <Sources />
              </SourcesSnapshotProvider>
            )}
            {/* Add more tool displays here. */}
          </ErrorBoundary>
        </div>
      </Tab>
    </Tabs>
  );
};
