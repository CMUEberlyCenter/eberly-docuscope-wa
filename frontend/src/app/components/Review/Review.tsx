import { FC, useEffect, useState } from "react";
import { Container, Dropdown, Nav, Navbar, Stack } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Split from "react-split";
import { isReview } from "../../../server/model/review";
import { useReview } from "../../service/review.service";
import {
  useGlobalFeatureArguments,
  useGlobalFeatureImpressions,
  useGlobalFeatureKeyIdeas,
  useGlobalFeatureLogicalProgression,
  useGlobalFeatureSentenceDensity,
  useGlobalFeatureTermMatrix,
} from "../../service/settings.service";
import { useWritingTask } from "../../service/writing-task.service";
import { Logo } from "../Logo/Logo";
import { TaskViewerButton } from "../TaskViewer/TaskViewer";
import { UserTextView } from "../UserTextView/UserTextView";
import { Arguments, ArgumentsTitle } from "./Arguments";
import { GlobalCoherence, GlobalCoherenceTitle } from "./GlobalCoherence";
import { KeyIdeas, KeyIdeasTitle } from "./KeyIdeas";
import { Organization, OrganizationTitle } from "./Organization";
import "./Review.scss";
import { ReviewProvider } from "./ReviewContext";
import { Sentences, SentencesTitle } from "./Sentences";

type Tool =
  | "null"
  | "sentences"
  | "global_coherence"
  | "key_ideas"
  | "arguments"
  | "expectations"
  | "organization"
  | "impressions";

const NullTitle: FC = () => (
  <Translation ns={"review"}>{(t) => t("null.title")}</Translation>
);

type ToolProps = { tool: Tool };
const ToolTitle: FC<ToolProps> = ({ tool }) => {
  switch (tool) {
    case "sentences":
      return <SentencesTitle />;
    case "global_coherence":
      return <GlobalCoherenceTitle />;
    case "key_ideas":
      return <KeyIdeasTitle />;
    case "arguments":
      return <ArgumentsTitle />;
    case "expectations":
      return (
        <Translation ns={"review"}>
          {(t) => <>{t("expectations.title")}</>}
        </Translation>
      );
    case "organization":
      return <OrganizationTitle />;
    case "impressions":
      return (
        <Translation ns={"review"}>
          {(t) => <>{t("impressions.title")}</>}
        </Translation>
      );
    case "null":
    default:
      return <NullTitle />;
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
  const writingTask = useWritingTask();
  const [tool, setTool] = useState<Tool>("null");
  const [prose, setProse] = useState<string>("");

  useEffect(() => {
    window.document.title = t("document.title");
  }, [t]);
  useEffect(() => {
    if (isReview(review)) {
      const ontopic_doc = review.analysis.find(
        (analysis) => analysis.tool === "ontopic"
      )?.response.html;
      if (ontopic_doc && ["sentences", "organization"].includes(tool)) {
        setProse(ontopic_doc);
      } else {
        setProse(review.document);
      }
    } else {
      setProse("");
    }
  }, [review, tool]);

  /* <!-- TODO limit tool availability based on writing task/settings --> */
  const sentencesFeature = useGlobalFeatureSentenceDensity();
  const coherenceFeature = useGlobalFeatureLogicalProgression();
  const ideasFeature = useGlobalFeatureKeyIdeas();
  const impressionsFeature = useGlobalFeatureImpressions();
  const argumentsFeature = useGlobalFeatureArguments();
  const expectationsFeature = false; // moving to own
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
                <Nav.Item className="active fw-bolder text-primary ms-3">
                  {tt("tool.tab.review")}
                </Nav.Item>
              </Nav>
              <Navbar.Brand>
                <Logo />
              </Navbar.Brand>
            </Navbar>
          </header>
          <Dropdown className="d-flex justify-content-start mx-2 mb-2">
            <Dropdown.Toggle variant="white" className="select-button shadow">
              <div>
                <ToolTitle tool={tool} />
              </div>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>
                <NullTitle />
              </Dropdown.Header>
              {argumentsFeature && (
                <Dropdown.Item onClick={() => onSelect("arguments")}>
                  <ToolTitle tool="arguments" />
                </Dropdown.Item>
              )}
              {ideasFeature && (
                <Dropdown.Item onClick={() => onSelect("key_ideas")}>
                  <ToolTitle tool="key_ideas" />
                </Dropdown.Item>
              )}
              {coherenceFeature && (
                <Dropdown.Item onClick={() => onSelect("global_coherence")}>
                  <ToolTitle tool="global_coherence" />
                </Dropdown.Item>
              )}
              {organizationFeature && (
                <Dropdown.Item onClick={() => onSelect("organization")}>
                  <ToolTitle tool="organization" />
                </Dropdown.Item>
              )}
              {sentencesFeature && (
                <Dropdown.Item onClick={() => onSelect("sentences")}>
                  <ToolTitle tool="sentences" />
                </Dropdown.Item>
              )}
              {expectationsFeature && (
                <Dropdown.Item onClick={() => onSelect("expectations")}>
                  <ToolTitle tool="expectations" />
                </Dropdown.Item>
              )}
              {impressionsFeature && (
                <Dropdown.Item onClick={() => onSelect("impressions")}>
                  <ToolTitle tool="impressions" />
                </Dropdown.Item>
              )}
              {/* Add tool title select option here. */}
            </Dropdown.Menu>
          </Dropdown>
          <div className="position-relative flex-grow-1 overflow-auto">
            {(!tool || tool === "null") && <NullTool />}
            {tool === "arguments" && <Arguments />}
            {tool === "expectations" && <NullTool />}
            {tool === "global_coherence" && <GlobalCoherence />}
            {tool === "impressions" && <NullTool />}
            {tool === "key_ideas" && <KeyIdeas />}
            {tool === "organization" && <Organization />}
            {tool === "sentences" && <Sentences />}
            {/* Add more tool displays here. */}
          </div>
          {writingTask && (
            <Container as={"footer"} className="border-top py-2">
              <TaskViewerButton />
            </Container>
          )}
        </aside>
      </Split>
    </ReviewProvider>
  );
};
