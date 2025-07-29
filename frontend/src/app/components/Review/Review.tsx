import classNames from "classnames";
import { type FC, type HTMLProps, useEffect, useState } from "react";
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
import { useTranslation } from "react-i18next";
import Split from "react-split";
import type { ReviewTool } from "../../../lib/ReviewResponse";
import { isEnabled } from "../../../lib/WritingTask";
import AdditionalToolsIcon from "../../assets/icons/additional_tools_icon.svg?react";
import ReviewIcon from "../../assets/icons/review_icon.svg?react";
import { useFileText } from "../FileUpload/FileUploadContext";
import { Legal } from "../Legal/Legal";
import { useSettingsContext } from "../Settings/SettingsContext";
import { StageHeader } from "../StageHeader/StageHeader";
import { UserTextView } from "../UserTextView/UserTextView";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { CivilTone } from "./CivilTone";
import { Ethos } from "./Ethos";
import { Expectations, ExpectationsButton } from "./Expectations";
import { LinesOfArguments, LinesOfArgumentsButton } from "./LinesOfArguments";
import { LogicalFlow, LogicalFlowButton } from "./LogicalFlow";
import { Organization } from "./Organization";
import { ParagraphClarity, ParagraphClarityButton } from "./ParagraphClarity";
import { ProfessionalTone, ProfessionalToneButton } from "./ProfessionalTone";
import { ProminentTopics, ProminentTopicsButton } from "./ProminentTopics";
import "./Review.scss";
import { ReviewProvider } from "./ReviewContext";
import { Sentences, SentencesButton } from "./Sentences";
import { Sources } from "./Sources";
import { ErrorBoundary } from "react-error-boundary";

// tab event keys
type TabKey = "big_picture" | "fine_tuning";
// tool event keys
type Tool = ReviewTool | "sentences" | "organization" | "impressions" | "null";

/** No selected tool component. */
const NullTool: FC<HTMLProps<HTMLDivElement> & { text: string }> = ({
  className,
  text,
  ...props
}) => (
  <article
    {...props}
    className={classNames(
      className,
      "container-fluid flex-grow-1 overflow-auto d-flex flex-column position-relative"
    )}
  >
    <Stack className="position-absolute top-50 start-50 translate-middle w-75">
      <ReviewIcon className="mx-auto text-primary md-icon" />
      <span className="mx-auto text-center">{text}</span>
    </Stack>
  </article>
);

