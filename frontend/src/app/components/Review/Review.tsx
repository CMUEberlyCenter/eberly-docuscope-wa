import { FC, HTMLProps, useEffect, useState } from "react";
import { Dropdown, Nav, Navbar, Stack } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Split from "react-split";
import { isReview } from "../../../server/model/review";
// import { useUnload } from "../../service/beforeUnload.service";
import { isOnTopicReviewData } from "../../../lib/ReviewResponse";
import { useReview } from "../../service/review.service";
import {
  useGlobalFeatureCivilTone,
  useGlobalFeatureEthos,
  useGlobalFeatureExpectations,
  useGlobalFeatureImpressions,
  useGlobalFeatureKeyIdeas,
  useGlobalFeatureLinesOfArguments,
  useGlobalFeatureLogicalFlow,
  useGlobalFeaturePathos,
  useGlobalFeatureProfessionalTone,
  useGlobalFeatureSentenceDensity,
  useGlobalFeatureSources,
  useGlobalFeatureTermMatrix,
} from "../../service/settings.service";
import { Legal } from "../Legal/Legal";
import { Logo } from "../Logo/Logo";
import { UserTextView } from "../UserTextView/UserTextView";
import { Expectations, ExpectationsTitle } from "./Expectations";
// import { GlobalCoherence, GlobalCoherenceTitle } from "./GlobalCoherence";
import { CivilTone, CivilToneTitle } from "./CivilTone";
import { Ethos, EthosTitle } from "./Ethos";
import { KeyIdeas, KeyIdeasTitle } from "./KeyIdeas";
import { LinesOfArguments, LinesOfArgumentsTitle } from "./LinesOfArguments";
import { LogicalFlow, LogicalFlowTitle } from "./LogicalFlow";
import { Organization, OrganizationTitle } from "./Organization";
import { Pathos, PathosTitle } from "./Pathos";
import { ProfessionalTone, ProfessionalToneTitle } from "./ProfessionalTone";
import "./Review.scss";
import { ReviewProvider } from "./ReviewContext";
import { Sentences, SentencesTitle } from "./Sentences";
import { Sources, SourcesTitle } from "./Sources";

type Tool =
  | "civil_tone"
  | "ethos"
  | "expectations"
  | "global_coherence"
  | "key_ideas"
  | "arguments"
  | "logical_flow"
  | "organization"
  | "pathos"
  | "professional_tone"
  | "sentences"
  | "sources"
  | "impressions"
  | "null";

const NullTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => <span {...props}>{t("null.title")}</span>}
  </Translation>
);

