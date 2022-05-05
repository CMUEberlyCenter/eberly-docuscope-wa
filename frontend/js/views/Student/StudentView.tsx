/*
Student view has a tool bar header and a status bar footer,
both of which should always be visible.
The main area is composed of two major regions: the tools and the text.
The text is the user's text either in an editor or in an interactive
area showing the results of tagging.
The tools are arranged in tabs.
There is also a optional third area for displaying additional information.
*/
import React, { useCallback, useId, useState } from "react";
import {
  Alert,
  Card,
  Container,
  Form,
  Nav,
  Navbar,
  NavDropdown,
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
import Expectations from "../../components/Expectations/Expectations";
import Impressions from "../../components/Impressions/Impressions";
import {
  editorState,
  editorText,
  useEditorState,
} from "../../service/editor-state.service";
import "./StudentView.scss";
import LockSwitch from "../../components/LockSwitch/LockSwitch";
import { useTaggerResults, isTaggerResult } from "../../service/tagger.service";
import * as d3 from "d3";
import { currentTool } from "../../service/current-tool.service";

/**
 * For handling clicks on the tagged text.
 * It will reveal the tag for the clicked on pattern while hiding
 * all other tags.
 * @param evt mouse event that triggers this handler
 */
function click_select(evt: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
  let target: HTMLElement | null = evt.target as HTMLElement;
  while (target && !target.getAttribute("data-key")) {
    target = target.parentElement;
  }
  const key = target?.getAttribute("data-key");
  if (target && key && key.trim()) {
    const isSelected = d3.select(target).classed("selected_text");
    d3.selectAll(".selected_text").classed("selected_text", false);
    d3.selectAll(".cluster_id").classed("d_none", true);
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
const StudentView = (props: { api: apiCall }) => {
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
  const status = "";
  const [editor] = useState(() => withReact(createEditor()));
  const editable = useEditorState();
  const [editorValue, setEditorValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);
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
                </NavDropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>
      <main className="d-flex flex-grow-1 bg-white justify-content-stretch overflow-hidden">
        <aside className="d-flex flex-column w-50 tools-pane">
          <Tabs className="mt-1 px-2" onSelect={(key) => switchTab(key)}>
            <Tab eventKey={"expectations"} title="Expectations">
              <Expectations />
            </Tab>
            <Tab eventKey={"coherence"} title="Coherence">
              <Coherence api={props.api} />
            </Tab>
            <Tab eventKey={"clarity"} title="Clarity">
              <Clarity api={props.api} />
            </Tab>
            <Tab eventKey={"impressions"} title="Impressions">
              <Impressions />
            </Tab>
          </Tabs>
        </aside>
        <Card as="article" className="editor-pane overflow-hidden w-50">
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
                editorText.next(content);
                setEditorValue(content);
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
        <aside className={showInfoColumn ? "" : "d-none"}>
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
      </main>
      <footer className="bg-dark">Status: {status}</footer>
    </div>
  );
};
export default StudentView;
