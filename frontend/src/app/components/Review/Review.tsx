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
import { isReview } from "../../../server/model/review";
// import { useUnload } from "../../service/beforeUnload.service";
import { isOnTopicReviewData, ReviewTool } from "../../../lib/ReviewResponse";
import { useReview } from "../../service/review.service";
import { Legal } from "../Legal/Legal";
import { Logo } from "../Logo/Logo";
import { UserTextView } from "../UserTextView/UserTextView";
import { Expectations, ExpectationsButton } from "./Expectations";
// import { GlobalCoherence, GlobalCoherenceTitle } from "./GlobalCoherence";
import {
  useArgumentsEnabled,
  useCivilToneEnabled,
  useEthosEnabled,
  useExpectationsEnabled,
  useImpressionsEnabled,
  useKeyIdeasEnabled,
  useLogicalFlowEnabled,
  useParagraphClarityEnabled,
  usePathosEnabled,
  useProfessionalToneEnabled,
  useSentenceDensityEnabled,
  useSourcesEnabled,
  useTermMatrixEnabled,
} from "../../service/review-tools.service";
import { CivilTone } from "./CivilTone";
import { Ethos } from "./Ethos";
import { KeyIdeas, KeyIdeasButton } from "./KeyIdeas";
import { LinesOfArguments, LinesOfArgumentsButton } from "./LinesOfArguments";
import { LogicalFlow, LogicalFlowButton } from "./LogicalFlow";
import { Organization } from "./Organization";
import { ParagraphClarity, ParagraphClarityButton } from "./ParagraphClarity";
import { Pathos } from "./Pathos";
import { ProfessionalTone, ProfessionalToneButton } from "./ProfessionalTone";
import "./Review.scss";
import { ReviewProvider } from "./ReviewContext";
import { Sentences, SentencesButton } from "./Sentences";
import { Sources } from "./Sources";

type Tool = ReviewTool | "organization" | "impressions" | "null";

const NullTool: FC = () => (
  <Stack className="position-absolute start-50 top-50 translate-middle">
    <span className="mx-auto text-center">
      <Translation ns={"review"}>{(t) => <>{t("null.content")}</>}</Translation>
    </span>
  </Stack>
);

