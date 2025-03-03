import { FC, useEffect, useState } from "react";
import {
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  Nav,
  Navbar,
  OverlayTrigger,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Split from "react-split";
import { ReviewTool } from "../../../lib/ReviewResponse";
import AdditionalToolsIcon from "../../assets/icons/additional_tools_icon.svg?react";
import {
  useArgumentsEnabled,
  useCivilToneEnabled,
  useEthosEnabled,
  useExpectationsEnabled,
  useImpressionsEnabled,
  useLogicalFlowEnabled,
  useParagraphClarityEnabled,
  usePathosEnabled,
  useProfessionalToneEnabled,
  useProminentTopicsEnabled,
  useSentenceDensityEnabled,
  useSourcesEnabled,
  useTermMatrixEnabled,
} from "../../service/review-tools.service";
import { useOnTopicProse, useSegmentedProse } from "../../service/review.service";
import { Legal } from "../Legal/Legal";
import { Logo } from "../Logo/Logo";
import { UserTextView } from "../UserTextView/UserTextView";
import { CivilTone } from "./CivilTone";
import { Ethos } from "./Ethos";
import { Expectations, ExpectationsButton } from "./Expectations";
import { LinesOfArguments, LinesOfArgumentsButton } from "./LinesOfArguments";
import { LogicalFlow, LogicalFlowButton } from "./LogicalFlow";
import { Organization } from "./Organization";
import { ParagraphClarity, ParagraphClarityButton } from "./ParagraphClarity";
import { Pathos } from "./Pathos";
import { ProfessionalTone, ProfessionalToneButton } from "./ProfessionalTone";
import { ProminentTopics, ProminentTopicsButton } from "./ProminentTopics";
import "./Review.scss";
import { ReviewProvider } from "./ReviewContext";
import { Sentences, SentencesButton } from "./Sentences";
import { Sources } from "./Sources";

type Tool = ReviewTool | "sentences" | "organization" | "impressions" | "null";

const NullTool: FC = () => (
  <Stack className="position-absolute start-50 top-50 translate-middle">
    <span className="mx-auto text-center">
      <Translation ns={"review"}>{(t) => <>{t("null.content")}</>}</Translation>
    </span>
  </Stack>
);

export const Review: FC = () => {
  const { t, ready } = useTranslation("review");
  const { t: tt } = useTranslation();
  const { t: inst } = useTranslation("instructions");
  const segmentedProse = useSegmentedProse();
  const ontopicProse = useOnTopicProse();
  const [tab, setTab] = useState<"big_picture" | "fine_tuning">("big_picture");
  const [tool, setTool] = useState<Tool>("expectations");
  const [otherTool, setOtherTool] = useState<Tool>("paragraph_clarity");
  const [prose, setProse] = useState<string>("");

  // useUnload();
  useEffect(() => {
    if (ready) {
      window.document.title = t("document.title");
    }
  }, [t, ready]);
  useEffect(() => {
    if (!segmentedProse && !ontopicProse) {
      setProse("");
    } else if (ontopicProse && tab === "fine_tuning" && ["sentences", "organization"].includes(otherTool)) {
      setProse(ontopicProse);
    } else {
      setProse(segmentedProse ?? "");
    }
    // FIXME this causes redraw on review update
    // if (isReview(review)) {
    //   const ontopic_analysis = review.analysis.find((analysis) =>
    //     isOnTopicReviewData(analysis)
    //   );
    //   console.log(!!ontopic_analysis, !!ontopic_analysis?.response?.html, tab, otherTool);
    //   if (
    //     ontopic_analysis &&
    //     ontopic_analysis.response?.html &&
    //     tab === "fine_tuning" &&
    //     ["sentences", "organization"].includes(otherTool)
    //   ) {
    //     setProse(ontopic_analysis.response.html);
    //   } else {
    //     setProse(review.segmented);
    //   }
    // } else {
    //   setProse("");
    // }
  }, [segmentedProse, ontopicProse, tab, otherTool]);

  const civilToneFeature = useCivilToneEnabled();
  const ethosFeature = useEthosEnabled();
  const expectationsFeature = useExpectationsEnabled();
  const ideasFeature = useProminentTopicsEnabled();
  const argumentsFeature = useArgumentsEnabled();
  const logicalFlowFeature = useLogicalFlowEnabled();
  const paragraphClarityFeature = useParagraphClarityEnabled();
  const pathosFeature = usePathosEnabled();
  const professionalToneFeature = useProfessionalToneEnabled();
  const sentencesFeature = useSentenceDensityEnabled();
  const sourcesFeature = useSourcesEnabled();
  const impressionsFeature = useImpressionsEnabled();
  const organizationFeature = useTermMatrixEnabled();

  return (
    <ReviewProvider>
      <Split
        className="container-fluid h-100 w-100 d-flex flex-row review align-items-stretch"
        sizes={[60, 40]}
        minSize={[400, 320]}
        expandToMin={true}
      >
        <UserTextView prose={prose} className="my-1" />
        <aside className="my-1 border rounded bg-light d-flex flex-column">
          <header>
            <Navbar className="border-bottom py-0 mb-1 mt-0 d-flex align-items-baseline justify-content-between">
              <Nav>
                <Nav.Item className="active text-primary ms-3">
                  {tt("tool.tab.review")}
                </Nav.Item>
              </Nav>
              <Navbar.Brand>
                <Logo />
              </Navbar.Brand>
            </Navbar>
          </header>
          <Tabs
            activeKey={tab}
            onSelect={(k) => setTab(k as "big_picture" | "fine_tuning")}
            variant="underline"
            className="justify-content-around inverse-color"
          >
            {expectationsFeature || argumentsFeature || logicalFlowFeature ? (
              <Tab eventKey="big_picture" title={t("tabs.big_picture")}>
                <div className="overflow-hidden h-100 d-flex flex-column">
                  <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
                    {expectationsFeature ? (
                      <ExpectationsButton
                        active={tool === "expectations"}
                        onClick={() => setTool("expectations")}
                      />
                    ) : null}
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
                  {/* <div className="position-relative flex-grow-1 overflow-auto"> */}
                  {(!tool || tool === "null") && <NullTool />}
                  {tool === "expectations" && <Expectations />}
                  {tool === "prominent_topics" && <ProminentTopics />}
                  {tool === "lines_of_arguments" && <LinesOfArguments />}
                  {tool === "logical_flow" && <LogicalFlow />}
                  {/* Add Big Picture tools here. */}
                  {/* </div> */}
                </div>
              </Tab>
            ) : null}
            {true ? (
              <Tab
                eventKey="fine_tuning"
                title={t("tabs.fine_tuning")}
                className="overflow-hidden"
              >
                <div className="overflow-hidden h-100 d-flex flex-column">
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
                          className="tool_button"
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
                              {inst("sources_scope_note")}
                            </div>
                          </Dropdown.Item>
                        ) : null}
                        {ethosFeature ? (
                          <Dropdown.Item
                            onClick={() => setOtherTool("ethos")}
                            active={otherTool === "ethos"}
                          >
                            <h6 className="text-primary">{t("ethos.title")}</h6>
                            <div className="text-wrap">
                              {inst("ethos_scope_note")}
                            </div>
                          </Dropdown.Item>
                        ) : null}
                        {pathosFeature ? (
                          <Dropdown.Item
                            onClick={() => setOtherTool("pathos")}
                            active={otherTool === "pathos"}
                          >
                            <h6 className="text-primary">
                              {t("pathos.title")}
                            </h6>
                            <div className="text-wrap">
                              {inst("pathos_scope_note")}
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
                              {inst("term_matrix_scope_note")}
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
                              {inst("civil_tone_scope_note")}
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
                  </ButtonToolbar>
                  {(!otherTool || otherTool === "null") && <NullTool />}
                  {otherTool === "logical_flow" && <LogicalFlow />}
                  {otherTool === "civil_tone" && <CivilTone />}
                  {otherTool === "ethos" && <Ethos />}
                  {otherTool === "impressions" && <NullTool />}
                  {otherTool === "organization" && <Organization />}
                  {otherTool === "sentences" && <Sentences />}
                  {otherTool === "paragraph_clarity" && <ParagraphClarity />}
                  {otherTool === "pathos" && <Pathos />}
                  {otherTool === "professional_tone" && <ProfessionalTone />}
                  {otherTool === "sources" && <Sources />}
                  {/* Add more tool displays here. */}
                </div>
              </Tab>
            ) : null}
          </Tabs>
          {/* <div className="position-relative flex-grow-1 overflow-auto">
            {(!tool || tool === "null") && <NullTool />}
            {tool === "lines_of_arguments" && <LinesOfArguments />}
            {tool === "logical_flow" && <LogicalFlow />}
            {tool === "civil_tone" && <CivilTone />}
            {tool === "ethos" && <Ethos />}
            {tool === "expectations" && <Expectations />} */}
          {/* {tool === "global_coherence" && <GlobalCoherence />} */}
          {/* {tool === "impressions" && <NullTool />}
            {tool === "prominent_topics" && <ProminentTopics />}
            {tool === "organization" && <Organization />}
            {tool === "sentences" && <Sentences />}
            {tool === "paragraph_clarity" && <ParagraphClarity />}
            {tool === "pathos" && <Pathos />}
            {tool === "professional_tone" && <ProfessionalTone />}
            {tool === "sources" && <Sources />} */}
          {/* Add more tool displays here. */}
          {/* </div> */}
          <Legal />
        </aside>
      </Split>
    </ReviewProvider>
  );
};
