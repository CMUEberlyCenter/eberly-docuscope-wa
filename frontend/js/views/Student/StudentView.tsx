import React, { useId, useState } from "react";
import {
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
import { Editable, Slate, withReact } from "slate-react";
import Clarity from "../../components/Clarity/Clarity";
import Coherence from "../../components/Coherence/Coherence";
import Expectations from "../../components/Expectations/Expectations";
import Impressions from "../../components/Impressions/Impressions";
import {
  editorState,
  editorText,
  useEditorState,
} from "../../service/editor-state.service";
import { Node } from "slate";
import "./StudentView.scss";
import LockSwitch from "../../components/LockSwitch/LockSwitch";
import { useTaggerResults, isTaggerResult } from "../../service/tagger.service";

const serialize = (nodes: Node[]) => {
  return nodes.map((n: Node) => Node.string(n)).join("\n");
};
const StudentView = () => {
  const navId = useId();
  const selectId = useId();
  const [showInfoColumn, setShowInfoColumn] = useState(false);
  //const [status, setStatus] = useState('');
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const status = "";
  const [editor] = useState(() => withReact(createEditor()));
  const editable = useEditorState();
  const [editorValue, setEditorValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);
  const onNavSelect = (eventKey: string | null) => {
    if (eventKey === "showTopicClusters") {
      setShowInfoColumn(!showInfoColumn);
    }
  };
  const tagging = useTaggerResults();
  const showTaggedText = currentTab === 'impressions' && !editable && isTaggerResult(tagging);
  const taggedTextContent = isTaggerResult(tagging) ? tagging.html_content : '';
  const taggedText = (
    <React.Fragment>
      <h4>Tagged Text:</h4>
      <div dangerouslySetInnerHTML={{ __html: taggedTextContent }}></div>
    </React.Fragment>);
  return (
    <div className="d-flex flex-column vh-100 vw-100 m-0 p-0">
      <header className="d-flex bg-dark">
        <Navbar variant="dark">
          <Container>
            <Navbar.Brand href="#">DocuScope Write &amp; Audit</Navbar.Brand>
            <Navbar.Toggle aria-controls={navId}></Navbar.Toggle>
            <Navbar.Collapse id={navId}>
              <Nav className="me-auto" onSelect={onNavSelect}>
                <NavDropdown title="View">
                  <NavDropdown.Item eventKey={"showTopicClusters"}>
                    Topic Clusters
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>
      <main className="d-flex flex-grow-1 bg-white justify-content-stretch overflow-hidden">
        <aside className="d-flex flex-column w-50">
          <Tabs className="mt-1 px-2" onSelect={(key) => setCurrentTab(key)}>
            <Tab eventKey={"expectations"} title="Expectations">
              <Expectations />
            </Tab>
            <Tab eventKey={"coherence"} title="Coherence">
              <Coherence />
            </Tab>
            <Tab eventKey={"clarity"} title="Clarity">
              <Clarity />
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
            {showTaggedText ? taggedText : ''}
            <Slate
              editor={editor}
              value={editorValue}
              onChange={(content: Descendant[]) => {
                editorText.next(serialize(content));
                setEditorValue(content);
              }}
            >
              <Editable className={showTaggedText ? 'd-none' : ''}
                readOnly={!editable}
                placeholder={editable ? "Enter some text..." : "Unlock and enter some text..."}
              />
            </Slate>
          </Card.Body>
        </Card>
        <aside></aside>
      </main>
      <footer className="bg-dark">Status: {status}</footer>
    </div>
  );
};
export default StudentView;