export const Review: FC = () => {
  const { t } = useTranslation("review");
  const { t: tt } = useTranslation();
  const review = useReview();
  const [tool, setTool] = useState<Tool>("expectations");
  const [prose, setProse] = useState<string>("");

  // useUnload();
  useEffect(() => {
    window.document.title = t("document.title");
  }, [t]);
  useEffect(() => {
    if (isReview(review)) {
      const ontopic_analysis = review.analysis.find((analysis) =>
        isOnTopicReviewData(analysis)
      );
      if (
        ontopic_analysis &&
        ontopic_analysis.response?.html &&
        ["sentences", "organization"].includes(tool)
      ) {
        setProse(ontopic_analysis.response.html);
      } else {
        setProse(review.segmented);
      }
    } else {
      setProse("");
    }
  }, [review, tool]);

  const civilToneFeature = useCivilToneEnabled();
  const ethosFeature = useEthosEnabled();
  const expectationsFeature = useExpectationsEnabled();
  const ideasFeature = useKeyIdeasEnabled();
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
          <Tabs variant="underline" className="justify-content-around">
            {expectationsFeature || argumentsFeature || logicalFlowFeature ? (
              <Tab eventKey="big_picture" title={t("tabs.big_picture")}>
                <ButtonToolbar className="m-3 d-flex justify-content-around">
                  {expectationsFeature ? (
                    <ExpectationsButton
                      active={tool === "expectations"}
                      onClick={() => setTool("expectations")}
                    />
                  ) : null}
                  {ideasFeature ? (
                    <KeyIdeasButton
                      active={tool === "key_ideas"}
                      onClick={() => setTool("key_ideas")}
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
              </Tab>
            ) : null}
            {true ? (
              <Tab eventKey="fine_tuning" title={t("tabs.fine_tuning")}>
                <ButtonToolbar className="m-3 d-flex justify-content-around">
                  {paragraphClarityFeature ? (
                    <ParagraphClarityButton
                      active={tool === "paragraph_clarity"}
                      onClick={() => setTool("paragraph_clarity")}
                    />
                  ) : null}
                  {sentencesFeature ? (
                    <SentencesButton
                      active={tool === "sentence_density"}
                      onClick={() => setTool("sentence_density")}
                    />
                  ) : null}
                  {professionalToneFeature ? (
                    <ProfessionalToneButton
                      active={tool === "professional_tone"}
                      onClick={() => setTool("professional_tone")}
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
                      <Dropdown.Toggle variant="outline-primary">
                        <Stack>
                          {null}
                          <span>{t("additional_tools.title")}</span>
                        </Stack>
                      </Dropdown.Toggle>
                    </OverlayTrigger>
                    <Dropdown.Menu>
                      {sourcesFeature ? (
                        <Dropdown.Item
                          onClick={() => setTool("sources")}
                          active={tool === "sources"}
                        >
                          <h6 className="text-primary">{t("sources.title")}</h6>
                          <div className="text-wrap">
                            {t("sources.tooltip")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {ethosFeature ? (
                        <Dropdown.Item
                          onClick={() => setTool("ethos")}
                          active={tool === "ethos"}
                        >
                          <h6 className="text-primary">{t("ethos.title")}</h6>
                          <div className="text-wrap">{t("ethos.tooltip")}</div>
                        </Dropdown.Item>
                      ) : null}
                      {pathosFeature ? (
                        <Dropdown.Item
                          onClick={() => setTool("pathos")}
                          active={tool === "pathos"}
                        >
                          <h6 className="text-primary">{t("pathos.title")}</h6>
                          <div className="text-wrap">{t("pathos.tooltip")}</div>
                        </Dropdown.Item>
                      ) : null}
                      {organizationFeature ? (
                        <Dropdown.Item
                          onClick={() => setTool("organization")}
                          active={tool === "organization"}
                        >
                          <h6 className="text-primary">
                            {t("organization.title")}
                          </h6>
                          <div className="text-wrap">
                            {t("organization.tooltip")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {civilToneFeature ? (
                        <Dropdown.Item
                          onClick={() => setTool("civil_tone")}
                          active={tool === "civil_tone"}
                        >
                          <h6 className="text-primary">
                            {t("civil_tone.title")}
                          </h6>
                          <div className="text-wrap">
                            {t("civil_tone.tooltip")}
                          </div>
                        </Dropdown.Item>
                      ) : null}
                      {impressionsFeature ? (
                        <Dropdown.Item
                          onClick={() => setTool("impressions")}
                          active={tool === "impressions"}
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
              </Tab>
            ) : null}
          </Tabs>
          <div className="position-relative flex-grow-1 overflow-auto">
            {(!tool || tool === "null") && <NullTool />}
            {tool === "lines_of_arguments" && <LinesOfArguments />}
            {tool === "logical_flow" && <LogicalFlow />}
            {tool === "civil_tone" && <CivilTone />}
            {tool === "ethos" && <Ethos />}
            {tool === "expectations" && <Expectations />}
            {/* {tool === "global_coherence" && <GlobalCoherence />} */}
            {tool === "impressions" && <NullTool />}
            {tool === "key_ideas" && <KeyIdeas />}
            {tool === "organization" && <Organization />}
            {tool === "sentence_density" && <Sentences />}
            {tool === "paragraph_clarity" && <ParagraphClarity />}
            {tool === "pathos" && <Pathos />}
            {tool === "professional_tone" && <ProfessionalTone />}
            {tool === "sources" && <Sources />}
            {/* Add more tool displays here. */}
          </div>
          <Legal />
        </aside>
      </Split>
    </ReviewProvider>
  );
};
