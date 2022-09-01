/**
 * @fileoverview Student facing interface.
 *
 * Student view has a tool bar header and a status bar footer,
 * both of which should always be visible.
 * The main area is composed of two major regions: the tools and the text.
 * The text is the user's text either in an editor or in an interactive
 * area showing the results of tagging.
 * The tools are arranged in tabs.
 * Editor text is also cached in sessionStorage.
 */
import * as d3 from "d3";
import React, {
  createRef,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import {
  Badge,
  Card,
  Container,
  Form,
  Nav,
  Navbar,
  NavDropdown,
  OverlayTrigger,
  Popover,
  Tab,
  Tabs,
} from "react-bootstrap";
import { createEditor, Descendant } from "slate";
import {
  Editable,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from "slate-react";
import Clarity from "../../components/Clarity/Clarity";
import Coherence from "../../components/Coherence/Coherence";
import Divider from "../../components/Divider/Divider";
import Expectations from "../../components/Expectations/Expectations";
import Impressions from "../../components/Impressions/Impressions";
import LockSwitch from "../../components/LockSwitch/LockSwitch";
import DocuScopeAbout from "../../DocuScopeAbout";
import DocuScopeReset from "../../DocuScopeReset";
import { currentTool } from "../../service/current-tool.service";
import {
  editorState,
  editorText,
  useEditorState,
} from "../../service/editor-state.service";
import { isTaggerResult, useTaggerResults } from "../../service/tagger.service";
import TopicHighlighter from "../../TopicHighlighter";

import "../../../css/topics.css";
import "./StudentView.scss";

import { faBook, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import GettingStartedModal from "../../components/HelpDialogs/GettingStartedModal";
import { HelpModal } from "../../components/HelpDialogs/HelpModal";
import TroubleshootingModal from "../../components/HelpDialogs/TroubleshootingModal";
import {
  showGettingStarted,
  showHelp,
  showTroubleshooting,
} from "../../service/help.service";

// The imports below are purely to support the serialize function. Should probably import
// from service
import { Node } from "slate";

// Should probably import from the service
const serialize = (nodes: Descendant[]): string => {
  return nodes.map((n: Descendant) => Node.string(n)).join("\n\n");
};

/**
 * For handling clicks on the tagged text for the impressions tool.
 * It will reveal the tag for the clicked on pattern while hiding
 * all other tags.
 * @param evt mouse event that triggers this handler
 */
function click_select(evt: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
  let target: HTMLElement | null = evt.target as HTMLElement;
  while (target && !target.getAttribute("data-key")) {
    // check ancestors until one with a data-key is found.
    target = target.parentElement;
  }
  const key = target?.getAttribute("data-key");
  if (target && key && key.trim()) {
    // see if it is already selected.
    const isSelected = d3.select(target).classed("selected_text");
    // clear all selected text.
    d3.selectAll(".selected_text").classed("selected_text", false);
    d3.selectAll(".cluster_id").classed("d_none", true);
    // if it was not previously selected, select it.
    // otherwise leave it as unselected.
    if (!isSelected) {
      d3.select(target).classed("selected_text", true);
      d3.select(target).select("sup.cluster_id").classed("d_none", false);
    }
  }
}

/**
 * The student facing application interface.
 * @param props `api` is for passing down the function that makes "api" calls.
 * @returns
 */
const StudentView = (props: { 
    api: apiCall,
    ruleManager: any,
    html: string,
    htmlSentences: string
  }) => {

  const topicHighlighter=new TopicHighlighter ();

  // Status handlers
  const [status, setStatus] = useState("Application ready, rules loaded");
  const [language, setLanguage] = useState("ENG");

  const navId = useId();
  const selectId = useId();
  //const [status, setStatus] = useState('');
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  // on tab switch update current and broadcast.
  const switchTab = (key: string | null) => {
    setCurrentTab(key);
    currentTool.next(key);
    topicHighlighter.clearAllHighlights();
  };
  const [editor] = useState(() => withReact(createEditor()));
  const editable = useEditorState();
  // Set initial value to stored session data or empty.
  const [editorValue, setEditorValue] = useState<Descendant[]>(
    // get from session storage
    JSON.parse(sessionStorage.getItem("content") ?? "null") || [
      // or "empty" editor text
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
    ]
  );

  const [editorTextValue, setEditorTextValue] = useState<string>("");

  useEffect(() => {
    // Set editor text if initializing from session storage.
    // Necessary for analysis tool to receive the initial
    // text value.
    const content = sessionStorage.getItem("content");
    if (content) {
      editorText.next(JSON.parse(content));
      setEditorTextValue(serialize(JSON.parse(content)));
    }
  }, []); // [] dependency means this runs only once.

  // Resize panels
  const [toolWidth, setToolWidth] = useState<undefined | number>(undefined);
  const [toolSeparatorXPosition, setToolSeparatorXPosition] = useState<
    undefined | number
  >(undefined);
  const [toolSeparatorDragging, setToolSeparatorDragging] = useState(false);
  const toolRef = createRef<HTMLDivElement>();

  const onMouseDownTool = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    setToolSeparatorXPosition(event.clientX);
    setToolSeparatorDragging(true);
  };

  const onTouchStartTool = (event: React.TouchEvent<HTMLDivElement>) => {
    setToolSeparatorXPosition(event.touches[0].clientX);
    setToolSeparatorDragging(true);
  };

  const onMove = useCallback(
    (clientX: number) => {
      if (toolSeparatorDragging && toolWidth && toolSeparatorXPosition) {
        const width = toolWidth + clientX - toolSeparatorXPosition;
        setToolSeparatorXPosition(clientX);
        setToolWidth(width);
      }
    },
    [toolSeparatorDragging, toolSeparatorXPosition, toolWidth]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (toolSeparatorDragging) {
        e.preventDefault;
      }
      onMove(e.clientX);
    },
    [toolSeparatorDragging, onMove]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => onMove(e.touches[0].clientX),
    [onMove]
  );

  const onMouseUp = useCallback(() => {
    if (toolSeparatorDragging) {
      setToolSeparatorDragging(false);
      if (toolRef.current) {
        setToolWidth(toolRef.current.clientWidth);
        toolRef.current.style.width = `${toolWidth}px`;
      }
    }
  }, [toolRef, toolSeparatorDragging, toolWidth]);

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp, onTouchMove]);

  useEffect(() => {
    if (toolRef.current) {
      if (!toolWidth) {
        setToolWidth(toolRef.current.clientWidth);
        //return;
      }
      toolRef.current.style.width = `${toolWidth}px`;
    }
  }, [toolRef, toolWidth]);

  // Rendering elements in the editor.
  const renderElement = useCallback(
    ({ attributes, children, element }: RenderElementProps) => {
      switch (element.type) {
        case "block-quote":
          return <blockquote {...attributes}>{children}</blockquote>;
        case "bulleted-list":
          return <ul {...attributes}>{children}</ul>;
        case "heading-one":
          return <h1 {...attributes}>{children}</h1>;
        case "heading-two":
          return <h2 {...attributes}>{children}</h2>;
        case "list-item":
          return <li {...attributes}>{children}</li>;
        case "numbered-list":
          return <ol {...attributes}>{children}</ol>;
        default:
          return <p {...attributes}>{children}</p>;
      }
    },
    []
  );
  // Rendering leaf items in the editor.
  const renderLeaf = useCallback(
    ({ attributes, children, leaf }: RenderLeafProps) => {
      switch (leaf.type) {
        case "bold":
          return <strong {...attributes}>{children}</strong>;
        case "code":
          return <code {...attributes}>{children}</code>;
        case "italic":
          return <em {...attributes}>{children}</em>;
        case "underlined":
          return <u {...attributes}>{children}</u>;
        case "highlight":
          return (
            <span {...attributes} style={{ backgroundColor: "#ffeeba" }}>
              {children}
            </span>
          );
        default:
          return <span {...attributes}>{children}</span>;
      }
    },
    []
  );
  // Note: Newer versions of the slate editor did away with markings renderer.

  // Tool bar menu handler.
  const onNavSelect = (eventKey: string | null) => {
    if (eventKey === "resetData") {
      setShowReset(true);
    }

    if (eventKey === "resetView") {
      if (toolRef.current) {
        toolRef.current.style.width = "";
        setToolWidth(toolRef.current.clientWidth);
      }
      return;
    }

    if (eventKey === "showHelp") {
      showHelp(true);
      return;
    }

    if (eventKey === "showAbout") {
      setShowAbout(true);
      return;
    }

    if (eventKey === "showGettingStarted") {
      showGettingStarted(true);
      return;
    }

    if (eventKey === "showTroubleshooting") {
      console.log("showTrouble");
      showTroubleshooting(true);
      return;
    }
  };

  const tagging = useTaggerResults();

  // should the special tagged text rendering be used? (Mike's panel)
  const showTaggedText =
    currentTab === "impressions" && !editable && isTaggerResult(tagging);
  let showOnTopicText = false;

  const taggedTextContent = isTaggerResult(tagging) ? tagging.html_content : "";

  let topicTaggedContent;

  // Every other panel that needs it. We'll clean up the logic later
  if (showTaggedText == false) {
    showOnTopicText =
      currentTab === "coherence" && !editable && props.html != null;
    if (showOnTopicText == false) {
      showOnTopicText =
        currentTab === "clarity" && !editable && props.html != null;
    }
  }

  if (showOnTopicText == true) {
    topicTaggedContent = (
      <div
        className="tagged-text"
        dangerouslySetInnerHTML={{ __html: props.html }}
      ></div>
    );
  }

  // Special rendering of tagger results.
  const taggedText = (
    <React.Fragment>
      <div className="d-flex align-items-start">
        <h4>Tagged Text:&nbsp;</h4>
        <OverlayTrigger
          trigger="focus"
          placement="right"
          overlay={
            <Popover>
              <Popover.Header as="h3">Notes on Usage</Popover.Header>
              <Popover.Body>
                <p>
                  Please note that this is how DocuScope sees your text and it
                  might appear slightly different than your text, toggle the
                  &quot;Edit Mode&quot; to see your original text.
                </p>
                <p>
                  In the tagged text, you can click on words and phrases to see
                  its category tag. Not all words or phrases have tags.
                  Selecting a category from the Dictionary Categories tree will
                  highlight all of the instances of the selected categories in
                  the tagged text.
                </p>
              </Popover.Body>
            </Popover>
          }
        >
          <Badge bg="info">
            <i className="fa-solid fa-info" />
          </Badge>
        </OverlayTrigger>
      </div>
      <div
        className="tagged-text"
        onClick={(evt) => click_select(evt)}
        dangerouslySetInnerHTML={{ __html: taggedTextContent }}
      ></div>
    </React.Fragment>
  );

  //>--------------------------------------------------------

  const [showAbout, setShowAbout] = useState(false);

  let about;

  const onCloseAboutPage = () => {
    setShowAbout(false);
  };

  if (showAbout == true) {
    about = (
      <DocuScopeAbout
        onCloseAboutPage={onCloseAboutPage}
        ruleManager={props.ruleManager}
      />
    );
  }

  //>--------------------------------------------------------

  const [showReset, setShowReset] = useState(false);

  let reset;

  const onCloseResetDialog = (afirm: boolean) => {
    setShowReset(false);
    if (afirm == true) {
      // Reset the data from the template
      props.ruleManager.reset();

      // Reset the interface
      switchTab("expectations");
    }
  };

  if (showReset == true) {
    about = <DocuScopeReset onCloseResetDialog={onCloseResetDialog} />;
  }

  //>--------------------------------------------------------

  const [showParagraphSelector, setShowParagraphSelector] = useState(false);

  let paragraphselector;

  if (showParagraphSelector == true) {
    paragraphselector = (
      <Form.Group>
        <Form.Select>
          {[1, 2, 3].map((num) => (
            <option key={`${selectId}-${num}`} value={num}>
              {num}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    );
  } else {
    paragraphselector = <div className="spacer"></div>;
  }

  //>--------------------------------------------------------

  return (
    <div className="d-flex flex-column vh-100 vw-100 m-0 p-0">
      {/* Whole page application */}
      <header className="d-flex bg-dark">
        <Navbar variant="dark">
          <Container>
            <Navbar.Brand href="#">DocuScope Write &amp; Audit</Navbar.Brand>
            <Navbar.Toggle aria-controls={navId}></Navbar.Toggle>
            <Navbar.Collapse id={navId}>
              <Nav className="me-auto" onSelect={onNavSelect}>
                <Nav.Link eventKey={"resetData"}>Reset</Nav.Link>
                <NavDropdown title="View" menuVariant="dark">
                  <NavDropdown.Item eventKey={"resetView"} active={false}>
                    Reset View
                  </NavDropdown.Item>
                </NavDropdown>
                <NavDropdown title="Help" menuVariant="dark">
                  <NavDropdown.Item eventKey={"showHelp"}>
                    Show Help
                  </NavDropdown.Item>
                  <NavDropdown.Item eventKey={"showGettingStarted"}>
                    Getting Started
                  </NavDropdown.Item>
                  <NavDropdown.Item eventKey={"showTroubleshooting"}>
                    Troubleshooting
                  </NavDropdown.Item>
                  <NavDropdown.Item eventKey={"showAbout"}>
                    About
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>
      <main className="d-flex flex-grow-1 bg-white justify-content-start overflow-hidden">
        <aside ref={toolRef} className="d-flex flex-column tools-pane">
          <Tabs className="mt-1 px-2" onSelect={(key) => switchTab(key)}>
            <Tab eventKey={"expectations"} title="Expectations">
              <Expectations
                api={props.api}
                ruleManager={props.ruleManager}
                editorValue={editorTextValue}
              />
            </Tab>
            <Tab eventKey={"coherence"} title="Coherence">
              <Coherence api={props.api} ruleManager={props.ruleManager} />
            </Tab>
            <Tab eventKey={"clarity"} title="Clarity">
              <Clarity api={props.api} ruleManager={props.ruleManager} htmlSentences={props.htmlSentences} />
            </Tab>
            <Tab eventKey={"impressions"} title="Impressions">
              <Impressions />
            </Tab>
          </Tabs>
        </aside>

        <Divider
          onMouseDown={onMouseDownTool}
          onTouchEnd={onMouseUp}
          onTouchStart={onTouchStartTool}
        />

        <Card as="article" className="editor-pane overflow-hidden flex-grow-1">
          <Card.Header className="d-flex justify-content-between">
            {paragraphselector}
            <LockSwitch
              checked={editable}
              label="Edit Mode:"
              onChange={(checked) => editorState.next(checked)}
            />
          </Card.Header>
          <Card.Body className="overflow-auto">
            {showTaggedText ? taggedText : ""}
            {topicTaggedContent}
            <Slate
              editor={editor}
              value={editorValue}
              onChange={(content: Descendant[]) => {
                // only if change is not selection change.
                if (
                  editor.operations.some((op) => "set_selection" !== op.type)
                ) {
                  editorText.next(content);
                  setEditorValue(content);
                  setEditorTextValue(serialize(content));
                  sessionStorage.setItem("content", JSON.stringify(content));
                }
              }}
            >
              <Editable
                className={showTaggedText || showOnTopicText ? "d-none" : ""}
                readOnly={!editable}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                placeholder={
                  editable
                    ? "Enter some text..."
                    : "Unlock and enter some text..."
                }
              />
            </Slate>
          </Card.Body>
        </Card>
      </main>
      <footer className="bg-dark statusbar">
        <div className="statusbar-status">{status}</div>
        <div className="statusbar-ruleversion">
          <FontAwesomeIcon
            icon={faBook}
            style={{ marginLeft: "2px", marginRight: "2px" }}
          />
          {props.ruleManager.getVersion()}
        </div>
        <div className="statusbar-language">
          <FontAwesomeIcon
            icon={faGlobe}
            style={{ marginLeft: "2px", marginRight: "2px" }}
          />
          {language}
        </div>
      </footer>
      {about}
      <HelpModal />
      <GettingStartedModal />
      <TroubleshootingModal />
    </div>
  );
};

export default StudentView;
