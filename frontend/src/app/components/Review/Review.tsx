import { FC, useEffect, useState } from "react";
import { Container, Dropdown, Stack } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Split from "react-split";
import { isReview } from "../../../server/model/review";
import { useReview } from "../../service/review.service";
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
  const sentencesFeature = true;
  const coherenceFeature = true;
  const ideasFeature = true;
  const impressionsFeature = false;
  const argumentsFeature = true;
  const expectationsFeature = false; // moving to own
  const organizationFeature = true;

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
            <Container className="d-flex justify-content-between align-items-baseline border-bottom mb-2">
              <span className="text-primary">{tt("tool.tab.review")}</span>
              <Logo />
            </Container>
          </header>
          {/* <Card as={"aside"} className="my-1"> */}
          {/* <Card.Header className="px-0">
            <Container className="d-flex justify-content-between align-items-baseline border-bottom mb-2">
              <span className="text-primary">{tt("tool.tab.review")}</span>
              <Logo />
            </Container> */}
          {/* <Navbar>
            <Container>
              <Nav defaultActiveKey={"review"} variant="tabs">
                <Nav.Item>
                  <Nav.Link eventKey="generate" disabled>
                    {tt("tool.tab.generate")}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="review">
                    {tt("tool.tab.review")}
                    <FontAwesomeIcon
                      icon={faArrowUpRightFromSquare}
                      className="ms-1"
                    />
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="refine" disabled>
                    {tt("tool.tab.refine")}
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              <Navbar.Brand>
                <Logo />
              </Navbar.Brand>
            </Container>
          </Navbar> */}
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
          {/* </Card.Header> */}
          <div className="position-relative bg-light flex-grow-1 overflow-auto">
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
          {/* <footer className="border-top"></footer>} */}
          {/* </Card> */}
        </aside>
      </Split>
    </ReviewProvider>
  );
};
