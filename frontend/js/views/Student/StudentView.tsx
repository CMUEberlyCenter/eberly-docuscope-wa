/**
 * @fileoverview Student facing interface.
 *
 * Student view has a tool bar header and a status bar footer,
 * both of which should always be visible.
 * The main area is composed of two major regions: the tools and the text.
 * The text is the user's text either in an editor or in an interactive
 * area showing the results of tagging.
 * The tools are arranged in tabs.
 * There is also a optional third area for displaying additional information.
 * The three main areas can be resized by the user.
 * Editor text is also cached in sessionStorage.
 */
import React, {
  createRef,
  useCallback,
  useEffect,
  useId,
  useState
} from "react";
import {
  Alert,
  Card,
  Container,
  Form,
  Nav,
  Navbar,
  NavDropdown,
  Tab,
  Tabs
} from "react-bootstrap";
import { createEditor, Descendant } from "slate";
import {
  Editable,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact
} from "slate-react";
import Clarity from "../../components/Clarity/Clarity";
import Coherence from "../../components/Coherence/Coherence";
import Expectations from "../../components/Expectations/Expectations";
import Impressions from "../../components/Impressions/Impressions";
import {
  editorState,
  editorText,
  useEditorState
} from "../../service/editor-state.service";
import "./StudentView.scss";
import LockSwitch from "../../components/LockSwitch/LockSwitch";
import { useTaggerResults, isTaggerResult } from "../../service/tagger.service";
import * as d3 from "d3";
import { currentTool } from "../../service/current-tool.service";
import Divider from "../../components/Divider/Divider";

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
    ruleManager: any
  }) => {

  // Status handlers
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState("ENG");

  const navId = useId();
  const selectId = useId();
  const [showInfoColumn, setShowInfoColumn] = useState(false);
  //const [status, setStatus] = useState('');
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  // on tab switch update current and broadcast.
  const switchTab = (key: string | null) => {
    setCurrentTab(key);
    currentTool.next(key);
  };
  const [editor] = useState(() => withReact(createEditor()));
  const editable = useEditorState();
  // Set initial value to stored session data or empty.
  const [editorValue, setEditorValue] = useState<Descendant[]>(
    JSON.parse(sessionStorage.getItem('content') ?? 'null') ||
    [
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
    ]);

  useEffect(() => {
    // Set editor text if initializing from session storage.
    // Necessary for analysis tool to receive the initial
    // text value.
    const content = sessionStorage.getItem('content');
    if (content) {
      editorText.next(JSON.parse(content));
    }
  }, []); // [] dependency means this runs only once.

  // Resize panels
  const [toolWidth, setToolWidth] = useState<undefined | number>(undefined);
  const [rightWidth, setRightWidth] = useState<undefined | number>(undefined);
  const [toolSeparatorXPosition, setToolSeparatorXPosition] = useState<
    undefined | number
  >(undefined);

  const [toolSeparatorDragging, setToolSeparatorDragging] = useState(false);
  const [rightSeparatorXPosition, setRightSeparatorXPosition] = useState<
    undefined | number
  >(undefined);

  const [rightSeparatorDragging, setRightSeparatorDragging] = useState(false);
  const toolRef = createRef<HTMLDivElement>();
  const rightRef = createRef<HTMLDivElement>();

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

  const onMouseDownRight = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    setRightSeparatorXPosition(e.clientX);
    setRightSeparatorDragging(true);
  };

  const onTouchStartRight = (event: React.TouchEvent<HTMLDivElement>) => {
    setRightSeparatorXPosition(event.touches[0].clientX);
    setRightSeparatorDragging(true);
  };

  const onMove = useCallback(
    (clientX: number) => {
      if (toolSeparatorDragging && toolWidth && toolSeparatorXPosition) {
        const width = toolWidth + clientX - toolSeparatorXPosition;
        setToolSeparatorXPosition(clientX);
        setToolWidth(width);
      } else if (
        rightSeparatorDragging &&
        rightWidth &&
        rightSeparatorXPosition
      ) {
        const width = rightWidth - clientX + rightSeparatorXPosition;
        setRightSeparatorXPosition(clientX);
        setRightWidth(width);
      }
    },
    [
      rightSeparatorDragging,
      rightSeparatorXPosition,
      rightWidth,
      toolSeparatorDragging,
      toolSeparatorXPosition,
      toolWidth,
    ]
  );
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (toolSeparatorDragging || rightSeparatorDragging) {
        e.preventDefault;
      }
      onMove(e.clientX);
    },
    [toolSeparatorDragging, rightSeparatorDragging, onMove]
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
    if (rightSeparatorDragging) {
      setRightSeparatorDragging(false);
      if (rightRef.current) {
        setRightWidth(rightRef.current.clientWidth);
        rightRef.current.style.width = `${rightWidth}px`;
      }
    }
  }, [
    rightRef,
    rightSeparatorDragging,
    rightWidth,
    toolRef,
    toolSeparatorDragging,
    toolWidth,
  ]);

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

  useEffect(() => {
    if (rightRef.current) {
      if (!rightWidth) {
        setRightWidth(rightRef.current.clientWidth);
        return;
      }
      rightRef.current.style.width = `${rightWidth}px`;
    }
  }, [rightRef, rightWidth]);

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
    if (eventKey === "showTopicClusters") {
      setShowInfoColumn(!showInfoColumn);
    } else if (eventKey === "resetView") {
      if (toolRef.current) {
        toolRef.current.style.width = "";
        setToolWidth(toolRef.current.clientWidth);
      }
      if (rightRef.current) {
        rightRef.current.style.width = "";
        setRightWidth(rightRef.current.clientWidth);
      }
    }
  };
  const tagging = useTaggerResults();
  // should the special tagged text rendering be used?
  const showTaggedText =
    currentTab === "impressions" && !editable && isTaggerResult(tagging);
  const taggedTextContent = isTaggerResult(tagging) ? tagging.html_content : "";
  // Special rendering of tagger results.
  const taggedText = (
    <React.Fragment>
      <h4>Tagged Text:</h4>
      <Alert variant="info">
        Please note that this is how DocuScope sees your text and it might
        appear slightly different than your text, toggle the &quot;Edit
        Mode&quot; to see your original text.
        <br />
        In the tagged text, you can click on words and phrases to see its
        category tag. Not all words or phrases have tags. Selecting a category
        from the Dictionary Categories tree will highlight all of the instances
        of the selected categories in the tagged text.
      </Alert>
      <div
        className="tagged-text"
        onClick={(evt) => click_select(evt)}
        dangerouslySetInnerHTML={{ __html: taggedTextContent }}
      ></div>
    </React.Fragment>
  );
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
                <NavDropdown title="View" menuVariant="dark">
                  <NavDropdown.Item
                    eventKey={"showTopicClusters"}
                    active={showInfoColumn}
                    aria-current={showInfoColumn}
                  >
                    Topic Clusters
                  </NavDropdown.Item>
                  <NavDropdown.Item eventKey={"resetView"} active={false}>
                    Reset View
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
              <Expectations api={props.api} ruleManager={props.ruleManager}/>
            </Tab>
            <Tab eventKey={"coherence"} title="Coherence">
              <Coherence api={props.api} ruleManager={props.ruleManager} />
            </Tab>
            <Tab eventKey={"clarity"} title="Clarity">
              <Clarity api={props.api} ruleManager={props.ruleManager} />
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
            <Form.Group>
              {/*<Form.Label>Paragraph</Form.Label>*/}
              <Form.Select>
                {[1, 2, 3].map((num) => (
                  <option key={`${selectId}-${num}`} value={num}>
                    {num}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <LockSwitch
              checked={editable}
              label="Edit Mode:"
              onChange={(checked) => editorState.next(checked)}
            />
          </Card.Header>
          <Card.Body className="overflow-auto">
            {showTaggedText ? taggedText : ""}
            <Slate
              editor={editor}
              value={editorValue}
              onChange={(content: Descendant[]) => {
                // only if change is not selection change.
                if (editor.operations.some(op => 'set_selection' !== op.type)) {
                  editorText.next(content);
                  setEditorValue(content);
                  sessionStorage.setItem('content', JSON.stringify(content));
                }
              }}
            >
              <Editable
                className={showTaggedText ? "d-none" : ""}
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
        {showInfoColumn ? (
          <>
            <Divider
              onMouseDown={onMouseDownRight}
              onTouchEnd={onMouseUp}
              onTouchStart={onTouchStartRight}
            />
            <aside
              ref={rightRef}
              className={`cluster-pane ${showInfoColumn ? "" : "d-none"}`}
            >
              {/* Optional third panel controlled by header menu button. */}
              <Card className="m-1">
                <Card.Header>
                  <h5>Topic Clusters</h5>
                </Card.Header>
                <Card.Body>
                  <Alert variant="warning">
                    Topic Cluster information is unavailable.
                  </Alert>
                </Card.Body>
              </Card>
            </aside>
          </>
        ) : (
          <></>
        )}
      </main>
      <footer className="bg-dark statusbar">
        <div className="statusbar-status">{status}</div>
        <div className="statusbar-ruleversion">{props.ruleManager.getVersion ()}</div>
        <div className="statusbar-language">{language}</div>
      </footer>
    </div>
  );
};

export default StudentView;
