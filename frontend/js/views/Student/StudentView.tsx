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

import * as d3 from 'd3';
import React, {
  createRef,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';
import {
  Badge,
  Button,
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
} from 'react-bootstrap';
import { createEditor, Descendant } from 'slate';
import {
  Editable,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from 'slate-react';
import Clarity from '../../components/Clarity/Clarity';
import Coherence from '../../components/Coherence/Coherence';
import Divider from '../../components/Divider/Divider';
import Expectations from '../../components/Expectations/Expectations';
import Impressions from '../../components/Impressions/Impressions';
import LockSwitch from '../../components/LockSwitch/LockSwitch';
import DocuScopeAbout from '../../DocuScopeAbout';
import DocuScopeReset from '../../DocuScopeReset';
import { currentTool } from '../../service/current-tool.service';
import {
  editorText,
  setEditorState,
  useEditorState,
} from '../../service/editor-state.service';
import { isTaggerResult, useTaggerResults } from '../../service/tagger.service';
import TopicHighlighter from '../../TopicHighlighter';

import '../../../css/topics.css';
import './StudentView.scss';

import { faBook, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
import type DocuScopeRules from '../../DocuScopeRules';

import { serialize } from '../../service/editor-state.service';

import { DocuScopeConfig } from '../../global';

/**
 * For handling clicks on the tagged text for the impressions tool.
 * It will reveal the tag for the clicked on pattern while hiding
 * all other tags.
 * @param evt mouse event that triggers this handler
 */
function click_select(evt: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
  let target: HTMLElement | null = evt.target as HTMLElement;
  while (target && !target.getAttribute('data-key')) {
    // check ancestors until one with a data-key is found.
    target = target.parentElement;
  }
  const key = target?.getAttribute('data-key');
  if (target && key && key.trim()) {
    // see if it is already selected.
    const isSelected = d3.select(target).classed('selected_text');
    // clear all selected text.
    d3.selectAll('.selected_text').classed('selected_text', false);
    d3.selectAll('.cluster_id').classed('d_none', true);
    // if it was not previously selected, select it.
    // otherwise leave it as unselected.
    if (!isSelected) {
      d3.select(target).classed('selected_text', true);
      d3.select(target).select('sup.cluster_id').classed('d_none', false);
    }
  }
}

/**
 * The student facing application interface.
 * @param props `api` is for passing down the function that makes "api" calls.
 * @returns
 */
const StudentView = (props: {
  config: DocuScopeConfig;
  api: apiCall;
  ruleManager: DocuScopeRules;
  html: string;
  htmlSentences: string;
  update: (a: unknown) => void;
}) => {
  const topicHighlighter = new TopicHighlighter();

  // Status handlers
  const [status /*, setStatus*/] = useState('Application ready, rules loaded');
  const [language /*, setLanguage*/] = useState('ENG');

  const navId = useId();
  const selectId = useId();
  //const [status, setStatus] = useState('');
  const [currentTab, setCurrentTab] = useState<string | null>('expectations');
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
    JSON.parse(sessionStorage.getItem('content') ?? 'null') || [
      // or "empty" editor text
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ]
  );

  const [editorTextValue, setEditorTextValue] = useState<string>('');

  useEffect(() => {
    // Set editor text if initializing from session storage.
    // Necessary for analysis tool to receive the initial
    // text value.
    const content = sessionStorage.getItem('content');
    if (content) {
      editorText.next(JSON.parse(content));
      setEditorTextValue(serialize(JSON.parse(content)));
    }
  }, []); // [] dependency means this runs only once.

  // Resize panels
  const [toolWidth, setToolWidth] = useState<undefined | number>(undefined);
  useEffect(() => {
    // get initial value from storage if possible on mount.
    const width = sessionStorage.getItem('tool_width');
    if (width && !isNaN(Number(width))) {
      setToolWidth(Number(width));
    }
  }, []);
  // Update stored tool_width
  useEffect(
    () => sessionStorage.setItem('tool_width', String(toolWidth)),
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
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', onMouseUp);
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
        case 'block-quote':
          return <blockquote {...attributes}>{children}</blockquote>;
        case 'bulleted-list':
          return <ul {...attributes}>{children}</ul>;
        case 'heading-one':
          return <h1 {...attributes}>{children}</h1>;
        case 'heading-two':
          return <h2 {...attributes}>{children}</h2>;
        case 'list-item':
          return <li {...attributes}>{children}</li>;
        case 'numbered-list':
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
        case 'bold':
          return <strong {...attributes}>{children}</strong>;
        case 'code':
          return <code {...attributes}>{children}</code>;
        case 'italic':
          return <em {...attributes}>{children}</em>;
        case 'underlined':
          return <u {...attributes}>{children}</u>;
        case 'highlight':
          return (
            <span {...attributes} style={{ backgroundColor: '#ffeeba' }}>
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
    if (eventKey === 'resetData') {
      setShowReset(true);
    }

    if (eventKey === 'resetView') {
      if (toolRef.current) {
        toolRef.current.style.width = '';
        setToolWidth(toolRef.current.clientWidth);
      }
      return;
    }

    // if (eventKey === "showHelp") {
    //   showHelp(true);
    //   return;
    // }

    if (eventKey === "showAbout") {
      setShowAbout(true);
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

  const tagging = useTaggerResults();

  // should the special tagged text rendering be used? (Mike's panel)
  const showDocuScopeTaggedText =
    currentTab === 'impressions' && !editable && isTaggerResult(tagging);

  const taggedDocuScopeTextContent = isTaggerResult(tagging)
    ? tagging.html_content
    : '';

  // Every other panel that needs it. We'll clean up the logic later because the currentTab clause doesn't make any difference anymore
  const showOnTopicText =
    currentTab !== 'impressions' && !editable && Boolean(props.html);

  //console.log ("showOnTopicText: " + showOnTopicText + ", currentTab: " + currentTab + ", editable: " + editable + ", props.html: " + (props.html!=null));

  const topicTaggedContent = (
    <React.Fragment>
      {/* TODO: Add appropriate header/warning here.  See taggedDocuScopeText for an example. */}
      <div
        className="tagged-text"
        dangerouslySetInnerHTML={{ __html: props.html }}
      ></div>
    </React.Fragment>
  );

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

  const [showAbout, setShowAbout] = useState(false);

  let about;

  const onCloseAboutPage = () => {
    setShowAbout(false);
  };

  if (showAbout == true) {
    about = (
      <DocuScopeAbout
        config={props.config}
        onCloseAboutPage={onCloseAboutPage}
        ruleManager={props.ruleManager}
      />
    );
  }

  //>--------------------------------------------------------

  const [showReset, setShowReset] = useState(false);

  const onCloseResetDialog = (afirm: boolean) => {
    setShowReset(false);
    if (afirm == true) {
      // Reset the data from the template
      props.ruleManager.reset();

      // Reset the interface
      switchTab('expectations');
    }
  };

  if (showReset == true) {
    about = <DocuScopeReset onCloseResetDialog={onCloseResetDialog} />;
  }

  //>--------------------------------------------------------

  const [showParagraphSelector /*, setShowParagraphSelector*/] =
    useState(false);

  let paragraphselector;

  if (showParagraphSelector === true) {
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

  /**
   * Note: at this point the text is as-is, including whatever extended characters were included.
   * This also means any single and double quotes
   */
  const globalUpdate = (text: string) => {
    console.log('globalUpdate ()');

    // For now if someone requests (or really, forces) an update, let's switch
    // the editor to read-only mode for now

    // 1. The edit toggle needs to be switched to off
    setEditorState(false);

    // 2. The update method in the parent component needs to be called
    props.update(null);

    // 3. Get the latest from the server
    if (text !== '') {
      //setStatus("Retrieving results...");

      const customTopics = props.ruleManager.getAllCustomTopics();
      const customTopicsStructured =
        props.ruleManager.getAllCustomTopicsStructured();

      //const escaped = encodeURIComponent(text);
      //const encoded = window.btoa(escaped);

      const encoded = encodeURIComponent(text);

      props
        .api(
          'ontopic',
          {
            custom: customTopics,
            customStructured: customTopicsStructured,
            base: encoded,
          },
          'POST'
        )
        .then((/*incoming : any*/) => {
          //let coherence=incoming.coherence;
          //let local=incoming.local;
        });
    }
  };

  //>--------------------------------------------------------

  const lockAndUpdate = (checked: boolean, _editorTextValue: string) => {
    console.log('lockAndUpdate (' + checked + ')');

    setEditorState(checked);

    if (checked == false) {
      console.log('checked==false => update');
      //globalUpdate(editorTextValue);
    }
  };

  let reset;

  //reset=<NavDropdown.Item eventKey={"resetView"} active={false}>Reset View</NavDropdown.Item>;

  //>--------------------------------------------------------
  const [zoom, setZoom] = useState<number>(100);
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
                <Nav.Link eventKey={'resetData'}>Reset</Nav.Link>
                <NavDropdown title="View" menuVariant="dark">
                  <Form className='m-2'>
                    <Form.Label>Editor Font Size: {zoom}%</Form.Label>
                    <Form.Range
                      min={10}
                      max={300}
                      step={10}
                      onChange={(event) => setZoom(event.target.valueAsNumber)}
                      value={zoom}
                    />
                  </Form>
                  {reset}
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
                  <NavDropdown.Item eventKey={'showAbout'}>
                    About
                  </NavDropdown.Item>
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
          <Tabs className="mt-1 px-2" onSelect={(key) => switchTab(key)}>
            <Tab
              eventKey={'expectations'}
              title="Expectations"
              className="overflow-hidden h-100"
            >
              <Expectations
                api={props.api}
                ruleManager={props.ruleManager}
                editorValue={editorTextValue}
                update={props.update}
              />
            </Tab>
            <Tab
              eventKey={'coherence'}
              title="Coherence"
              className="overflow-hidden h-100"
            >
              <Coherence api={props.api} ruleManager={props.ruleManager} />
            </Tab>
            <Tab
              eventKey={'clarity'}
              title="Clarity"
              className="overflow-hidden h-100"
            >
              <Clarity
                api={props.api}
                ruleManager={props.ruleManager}
                htmlSentences={props.htmlSentences}
              />
            </Tab>
            <Tab
              eventKey={'impressions'}
              title="Impressions"
              className="overflow-hidden h-100"
            >
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
          <Card.Header className="d-flex justify-content-between align-items-center">
            {paragraphselector}
            <Button onClick={(_e) => globalUpdate(editorTextValue)}>
              Update
            </Button>
            <LockSwitch
              checked={editable}
              label="Edit Mode:"
              onChange={(checked) => lockAndUpdate(checked, editorTextValue)}
            />
          </Card.Header>
          <Card.Body className="overflow-auto" style={{ fontSize: `${zoom}%` }}>
            {showDocuScopeTaggedText ? taggedDocuScopeText : ''}
            {showOnTopicText ? topicTaggedContent : ''}
            <Slate
              editor={editor}
              initialValue={editorValue}
              onChange={(content: Descendant[]) => {
                // only if change is not selection change.
                if (
                  editor.operations.some((op) => 'set_selection' !== op.type)
                ) {
                  editorText.next(content);
                  setEditorValue(content);
                  setEditorTextValue(serialize(content));
                  sessionStorage.setItem('content', JSON.stringify(content));
                }
              }}
            >
              <Editable
                className={
                  showDocuScopeTaggedText || showOnTopicText ? 'd-none' : ''
                }
                readOnly={!editable}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                placeholder={
                  editable
                    ? 'Enter some text...'
                    : 'Unlock and enter some text...'
                }
              />
            </Slate>
          </Card.Body>
        </Card>
      </main>
      <footer className="bg-dark statusbar">
        <div className="statusbar-status">{status}</div>
        <div className="statusbar-version">
          {'DSWA Version: ' + props.config.version}
        </div>
        <div className="statusbar-ruleversion">
          <FontAwesomeIcon
            icon={faBook}
            style={{ marginLeft: '2px', marginRight: '2px' }}
          />
          {props.ruleManager.getVersion()}
        </div>
        <div className="statusbar-language">
          <FontAwesomeIcon
            icon={faGlobe}
            style={{ marginLeft: '2px', marginRight: '2px' }}
          />
          {language}
        </div>
      </footer>
      {about}
      {/* <HelpModal />
      <GettingStartedModal />
      <TroubleshootingModal /> */}
    </div>
  );
};

export default StudentView;
