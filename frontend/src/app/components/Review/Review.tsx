import classNames from "classnames";
import { type FC, type HTMLProps, useState } from "react";
import {
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
import AdditionalToolsIcon from "../../assets/icons/additional_tools_icon.svg?react";
import ReviewIcon from "../../assets/icons/review_icon.svg?react";
import {
  useAdditionalToolsEnabled,
  useArgumentsEnabled,
  useBigPictureEnabled,
  useCivilToneEnabled,
  useCredibilityEnabled,
  useExpectationsEnabled,
  useFineTuningEnabled,
  useImpressionsEnabled,
  useLogicalFlowEnabled,
  useParagraphClarityEnabled,
  useProfessionalToneEnabled,
  useProminentTopicsEnabled,
  useSentenceDensityEnabled,
  useSourcesEnabled,
  useTermMatrixEnabled,
} from "../../service/review-tools.service";
import { Legal } from "../Legal/Legal";
import { StageHeader } from "../StageHeader/StageHeader";
import { UserTextView } from "../UserTextView/UserTextView";
import "./Review.scss";
import { ReviewProvider } from "./ReviewContext";
import { LinesOfArguments, LinesOfArgumentsButton } from "./LinesOfArguments";
import { ProminentTopics, ProminentTopicsButton } from "./ProminentTopics";
import { LogicalFlow, LogicalFlowButton } from "./LogicalFlow";
import { ProfessionalTone, ProfessionalToneButton } from "./ProfessionalTone";
import { CivilTone } from "./CivilTone";
import { ParagraphClarity, ParagraphClarityButton } from "./ParagraphClarity";
import { Ethos } from "./Ethos";
import { Sources } from "./Sources";
import { Sentences, SentencesButton } from "./Sentences";
import { Organization } from "./Organization";

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

  // useUnload();
  // useEffect(() => {
  //   if (ready) {
  //     window.document.title = t("document.title");
  //   }
  // }, [t, ready]);

  const civilToneFeature = useCivilToneEnabled();
  const credibilityFeature = useCredibilityEnabled();
  const expectationsFeature = useExpectationsEnabled();
  const ideasFeature = useProminentTopicsEnabled();
  const argumentsFeature = useArgumentsEnabled();
  const logicalFlowFeature = useLogicalFlowEnabled();
  const paragraphClarityFeature = useParagraphClarityEnabled();
  const professionalToneFeature = useProfessionalToneEnabled();
  const sentencesFeature = useSentenceDensityEnabled();
  const sourcesFeature = useSourcesEnabled();
  const impressionsFeature = useImpressionsEnabled();
  const organizationFeature = useTermMatrixEnabled();
  const additionalToolsFeature = useAdditionalToolsEnabled();
  const bigPictureFeature = useBigPictureEnabled();
  const fineTuningFeature = useFineTuningEnabled();

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
                    {expectationsFeature
                      ? null
                      : // <ExpectationsButton
                        //   active={tool === "expectations"}
                        //   onClick={() => setTool("expectations")}
                        // />
                        null}
                    {ideasFeature ? (
                      <ProminentTopicsButton
                        active={tool === "prominent_topics"}
                        onClick={() => setTool("prominent_topics")}
                      />
                    ) : null}
                    {argumentsFeature ? (
                      <LinesOfArgumentsButton
                        active={tool === "lines_of_arguments"}
                        onClick={() => setTool("lines_of_arguments")}
                      />
                    ) : null}
                    {logicalFlowFeature ? (
                      <LogicalFlowButton
                        active={tool === "logical_flow"}
                        onClick={() => setTool("logical_flow")}
                      />
                    ) : null}
                  </ButtonToolbar>
                  {(!tool || tool === "null") && (
                    <NullTool text={t("null.big_picture")} />
                  )}
                  {/* {tool === "expectations" && <Expectations />} */}
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
                        active={otherTool === "paragraph_clarity"}
                        onClick={() => setOtherTool("paragraph_clarity")}
                      />
                    ) : null}
                    {sentencesFeature ? (
                      <SentencesButton
                        active={otherTool === "sentences"}
                        onClick={() => setOtherTool("sentences")}
                      />
                    ) : null}
                    {professionalToneFeature ? (
                      <ProfessionalToneButton
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
