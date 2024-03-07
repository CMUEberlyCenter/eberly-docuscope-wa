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
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Container,
  Form,
  Nav,
  NavDropdown,
  Navbar,
  OverlayTrigger,
  Popover,
  Tab,
  Tabs,
} from "react-bootstrap";
import { Descendant, Editor, Range, Transforms, createEditor } from "slate";
import {
  DefaultLeaf,
  Editable,
  ReactEditor,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from "slate-react";
import ResetModal from "../../components/Reset/Reset";
import { clearAllHighlights } from "../../service/topic.service";
import Clarity from "../../components/Clarity/Clarity";
import Coherence from "../../components/Coherence/Coherence";
import Divider from "../../components/Divider/Divider";
import Expectations from "../../components/Expectations/Expectations";
import Impressions from "../../components/Impressions/Impressions";
import LockSwitch from "../../components/LockSwitch/LockSwitch";
import { Tool, currentTool } from "../../service/current-tool.service";
import {
  editorText,
  setEditorState,
  useEditorState,
} from "../../service/editor-state.service";
import { showAbout } from "../../service/help.service";
import { isTaggerResult, useTaggerResults } from "../../service/tagger.service";
import "./StudentView.scss";

// Commented out for Spring 2024 beta #46
// import { faBook, faGlobe } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Disable this doumentation to resolve #13 #14 #15
// import GettingStartedModal from "../../components/HelpDialogs/GettingStartedModal";
// import { HelpModal } from "../../components/HelpDialogs/HelpModal";
// import TroubleshootingModal from "../../components/HelpDialogs/TroubleshootingModal";
// import {
//   showGettingStarted,
//   showHelp,
//   showTroubleshooting,
// } from "../../service/help.service";

// The imports below are purely to support the serialize function. Should probably import
// from service
// import type DocuScopeRules from "../../../../js/DocuScopeRules";

import { serialize } from "../../service/editor-state.service";

// import { ScribeOption } from "../../components/ScribeOption/ScribeOption";
import { About } from "../../components/HelpDialogs/About";
import { Notes2Prose } from "../../components/scribe/Notes2Prose/Notes2Prose";
import { ScribeOption } from "../../components/scribe/ScribeOption/ScribeOption";
// import { VERSION } from "../../service/application.service"; // #46
import {
  SelectedNotesProse,
  assess,
  clarify,
  grammar,
  logicalFlowText,
  notes,
  showScribeOption,
  topicsAuditText,
  useAssessFeature,
  useScribe,
  useScribeAvailable,
  useScribeFeatureClarify,
  useScribeFeatureGrammar,
  useScribeFeatureLogicalFlow,
  useScribeFeatureNotes2Prose,
  useScribeFeatureTopics,
} from "../../service/scribe.service";
import { useConfiguration, useRules } from "../../service/rules.service";
import { rules$, useOnTopic } from "../../service/onTopic.service";
import { AssessExpectations } from "../../components/scribe/AssessExpectations/AssessExpectations";
import { FixGrammar } from "../../components/scribe/FixGrammar/FixGrammar";
import { Clarify } from "../../components/scribe/Clarify/Clarify";
import { LogicalFlowAudit } from "../../components/scribe/LogicalFlow/LogicalFlow";
import { TopicsAudit } from "../../components/scribe/TopicsAudit/TopicsAudit";
import { useSettings } from "../../service/settings.service";

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

function fixOnTopicHtml(topicData?: { html?: string } | null) {
  return topicData?.html?.replaceAll("_", " ") ?? "";
}

/**
 * The student facing application interface.
 * @param props `api` is for passing down the function that makes "api" calls.
 * @returns
 */
const StudentView = () => {
  const ruleManager = useRules();
  // Status handlers #46
  // const [status /*, setStatus*/] = useState("Application ready, rules loaded");
  // const [language /*, setLanguage*/] = useState("ENG");

  const settings = useSettings();
  const brand = <>{settings.brand}</>; // <>DocuScope Write &amp; Audit</>; // For #46
  const navId = useId();
  const selectId = useId();
  const defaultTab = "expectations";
  const [currentTab, setCurrentTab] = useState<Tool>(defaultTab);
  // on tab switch update current and broadcast.
  const switchTab = (key: Tool) => {
    const tab = key || defaultTab;
    setCurrentTab(tab);
    currentTool.next(tab);
    clearAllHighlights();
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
  const scribe = useScribe();
  const ScribeAvailable = useScribeAvailable();
  const notesFeature = useScribeFeatureNotes2Prose();
  const assessExpectationFeature = useAssessFeature();
  const grammarFeature = useScribeFeatureGrammar();
  const clarifyFeature = useScribeFeatureClarify();
  const logicalFlowFeature = useScribeFeatureLogicalFlow();
  const topicsFeature = useScribeFeatureTopics();

  useEffect(() => {
    // Set editor text if initializing from session storage.
    // Necessary for analysis tool to receive the initial
    // text value.
    const content = sessionStorage.getItem("content");
    if (content) {
      editorText.next(JSON.parse(content));
      setEditorTextValue(serialize(JSON.parse(content)));
    }
  }, []); // [] dependency means this runs only on initialization.

  // Resize panels
  const [toolWidth, setToolWidth] = useState<undefined | number>(undefined);
  useEffect(() => {
    // get initial value from storage if possible on mount.
    const width = sessionStorage.getItem("tool_width");
    if (width && !isNaN(Number(width))) {
      setToolWidth(Number(width));
    }
  }, []);
  // Update stored tool_width
  useEffect(
    () => sessionStorage.setItem("tool_width", String(toolWidth)),
    [toolWidth]
  );
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
    if (toolRef.current && toolWidth) {
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
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    switch (props.leaf.type) {
      case "bold":
        return <strong {...props.attributes}>{props.children}</strong>;
      case "code":
        return <code {...props.attributes}>{props.children}</code>;
      case "italic":
        return <em {...props.attributes}>{props.children}</em>;
      case "underlined":
        return <u {...props.attributes}>{props.children}</u>;
      case "highlight":
        return (
          <span {...props.attributes} style={{ backgroundColor: "#ffeeba" }}>
            {props.children}
          </span>
        );
      // case "selected":
      //   return <span {...props.attributes} style={{ backgroundColor: "rgba(255,0,255,0.5)"}}>
      //     {props.children}
      //   </span>
      default:
        return <DefaultLeaf {...props} />;
    }
  }, []);
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

    // if (eventKey === "showHelp") {
    //   showHelp(true);
    //   return;
    // }

    if (eventKey === "showAbout") {
      showAbout(true);
      return;
    }

    if (eventKey === "showScribeOption") {
      showScribeOption();
      return;
    }

    // if (eventKey === "showGettingStarted") {
    //   showGettingStarted(true);
    //   return;
    // }

    // if (eventKey === "showTroubleshooting") {
    //   console.log("showTrouble");
    //   showTroubleshooting(true);
    //   return;
    // }
  };

  const { data: configuration } = useConfiguration();
  const onTopic = useOnTopic();

  useEffect(() => {
    rules$.next(ruleManager);
  }, [ruleManager]);

  const tagging = useTaggerResults();

  // should the special tagged text rendering be used? (Impressions panel)
  const showDocuScopeTaggedText =
    currentTab === "impressions" && !editable && isTaggerResult(tagging);

  const taggedDocuScopeTextContent = isTaggerResult(tagging)
    ? tagging.html_content
    : "";

  // Every other panel that needs it. We'll clean up the logic later because the currentTab clause doesn't make any difference anymore
  const showOnTopicText =
    currentTab !== "impressions" && !editable && Boolean(onTopic?.html);

  // Special rendering of tagger results.
  const taggedDocuScopeText = (
    <React.Fragment>
      <div className="d-flex align-items-start">
        <h4>Tagged Text:&nbsp;</h4>
        <OverlayTrigger
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
      <hr />
      <div
        className="tagged-text"
        onClick={(evt) => click_select(evt)}
        dangerouslySetInnerHTML={{ __html: taggedDocuScopeTextContent }}
      ></div>
    </React.Fragment>
  );

  //>--------------------------------------------------------

  const [showReset, setShowReset] = useState(false);

  const onCloseResetDialog = (afirm: boolean) => {
    setShowReset(false);
    if (afirm) {
      // Reset the data from the template
      ruleManager?.reset();
      rules$.next(ruleManager);

      // Reset the interface
      switchTab("expectations");
    }
  };

  //>--------------------------------------------------------

  const [showParagraphSelector /*, setShowParagraphSelector*/] =
    useState(false);

  const paragraphselector = showParagraphSelector ? (
    <Form.Group>
      <Form.Select>
        {[1, 2, 3].map((num) => (
          <option key={`${selectId}-${num}`} value={num}>
            {num}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  ) : (
    <></>
  );

  //>--------------------------------------------------------

  /**
   * Note: at this point the text is as-is, including whatever extended characters were included.
   * This also means any single and double quotes
   */
  const globalUpdate = (_text: string) => {
    // For now if someone requests (or really, forces) an update, let's switch
    // the editor to read-only mode for now

    // 1. The edit toggle needs to be switched to off
    setEditorState(false);
    // This should trigger the appropriate actions.
  };

  //>--------------------------------------------------------
  const [zoom, setZoom] = useState<number>(100);

  const updateSelection = (notes: SelectedNotesProse) => {
    if (notes.prose && notes.range) {
      ReactEditor.focus(editor);
      const start = Range.end(notes.range);
      // Using insertNodes adds appropriate whitespace and has select flag
      Transforms.insertNodes(
        editor,
        [{ type: "paragraph", children: [{ text: notes.prose }] }],
        {
          at: start,
          select: true, // does not seem to do anything.
        }
      );
      // Select Prose
      Transforms.select(editor, {
        anchor: { path: [start.path[0] + 1, 0], offset: 0 },
        focus: {
          path: [start.path[0] + 1, 0],
          offset: notes.prose.length,
        },
      });
      // Transforms.select(editor, notes.range); // Select notes
    }
  };
  const [showConvertNotes, setShowConvertNotes] = useState<boolean>(false);
  const convertNotes = useCallback(() => {
    setShowConvertNotes(true);
    if (editor.selection) {
      const text = Editor.string(editor, editor.selection);
      const fragment = Editor.fragment(editor, editor.selection);
      if (text) {
        notes.next({ text, fragment, range: editor.selection });
      }
    }
  }, [editor]);

  const [showFixGrammar, setShowFixGrammar] = useState<boolean>(false);
  const fixGrammar = useCallback(() => {
    setShowFixGrammar(true);
    if (editor.selection) {
      const text = Editor.string(editor, editor.selection);
      const fragment = Editor.fragment(editor, editor.selection);
      if (text) {
        grammar.next({ text, fragment, range: editor.selection });
      }
    }
  }, [editor]);

  const [showClarify, setShowClarify] = useState<boolean>(false);
  const clarifySelection = useCallback(() => {
    setShowClarify(true);
    if (editor.selection) {
      const text = Editor.string(editor, editor.selection);
      const fragment = Editor.fragment(editor, editor.selection);
      if (text) {
        clarify.next({ text, fragment, range: editor.selection });
      }
    }
  }, [editor]);

  const [showAssessExpectation, setShowAssessExpectation] = useState(false);
  const assessExpectation = useCallback(() => {
    setShowAssessExpectation(true);
    if (editor.selection) {
      const text = Editor.string(editor, editor.selection);
      if (text) {
        assess.next(text);
      }
    }
  }, [editor]);

  const [showLogicalFlow, setShowLogicalFlow] = useState(false);
  const auditLogicalFlow = useCallback(() => {
    setShowLogicalFlow(true);
    if (editorTextValue) {
      logicalFlowText.next(editorTextValue);
    }
  }, [editorTextValue]);
  const [showAuditTopics, setShowAuditTopics] = useState(false);
  const auditTopics = useCallback(() => {
    setShowAuditTopics(true);
    if (editorTextValue) {
      topicsAuditText.next(editorTextValue);
    }
  }, [editorTextValue]);

  return (
    <div className="d-flex flex-column vh-100 vw-100 m-0 p-0">
      {/* Whole page application */}
      <header className="d-flex bg-dark">
        <Navbar variant="dark">
          <Container>
            <Navbar.Brand href="#">{brand}</Navbar.Brand>
            <Navbar.Toggle aria-controls={navId}></Navbar.Toggle>
            <Navbar.Collapse id={navId}>
              <Nav className="me-auto" onSelect={onNavSelect}>
                <Nav.Link eventKey={"resetData"}>Reset</Nav.Link>
                <NavDropdown title="View" menuVariant="dark">
                  <Form className="m-2">
                    <Form.Label>Editor Font Size: {zoom}%</Form.Label>
                    <Form.Range
                      min={10}
                      max={300}
                      step={10}
                      onChange={(event) => setZoom(event.target.valueAsNumber)}
                      value={zoom}
                    />
                  </Form>
                </NavDropdown>
                <NavDropdown title="Help" menuVariant="dark">
                  {/* <NavDropdown.Item eventKey={"showHelp"}>
                    Show Help
                  </NavDropdown.Item>
                  <NavDropdown.Item eventKey={"showGettingStarted"}>
                    Getting Started
                  </NavDropdown.Item>
                  <NavDropdown.Item eventKey={"showTroubleshooting"}>
                    Troubleshooting
                  </NavDropdown.Item> */}
                  <NavDropdown.Item eventKey={"showAbout"}>
                    About
                  </NavDropdown.Item>
                  {!ScribeAvailable ? undefined : (
                    <NavDropdown.Item eventKey={"showScribeOption"}>
                      myScribe: {scribe ? "Enabled" : "Disabled"}
                    </NavDropdown.Item>
                  )}
                </NavDropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>
      <main className="d-flex flex-grow-1 bg-white justify-content-start overflow-hidden h-100">
        <aside
          ref={toolRef}
          className="d-flex flex-column tools-pane h-100 overflow-hidden"
        >
          <Tabs
            className="mt-1 px-2"
            onSelect={(key) => switchTab(key as Tool)}
          >
            <Tab
              eventKey={"expectations"}
              title="Expectations"
              className="overflow-hidden h-100"
            >
              <Expectations enableTopicEditing={!ScribeAvailable} />
            </Tab>
            {settings.docuscope && settings.coherence && (
              <Tab
                eventKey={"coherence"}
                title="Coherence"
                className="overflow-hidden h-100"
              >
                <Coherence />
              </Tab>
            )}
            {settings.docuscope && settings.clarity && (
              <Tab
                eventKey={"clarity"}
                title="Clarity"
                className="overflow-hidden h-100"
              >
                <Clarity />
              </Tab>
            )}
            {settings.docuscope && settings.impressions && (
              <Tab
                eventKey={"impressions"}
                title="Impressions"
                className="overflow-hidden h-100"
              >
                <Impressions />
              </Tab>
            )}
          </Tabs>
        </aside>

        <Divider
          onMouseDown={onMouseDownTool}
          onTouchEnd={onMouseUp}
          onTouchStart={onTouchStartTool}
        />

        <Card as="article" className="editor-pane overflow-hidden flex-grow-1">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <ButtonToolbar>
              {paragraphselector}
              {ScribeAvailable &&
                configuration &&
                "prompt_templates" in configuration &&
                Object.keys(configuration.prompt_templates).length > 0 && (
                  <ButtonGroup className="me-2">
                    {notesFeature &&
                      "notes_to_prose" in configuration.prompt_templates && (
                        <Button
                          onClick={convertNotes}
                          disabled={!editable}
                          title="Covert selected notes to prose"
                        >
                          Notes2Prose
                        </Button>
                      )}
                    {grammarFeature &&
                      "grammar" in configuration.prompt_templates && (
                        <Button
                          onClick={fixGrammar}
                          disabled={!editable}
                          title="Proofread selected text for grammatical errors"
                        >
                          Proofread
                        </Button>
                      )}
                    {clarifyFeature &&
                      "copyedit" in configuration.prompt_templates && (
                        <Button
                          onClick={clarifySelection}
                          disabled={!editable}
                          title="Suggest revisions of selected text to improve clarity"
                        >
                          Clarify
                        </Button>
                      )}
                    {assessExpectationFeature &&
                      currentTab === "expectations" && (
                        <Button
                          onClick={() => assessExpectation()}
                          disabled={
                            !editable /* && !editorSelectedText && selected expectation */
                          }
                          title="Check if the selected text meets the selected expectation"
                        >
                          Assess
                        </Button>
                      )}
                    {logicalFlowFeature &&
                      "logical_flow" in configuration.prompt_templates && (
                        <Button
                          onClick={() => auditLogicalFlow()}
                          title="Audit Logical Flow of the Document"
                        >
                          Flow
                        </Button>
                      )}
                    {topicsFeature &&
                      "topics" in configuration.prompt_templates && (
                        <Button
                          onClick={() => auditTopics()}
                          title="Analyze covered topics."
                        >
                          Topics
                        </Button>
                      )}
                  </ButtonGroup>
                )}
              {settings.docuscope && (
                <>
                  <Button onClick={() => globalUpdate(editorTextValue)}>
                    Update
                  </Button>
                  <LockSwitch
                    checked={editable}
                    label="Edit Mode:"
                    onChange={(checked) => setEditorState(checked)}
                  />
                </>
              )}
            </ButtonToolbar>
          </Card.Header>
          <Card.Body className="overflow-auto" style={{ fontSize: `${zoom}%` }}>
            {showDocuScopeTaggedText ? taggedDocuScopeText : ""}
            {showOnTopicText ? (
              <React.Fragment>
                {/* TODO: Add appropriate header/warning here.  See taggedDocuScopeText for an example. */}
                <div
                  className="tagged-text"
                  dangerouslySetInnerHTML={{ __html: fixOnTopicHtml(onTopic) }}
                ></div>
              </React.Fragment>
            ) : (
              ""
            )}
            <Slate
              editor={editor}
              initialValue={editorValue}
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
                className={
                  showDocuScopeTaggedText || showOnTopicText ? "d-none" : ""
                }
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
      {/* <footer className="bg-dark statusbar"> // removed for #46
        <div className="statusbar-status">{status}</div>
        <div className="statusbar-version">{`DSWA Version: ${VERSION}`}</div>
        <div className="statusbar-ruleversion">
          <FontAwesomeIcon icon={faBook} className="mx-1" />
          {configuration ? (
            <>
              <span className="text-truncate" style={{ maxWidth: "15rem" }}>
                {configuration.info.name}
              </span>
              : {configuration.info.version}
            </>
          ) : (
            ""
          )}
        </div>
        <div className="statusbar-language">
          <FontAwesomeIcon icon={faGlobe} className="mx-1" />
          {language}
        </div>
      </footer> */}
      <About />
      {showReset && <ResetModal onCloseResetDialog={onCloseResetDialog} />}
      {ScribeAvailable &&
        notesFeature &&
        configuration &&
        "prompt_templates" in configuration &&
        "notes_to_prose" in configuration.prompt_templates && (
          <Notes2Prose
            show={showConvertNotes}
            onHide={() => setShowConvertNotes(false)}
            insert={(notes: SelectedNotesProse) => {
              if (notes.prose && notes.range) {
                setShowConvertNotes(false);
                updateSelection(notes);
              }
            }}
          />
        )}
      {ScribeAvailable &&
        grammarFeature &&
        configuration &&
        "prompt_templates" in configuration &&
        "grammar" in configuration.prompt_templates && (
          <FixGrammar
            show={showFixGrammar}
            onHide={() => setShowFixGrammar(false)}
            insert={(notes: SelectedNotesProse) => {
              if (notes.prose && notes.range) {
                setShowFixGrammar(false);
                updateSelection(notes);
              }
            }}
          />
        )}
      {ScribeAvailable &&
        clarifyFeature &&
        configuration &&
        "prompt_templates" in configuration &&
        "copyedit" in configuration.prompt_templates && (
          <Clarify
            show={showClarify}
            onHide={() => setShowClarify(false)}
            insert={(notes: SelectedNotesProse) => {
              if (notes.prose && notes.range) {
                setShowClarify(false);
                updateSelection(notes);
              }
            }}
          />
        )}
      {ScribeAvailable && assessExpectationFeature && configuration && (
        <AssessExpectations
          show={showAssessExpectation}
          onHide={() => setShowAssessExpectation(false)}
        />
      )}
      {ScribeAvailable &&
        logicalFlowFeature &&
        configuration &&
        "prompt_templates" in configuration &&
        "logical_flow" in configuration.prompt_templates && (
          <LogicalFlowAudit
            show={showLogicalFlow}
            onHide={() => setShowLogicalFlow(false)}
          />
        )}
      {ScribeAvailable &&
        topicsFeature &&
        configuration &&
        "prompt_templates" in configuration &&
        "topics" in configuration.prompt_templates && (
          <TopicsAudit
            show={showAuditTopics}
            onHide={() => setShowAuditTopics(false)}
          />
        )}
      {ScribeAvailable && <ScribeOption />}
      {/* <HelpModal />
      <GettingStartedModal />
      <TroubleshootingModal /> */}
    </div>
  );
};

export default StudentView;