type ToolProps = HTMLProps<HTMLSpanElement> & { tool: Tool };
const ToolTitle: FC<ToolProps> = ({ tool, ...props }) => {
  switch (tool) {
    case "civil_tone":
      return <CivilToneTitle {...props} />;
    case "logical_flow":
      return <LogicalFlowTitle {...props} />;
    case "pathos":
      return <PathosTitle {...props} />;
    case "professional_tone":
      return <ProfessionalToneTitle {...props} />;
    case "sources":
      return <SourcesTitle {...props} />;
    case "ethos":
      return <EthosTitle {...props} />;
    case "sentences":
      return <SentencesTitle {...props} />;
    // case "global_coherence":
    //   return <GlobalCoherenceTitle {...props} />;
    case "key_ideas":
      return <KeyIdeasTitle {...props} />;
    case "arguments":
      return <LinesOfArgumentsTitle {...props} />;
    case "expectations":
      return <ExpectationsTitle {...props} />;
    case "organization":
      return <OrganizationTitle {...props} />;
    case "impressions":
      return (
        <Translation ns={"review"}>
          {(t) => <span {...props}>{t("impressions.title")}</span>}
        </Translation>
      );
    case "null":
    default:
      return <NullTitle {...props} />;
  }
};

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
  // const settings = useSettings();
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

  /* <!-- TODO limit tool availability based on writing task/settings --> */
  const civilToneFeature = useGlobalFeatureCivilTone();
  const ethosFeature = useGlobalFeatureEthos();
  const expectationsFeature = useGlobalFeatureExpectations();
  const ideasFeature = useGlobalFeatureKeyIdeas();
  const argumentsFeature = useGlobalFeatureLinesOfArguments();
  const logicalFlowFeature = useGlobalFeatureLogicalFlow();
  const pathosFeature = useGlobalFeaturePathos();
  const professionalToneFeature = useGlobalFeatureProfessionalTone();
  const sentencesFeature = useGlobalFeatureSentenceDensity();
  const sourcesFeature = useGlobalFeatureSources();
  const impressionsFeature = useGlobalFeatureImpressions();
  const organizationFeature = useGlobalFeatureTermMatrix();

  const onSelect = (id: Tool) => {
    setTool(id);
  };

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
          <Dropdown className="d-flex justify-content-start mx-2 mb-2">
            <Dropdown.Toggle
              variant="primary"
              className="select-button shadow-sm"
            >
              <div>
                <ToolTitle tool={tool} />
              </div>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>
                <NullTitle />
              </Dropdown.Header>
              {expectationsFeature && (
                <Dropdown.Item onClick={() => onSelect("expectations")}>
                  <ToolTitle tool="expectations" className="text-primary" />
                </Dropdown.Item>
              )}
              {argumentsFeature && (
                <Dropdown.Item onClick={() => onSelect("arguments")}>
                  <ToolTitle tool="arguments" className="text-primary" />
                </Dropdown.Item>
              )}
              {ideasFeature && (
                <Dropdown.Item onClick={() => onSelect("key_ideas")}>
                  <ToolTitle tool="key_ideas" className="text-primary" />
                </Dropdown.Item>
              )}
              {logicalFlowFeature && (
                <Dropdown.Item onClick={() => onSelect("logical_flow")}>
                  <ToolTitle tool="logical_flow" className="text-primary" />
                </Dropdown.Item>
              )}
              {organizationFeature && (
                <Dropdown.Item onClick={() => onSelect("organization")}>
                  <ToolTitle tool="organization" className="text-primary" />
                </Dropdown.Item>
              )}
              {sentencesFeature && (
                <Dropdown.Item onClick={() => onSelect("sentences")}>
                  <ToolTitle tool="sentences" className="text-primary" />
                </Dropdown.Item>
              )}
              {impressionsFeature && (
                <Dropdown.Item onClick={() => onSelect("impressions")}>
                  <ToolTitle tool="impressions" className="text-primary" />
                </Dropdown.Item>
              )}
              {pathosFeature && (
                <Dropdown.Item onClick={() => onSelect("pathos")}>
                  <ToolTitle tool="pathos" className="text-primary" />
                </Dropdown.Item>
              )}
              {ethosFeature && (
                <Dropdown.Item onClick={() => onSelect("ethos")}>
                  <ToolTitle tool="ethos" className="text-primary" />
                </Dropdown.Item>
              )}
              {civilToneFeature && (
                <Dropdown.Item onClick={() => onSelect("civil_tone")}>
                  <ToolTitle tool="civil_tone" className="text-primary" />
                </Dropdown.Item>
              )}
              {professionalToneFeature && (
                <Dropdown.Item onClick={() => onSelect("professional_tone")}>
                  <ToolTitle
                    tool="professional_tone"
                    className="text-primary"
                  />
                </Dropdown.Item>
              )}
              {sourcesFeature && (
                <Dropdown.Item onClick={() => onSelect("sources")}>
                  <ToolTitle tool="sources" className="text-primary" />
                </Dropdown.Item>
              )}
              {/* Add tool title select option here. */}
            </Dropdown.Menu>
          </Dropdown>
          <div className="position-relative flex-grow-1 overflow-auto">
            {(!tool || tool === "null") && <NullTool />}
            {tool === "arguments" && <LinesOfArguments />}
            {tool === "logical_flow" && <LogicalFlow />}
            {tool === "civil_tone" && <CivilTone />}
            {tool === "ethos" && <Ethos />}
            {tool === "expectations" && <Expectations />}
            {/* {tool === "global_coherence" && <GlobalCoherence />} */}
            {tool === "impressions" && <NullTool />}
            {tool === "key_ideas" && <KeyIdeas />}
            {tool === "organization" && <Organization />}
            {tool === "sentences" && <Sentences />}
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