/** Top level component for displaying reviews. */
export const Review: FC = () => {
  const { t } = useTranslation("review");
  const { t: tt } = useTranslation();
  const [tab, setTab] = useState<"big_picture" | "fine_tuning">("big_picture");
  const [tool, setTool] = useState<Tool>("null");
  const [otherTool, setOtherTool] = useState<Tool>("null");
  const [ready, setReady] = useState<boolean>(false);
  const userText = useFileText();
  const { task: writingTask } = useWritingTask();
  const settings = useSettingsContext();

  useEffect(() => {
    setReady(!!userText && userText.trim().length > 0 && !!writingTask);
  }, [userText, writingTask]);
  // useUnload();
  // useEffect(() => {
  //   if (ready) {
  //     window.document.title = t("document.title");
  //   }
  // }, [t, ready]);

  const [civilToneFeature, setCivilToneFeature] = useState(false);
  const [credibilityFeature, setCredibilityFeature] = useState(false);
  const [expectationsFeature, setExpectationsFeature] = useState(false);
  const [ideasFeature, setIdeasFeature] = useState(false);
  const [argumentsFeature, setArgumentsFeature] = useState(false);
  const [logicalFlowFeature, setLogicalFlowFeature] = useState(false);
  const [paragraphClarityFeature, setParagraphClarityFeature] = useState(false);
  const [professionalToneFeature, setProfessionalToneFeature] = useState(false);
  const [sentencesFeature, setSentencesFeature] = useState(false);
  const [sourcesFeature, setSourcesFeature] = useState(false);
  const [impressionsFeature, setImpressionsFeature] = useState(false);
  const [organizationFeature, setOrganizationFeature] = useState(false);
  const [additionalToolsFeature, setAdditionalToolsFeature] = useState(false);
  const [bigPictureFeature, setBigPictureFeature] = useState(false);
  const [fineTuningFeature, setFineTuningFeature] = useState(false);
  useEffect(() => {
    setCivilToneFeature(
      settings.civil_tone && isEnabled(writingTask, "civil_tone")
    );
    setCredibilityFeature(
      settings.credibility && isEnabled(writingTask, "credibility")
    );
    setExpectationsFeature(
      settings.expectations && isEnabled(writingTask, "expectations")
    );
    setArgumentsFeature(
      settings.lines_of_arguments &&
        isEnabled(writingTask, "lines_of_arguments")
    );
    setLogicalFlowFeature(
      settings.logical_flow && isEnabled(writingTask, "logical_flow")
    );
    setParagraphClarityFeature(
      settings.paragraph_clarity && isEnabled(writingTask, "paragraph_clarity")
    );
    setProfessionalToneFeature(
      settings.professional_tone && isEnabled(writingTask, "professional_tone")
    );
    setIdeasFeature(
      settings.prominent_topics && isEnabled(writingTask, "prominent_topics")
    );
    setSourcesFeature(settings.sources && isEnabled(writingTask, "sources"));
    setSentencesFeature(
      settings.sentence_density && isEnabled(writingTask, "sentence_density")
    );
    setSourcesFeature(settings.sources && isEnabled(writingTask, "sources"));
    setOrganizationFeature(
      settings.term_matrix && isEnabled(writingTask, "term_matrix")
    );
    setImpressionsFeature(
      false
      /*settings.impressions && isEnabled(writingTask, "impressions")*/
    );
  }, [settings, writingTask]);
  useEffect(() => {
    setBigPictureFeature(
      expectationsFeature ||
        argumentsFeature ||
        ideasFeature ||
        logicalFlowFeature
    );
  }, [expectationsFeature, argumentsFeature, ideasFeature, logicalFlowFeature]);
  useEffect(() => {
    setAdditionalToolsFeature(
      civilToneFeature ||
        credibilityFeature ||
        sourcesFeature ||
        organizationFeature ||
        impressionsFeature
    );
  }, [
    civilToneFeature,
    credibilityFeature,
    sourcesFeature,
    organizationFeature,
    impressionsFeature,
  ]);
  useEffect(() => {
    setFineTuningFeature(
      additionalToolsFeature ||
        paragraphClarityFeature ||
        professionalToneFeature ||
        sentencesFeature
    );
  }, [
    additionalToolsFeature,
    paragraphClarityFeature,
    professionalToneFeature,
    sentencesFeature,
  ]);

  return (
    <ReviewProvider>
      <Split
        className="container-fluid vh-100 w-100 d-flex flex-row review align-items-stretch"
        sizes={[60, 40]}
        minSize={[400, 320]}
        expandToMin={true}
      >
        <UserTextView className="my-1" />
        <aside className="my-1 border rounded bg-light d-flex flex-column">
          <StageHeader title={tt("tool.tab.review")} />
          {!bigPictureFeature && !fineTuningFeature && (
            <NullTool text={t("null.no_writing_task")} />
          )}
          <Tabs
            activeKey={tab}
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
                      <ExpectationsButton
                        disabled={!ready}
                        active={tool === "expectations"}
                        onClick={() => setTool("expectations")}
                      />
                    ) : null}
                    {ideasFeature ? (
                      <ProminentTopicsButton
                        disabled={!ready}
                        active={tool === "prominent_topics"}
                        onClick={() => setTool("prominent_topics")}
                      />
                    ) : null}
                    {argumentsFeature ? (
                      <LinesOfArgumentsButton
                        disabled={!ready}
                        active={tool === "lines_of_arguments"}
                        onClick={() => setTool("lines_of_arguments")}
                      />
                    ) : null}
                    {logicalFlowFeature ? (
                      <LogicalFlowButton
                        disabled={!ready}
                        active={tool === "logical_flow"}
                        onClick={() => setTool("logical_flow")}
                      />
                    ) : null}
                  </ButtonToolbar>
                  {(!tool || tool === "null") && (
                    <NullTool text={t("null.big_picture")} />
                  )}
                  {tool === "expectations" && <Expectations />}
                  {tool === "prominent_topics" && <ProminentTopics />}
                  {tool === "lines_of_arguments" && <LinesOfArguments />}
                  {tool === "logical_flow" && <LogicalFlow />}
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
                        disabled={!ready}
                        active={otherTool === "paragraph_clarity"}
                        onClick={() => setOtherTool("paragraph_clarity")}
                      />
                    ) : null}
                    {sentencesFeature ? (
                      <SentencesButton
                        disabled={!ready}
                        active={otherTool === "sentences"}
                        onClick={() => setOtherTool("sentences")}
                      />
                    ) : null}
                    {professionalToneFeature ? (
                      <ProfessionalToneButton
                        disabled={!ready}
                        active={otherTool === "professional_tone"}
                        onClick={() => setOtherTool("professional_tone")}
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
                              onClick={() => setOtherTool("sources")}
                              active={otherTool === "sources"}
                              disabled={!ready}
                            >
                              <h6 className="text-primary">
                                {t("sources.title")}
                              </h6>
                              <div className="text-wrap">
                                {t("instructions:sources_scope_note")}
                              </div>
                            </Dropdown.Item>
                          ) : null}
                          {credibilityFeature ? (
                            <Dropdown.Item
                              onClick={() => setOtherTool("credibility")}
                              active={otherTool === "credibility"}
                              disabled={!ready}
                            >
                              <h6 className="text-primary">
                                {t("ethos.title")}
                              </h6>
                              <div className="text-wrap">
                                {t("instructions:ethos_scope_note")}
                              </div>
                            </Dropdown.Item>
                          ) : null}
                          {organizationFeature ? (
                            <Dropdown.Item
                              onClick={() => setOtherTool("organization")}
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
                              onClick={() => setOtherTool("civil_tone")}
                              active={otherTool === "civil_tone"}
                              disabled={!ready}
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
                              onClick={() => setOtherTool("impressions")}
                              active={otherTool === "impressions"}
                              disabled={!ready}
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
                          details: { message: error.message },
                        })}
                      </Alert>
                    )}
                  >
                    {(!otherTool || otherTool === "null") && (
                      <NullTool text={t("null.fine_tuning")} />
                    )}
                    {otherTool === "logical_flow" && <LogicalFlow />}
                    {otherTool === "civil_tone" && <CivilTone />}
                    {otherTool === "credibility" && <Ethos />}
                    {/* {otherTool === "impressions" && ( */}
                    {/* <NullTool text={t("null.not_available")} /> */}
                    {/* )} */}
                    {otherTool === "organization" && <Organization />}
                    {otherTool === "sentences" && <Sentences />}
                    {otherTool === "paragraph_clarity" && <ParagraphClarity />}
                    {otherTool === "professional_tone" && <ProfessionalTone />}
                    {otherTool === "sources" && <Sources />}
                    {/* Add more tool displays here. */}
                  </ErrorBoundary>
                </div>
              </Tab>
            ) : null}
          </Tabs>
          <Legal />
        </aside>
      </Split>
    </ReviewProvider>
  );
};
