import React, { Component } from "react";

import "foundation-sites/dist/css/foundation.min.css";

import {
  Button,
  Colors,
  Sizes,
  Tabs,
  TabItem,
  TabsContent,
  TabPanel,
} from "react-foundation";

import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";

// Via: https://docs.slatejs.org/walkthroughs/installing-slate
import { Editor } from "slate-react";
import { Value, Node } from "slate";
import { createEditor } from "slate";
import Plain from "slate-plain-serializer";

//import ToggleSwitch from './ToggleSwitch';
// https://www.npmjs.com/package/react-switch
import Switch from "react-switch";

import DocuScopeWA from "./DocuScopeWAScrim";
import DocuScopeRules from "./DocuScopeRules";
import DataTools from "./DataTools";
import DocuScopeOnTopic from "./DocuScopeOnTopic";

import docuscope from "../views/docuscope.html";

import "../css/main.css";
import "../css/docuscope.css";
import "../css/editor.css";
import "../css/impressions.css";
import "../css/coherence.css";
import "../css/meter.css";

import mainIcon from "../css/icons/audit_icon.png";
import ontopicLegend from "../css/img/ontopic-legend.png";

import { sentenceData } from "./data/sentencedata.js";

let initialValue = Value.fromJSON({
  document: {
    nodes: [
      {
        object: "block",
        type: "paragraph",
        nodes: [
          {
            object: "text",
            text: "",
          },
        ],
      },
    ],
  },
});

/**
 * https://bit.dev/digiaonline/react-foundation
 */
export default class DocuScopeWAStudent extends Component {
  schema = {
    annotations: {
      highlight: {
        isAtomic: true,
      },
      underline: {
        isAtomic: true,
      },
    },
  };

  /**
   *
   */
  constructor(props) {
    console.log("DocuScopeWAStudent ()");

    super(props);

    this.bURLServer = "";
    this.bURLPath = "/api/activity/ontopic/";

    if (typeof backendServer !== "undefined") {
      this.bURLServer = backendServer;
      console.log(
        "Switching back-end url to one defined in the html page: " +
          this.bURLServer +
          this.bURLPath
      );
    }

    this.dataTools = new DataTools();

    let value = initialValue;

    this.state = {
      loading: false,
      activeIndex: 1,
      currentRule: null,
      currentRuleChild: null,
      fontSize: "12pt",
      value: value,
      invalidated: false,
      sentences: null,
      sentence: null,
      collapsed: null,
      expanded: null,
      loading: false,
      topics: null,
      topic: null,
      paragraphSelected: 0,
      docuscopeConnected: false,
      docuscope: null,
      docuscopeOrigin: "",
      editorActive: true,
      showProgress: false,
      showInfoColumn: false,
      progress: 0,
      progressTitle: "Docuscope Write and Audit Processing",
      text: null,
    };

    this.onContextSelect = this.onContextSelect.bind(this);
    this.onClickRule = this.onClickRule.bind(this);
    this.onClickRuleChild = this.onClickRuleChild.bind(this);

    // Editor event handlers
    this.insertText = this.insertText.bind(this);
    this.fillParagraphList = this.fillParagraphList.bind(this);
    this.handleParagraphSelection = this.handleParagraphSelection.bind(this);

    this.processMessage = this.processMessage.bind(this);

    this.handleEditorToggle = this.handleEditorToggle.bind(this);

    this.selectMenuOption = this.selectMenuOption.bind(this);
  }

  /**
   *
   */
  componentDidMount() {
    console.log("componentDidMount ()");

    window.addEventListener(
      "message",
      (event) => {
        this.processMessage(event.data);

        if (this.state.docuscopeConnected == false) {
          this.setState({
            docuscope: event.source,
            docuscopeOrigin: event.origin,
          });
        }
      },
      false
    );
  }

  /**
   *
   */
  selectMenuOption(selectedOption) {
    console.log("selectMenuOption (" + selectedOption + ")");

    if (selectedOption == "#topicclusters") {
      this.setState({ showInfoColumn: !this.state.showInfoColumn });
      return;
    }
  }

  /**
   *
   */
  processMessage(aMessage) {
    // Just a quick check. You never know
    if (aMessage.event_id == "docuscope") {
      let data = aMessage.data;

      if (data.status == "progress") {
        this.setState({
          showProgress: true,
          progressTitle: data.title,
          progress: data.content,
        });
        return;
      }

      if (data.status == "finished") {
        this.setState({
          showProgress: false,
        });
        return;
      }
    }
  }

  /**
   *
   */
  sendMessage(aMessage) {
    var payload = {
      event_id: "docuscope",
      data: {
        status: "text",
        content: aMessage,
      },
    };

    let docuscopeTarget = this.state.docuscope;
    let docuscopeOrigin = this.state.docuscopeOrigin;

    if (this.state.activeIndex == 4) {
      if (docuscopeTarget != null) {
        docuscopeTarget.postMessage(payload, docuscopeOrigin);
      }
    }

    if (this.state.activeIndex == 3) {
      this.setState({
        sentences: sentenceData,
        text: aMessage,
      });
    }
  }

  /**
   *
   */
  handleEditorToggle(e) {
    let toggled = !this.state.editorActive;
    let editorLocked = toggled;

    console.log("handleEditorToggle (" + toggled + "," + editorLocked + ")");

    this.setState({ editorActive: toggled, locked: editorLocked }, () => {
      if (this.state.editorActive == false) {
        // Send new locked text to backend(s)

        var plain = Plain.serialize(Value.fromJSON(this.state.value));

        this.sendMessage(plain);
      }
    });
  }

  /**
   *
   */
  onContextSelect(anIndex) {
    console.log("onContextSelect (" + anIndex + ")");

    this.setState(
      {
        activeIndex: anIndex,
        progress: 0,
      },
      () => {
        // Inform the OnTopic backend
        if (this.state.activeIndex == 4 && this.state.editorActive == false) {
          var plain = Plain.serialize(Value.fromJSON(this.state.value));
          //this.sendMessage (plain);
        }

        // Inform the Docuscope backend
        if (this.state.activeIndex == 4 && this.state.editorActive == false) {
          var plain = Plain.serialize(Value.fromJSON(this.state.value));
          this.sendMessage(plain);
        }
      }
    );
  }

  /**
   *
   */
  fillParagraphList() {
    let areasElement = [];

    // get from document analysis
    let nrParagraphs = 10;

    for (let i = 0; i < nrParagraphs; i++) {
      areasElement.push({ value: i, label: "Paragraph: " + i });
    }

    return areasElement;
  }

  /**
   *
   */
  handleParagraphSelection(e) {
    console.log("handleParagraphSelection (" + e.target.value + ")");

    this.setState({
      paragraphSelected: e.target.value,
    });
  }

  /**
   *
   */
  insertText(text) {
    console.log("insertText ()");

    return text;
  }

  /**
   * On change, save the new `value`.
   *
   * @param {Editor} editor
   */
  onChange({ value }) {
    console.log("onChange ()");

    //console.log (value.document.nodes.map(n => Node.string(n)).join('\n'));

    this.setState({ value }, (e) => {
      let invalidated = this.state.invalidated;
      let expanded = this.dataTools.deepCopy(this.state.expanded);
      let topic = this.dataTools.deepCopy(this.state.topic);
      let topics = null;

      /*  
      if (value.document.text!="") {
        if (this.state.check!=value.document.text) {
          //console.log ("onChange () actual");

          invalidated=true;
          topic=null;

          if (this.state.topics!=null) {
            topics=this.copyTopics ();
          }
        } else {
          topics=this.copyTopics ();       
        }
      } else {
        topics=null;
        expanded=null;
      }
      */

      this.setState({
        valueRaw: value.document,
        check: value.document.text,
        invalidated: invalidated,
        topics: topics,
        topic: topic,
        expanded: expanded,
      });
    });
  }

  /**
   * Render a Slate block.
   *
   * @param {Object} props
   * @return {Element}
   */
  renderBlock(props, editor, next) {
    const { attributes, children, node } = props;

    switch (node.type) {
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
        return next();
    }
  }

  /**
   * Render a Slate mark. Oh, hi Mark!
   *
   * @param {Object} props
   * @return {Element}
   */
  renderMark(props, editor, next) {
    const { children, mark, attributes } = props;

    switch (mark.type) {
      case "bold":
        return <strong {...attributes}>{children}</strong>;
      case "code":
        return <code {...attributes}>{children}</code>;
      case "italic":
        return <em {...attributes}>{children}</em>;
      case "underlined":
        return <u {...attributes}>{children}</u>;
      default:
        return next();
    }
  }

  /**
   *
   */
  renderAnnotation = (props, editor, next) => {
    const { children, annotation, attributes } = props;

    switch (annotation.type) {
      case "highlight":
        return (
          <span {...attributes} style={{ backgroundColor: "#ffeeba" }}>
            {children}
          </span>
        );
      case "underline":
        return (
          <span {...attributes} style={{ textDecoration: "underline" }}>
            {children}
          </span>
        );
      case "italic":
        return (
          <span {...attributes} style={{ fontStyle: "italic" }}>
            {children}
          </span>
        );
      case "bold":
        return (
          <span {...attributes} style={{ fontWeight: "bold" }}>
            {children}
          </span>
        );
      default:
        return next();
    }
  };

  /**
   * On key down, if it is a formatting command toggle a mark.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @return {Change}
   */
  onKeyDown(event, editor, next) {
    //console.log (event);
    console.log(event.keyCode);

    if (event.keyCode == 32) {
      //this.clearAnnotations ();
    }

    return next();

    /*
    let mark

    if (isBoldHotkey(event)) {
      mark = 'bold'
    } else if (isItalicHotkey(event)) {
      mark = 'italic'
    } else if (isUnderlinedHotkey(event)) {
      mark = 'underlined'
    } else if (isCodeHotkey(event)) {
      mark = 'code'
    } else {
      return next()
    }

    //event.preventDefault()

    editor.toggleMark(mark)
    */
  }

  /**
   *
   */
  onClickRule(e) {
    console.log("onClickRule (" + e.target.id + ")");

    e.stopPropagation();

    let aRule = this.props.ruleManager.getRule(e.target.id);

    if (aRule) {
      this.setState({ currentRule: aRule, currentRuleChild: null });
    }
  }

  /**
   *
   */
  onClickRuleChild(e) {
    console.log("onClickRuleChild (" + e.target.id + ")");

    e.stopPropagation();

    let aRuleChild = this.props.ruleManager.getRuleChild(e.target.id);

    if (aRuleChild) {
      this.setState({ currentRule: null, currentRuleChild: aRuleChild });
    }
  }

  /**
   *
   */
  generateRuleElements() {
    let rulesElements = [];

    for (let i = 0; i < this.props.ruleManager.rules.length; i++) {
      let aRule = this.props.ruleManager.rules[i];

      let childElements = [];

      for (let j = 0; j < aRule.children.length; j++) {
        let aChild = aRule.children[j];
        let aChildElement = (
          <li
            id={aChild.id}
            className="impressions-child"
            onClick={(e) => {
              this.onClickRuleChild(e);
            }}
          >
            {aChild.name}
          </li>
        );
        childElements.push(aChildElement);
      }

      rulesElements.push(
        <li
          id={aRule.id}
          className="impressions-item"
          onClick={(e) => {
            this.onClickRule(e);
          }}
        >
          {aRule.name}
          <ul className="impressions-children">{childElements}</ul>
        </li>
      );
    }

    return rulesElements;
  }

  /**
   *
   */
  generateExpectationsTab() {
    let ruleElements = this.generateRuleElements();
    let ruleDescription;

    if (this.state.currentRule) {
      ruleDescription = this.state.currentRule.description;
    }

    return (
      <div className="impressions">
        <div className="impressions-title">
          <img src={mainIcon} className="context-icon"></img>
          <h3 className="context-title">Meet Readers' Expectations</h3>
        </div>
        <div className="impressions-description">
          <div className="impressions-name">{this.props.ruleManager.name}</div>
          <div className="impressions-statement">
            Respond to the following questions to meet the readers'
            expectations. The sentences that you write to respond to each
            question include a unique topic cluster that consists of a set of
            words and phrases. DocuScope will automatically highlight sentences
            in your draft that most likely match these expectations.
          </div>
        </div>
        <div className="impressions-content">
          <ol>{ruleElements}</ol>
        </div>
        <div className="impressions-name">About this Group of Expectations</div>
        <div
          className="impressions-rule"
          dangerouslySetInnerHTML={{ __html: ruleDescription }}
        ></div>
        <div className="impressions-detail"></div>
      </div>
    );
  }

  /**
   *
   */
  generateCoherenceTab() {
    return (
      <div className="coherence">
        <div className="coherence-title">
          <img src={mainIcon} className="context-icon"></img>
          <h3 className="context-title">Create Flow in Your Writing</h3>
        </div>
        <div className="coherence-description">
          <div style={{ marginBottom: "2px" }}>
            <img src={ontopicLegend}></img>
          </div>
          <p>
            The Coherence Panel charts the flow of your topic clusters across
            and within paragraphs. Dark circles indicate that a particular topic
            cluster is prominently discussed in a particular paragraph. White
            circles and gaps indicate that a particular topic cluster is
            mentioned but not prominently or not mentioned at all in the
            paragraph. Study the visualization for dark/white circles and gaps
            and see if the shifts in topic clusters and their prominence fits a
            writing plan your readers can easily follow.
          </p>
        </div>
        <div className="coherence-controls">
          <div className="editor-top-menu-filler">
            Coherence across paragraphs
          </div>
          <label className="edit-top-menu-label">
            Show only topic clusters:
          </label>
          <Switch
            size={Sizes.TINY}
            active={{ text: "On" }}
            inactive={{ text: "Off" }}
          />
        </div>
        <div className="coherence-content"></div>
        <div className="coherence-controls">Topic Cluster</div>
        <div className="coherence-detail"></div>
      </div>
    );
  }

  /**
   * e.g OnTopic visualization
   */
  generateClarityTab() {
    return (
      <div className="impressions">
        <div className="impressions-title">
          <img src={mainIcon} className="context-icon"></img>
          <h3 className="context-title">Polish Your Sentences for Clarity</h3>
        </div>
        <div className="impressions-content">
          <DocuScopeOnTopic
            sentences={this.state.sentences}
            text={this.state.text}
          />
        </div>
        <div className="impressions-detail"></div>
      </div>
    );
  }

  /**
   *
   */
  generateImpressionsTab() {
    return (
      <div className="impressions">
        <div className="impressions-title">
          <img src={mainIcon} className="context-icon"></img>
          <h3 className="context-title">Manage Readers' Impressions</h3>
        </div>
        <div className="impressions-description"></div>
        <div className="impressions-content">
          <iframe className="docuscopeframe" src={docuscope}></iframe>
        </div>
        <div className="impressions-detail"></div>
      </div>
    );
  }

  /**
   *
   */
  render() {
    //console.log ("render ("+this.state.editorActive+")");

    let leftWidth = "30%";
    let centerWidth = "30%";

    let progresswindow;
    let mainPage;
    let expectationsTab;
    let coherenceTab;
    let clarityTab;
    let impressionsTab;
    let editor;
    let editorScrim;
    let infocolumn;

    if (this.state.showInfoColumn == true) {
      leftWidth = "30%";
      centerWidth = "30%";
      infocolumn = <div className="rightcol"></div>;
    } else {
      leftWidth = "50%";
      centerWidth = "50%";
    }

    if (this.state.showProgress == true) {
      progresswindow = (
        <div className="progresswindow">
          <div className="progresstitle">{this.state.progressTitle}</div>
          <div className="progresscontent">
            <div className="meter" style={{ height: "25px", margin: "15px" }}>
              <span style={{ width: this.state.progress + "%" }}></span>
            </div>
          </div>
        </div>
      );
    }

    expectationsTab = this.generateExpectationsTab();
    coherenceTab = this.generateCoherenceTab();
    clarityTab = this.generateClarityTab();
    impressionsTab = this.generateImpressionsTab();

    editor = (
      <Editor
        tabIndex="0"
        id="editor1"
        ref="editor1"
        className="editor-content"
        readOnly={false}
        placeholder="Enter some editable text..."
        value={this.state.value}
        onChange={this.onChange.bind(this)}
        onKeyDown={this.onKeyDown.bind(this)}
        renderBlock={this.renderBlock.bind(this)}
        renderMark={this.renderMark.bind(this)}
        renderAnnotation={this.renderAnnotation}
        style={{
          overflowY: "auto",
          fontSize: this.state.fontSize,
          marginTop: "2px",
          padding: "8px",
        }}
        schema={this.schema}
        insertText={this.insertText}
      />
    );

    if (this.state.editorActive == false) {
      editorScrim = <div className="editor-scrim"></div>;
    }

    mainPage = (
      <div className="mainframe">
        <div className="menubar">
          <Navbar bg="dark" variant="dark">
            <Container>
              <Navbar.Brand href="#home">DocuScope Write & Audit</Navbar.Brand>
              <Navbar.Toggle aria-controls="basic-navbar-nav" />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav
                  className="me-auto"
                  onSelect={(selectedKey) => this.selectMenuOption(selectedKey)}
                >
                  <NavDropdown title="File" id="dropdown1">
                    <NavDropdown.Item href="#1">Action</NavDropdown.Item>
                    <NavDropdown.Item href="#2">
                      Another action
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#3">Something</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#4">
                      Separated link
                    </NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="Edit" id="dropdown2">
                    <NavDropdown.Item href="#5">Action</NavDropdown.Item>
                    <NavDropdown.Item href="#6">
                      Another action
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#7">Something</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#8">
                      Separated link
                    </NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="View" id="dropdown3">
                    <NavDropdown.Item href="#topicclusters">
                      Topic Clusters
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#9">
                      Another action
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#10">Something</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#11">
                      Separated link
                    </NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="Window" id="dropdown4">
                    <NavDropdown.Item href="#12">Action</NavDropdown.Item>
                    <NavDropdown.Item href="#13">
                      Another action
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#14">Something</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#15">
                      Separated link
                    </NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="Help" id="dropdown5">
                    <NavDropdown.Item href="#16">Action</NavDropdown.Item>
                    <NavDropdown.Item href="#17">
                      Another action
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#18">Something</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#19">
                      Separated link
                    </NavDropdown.Item>
                  </NavDropdown>
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>
        </div>
        <div className="content">
          <div className="leftcol" style={{ width: leftWidth }}>
            <Tabs>
              <TabItem
                isActive={this.state.activeIndex === 1}
                onClick={(e) => {
                  this.onContextSelect(1);
                }}
              >
                <a href="#">Expectations</a>
              </TabItem>
              <TabItem
                isActive={this.state.activeIndex === 2}
                onClick={(e) => {
                  this.onContextSelect(2);
                }}
              >
                <a href="#">Coherence</a>
              </TabItem>
              <TabItem
                isActive={this.state.activeIndex === 3}
                onClick={(e) => {
                  this.onContextSelect(3);
                }}
              >
                <a href="#">Clarity</a>
              </TabItem>
              <TabItem
                isActive={this.state.activeIndex === 3}
                onClick={(e) => {
                  this.onContextSelect(4);
                }}
              >
                <a href="#">Impressions</a>
              </TabItem>
            </Tabs>
            <TabsContent className="tabscontent">
              <TabPanel
                id={"tab1"}
                className="tabs-panel-override"
                isActive={this.state.activeIndex === 1}
              >
                {expectationsTab}
              </TabPanel>

              <TabPanel
                id={"tab2"}
                className="tabs-panel-override"
                isActive={this.state.activeIndex === 2}
              >
                {coherenceTab}
              </TabPanel>

              <TabPanel
                id={"tab3"}
                className="tabs-panel-override"
                isActive={this.state.activeIndex === 3}
              >
                {clarityTab}
              </TabPanel>

              <TabPanel
                id={"tab4"}
                className="tabs-panel-override"
                isActive={this.state.activeIndex === 4}
              >
                {impressionsTab}
              </TabPanel>
            </TabsContent>
          </div>

          <div className="centercol" style={{ width: centerWidth }}>
            <div className="editor-top-menu">
              <div className="editor-top-menu-filler">
                <select
                  id="paragraphs"
                  name="paragraphs"
                  className="editor-paragraphs"
                  value={this.state.paragraphSelected}
                  onChange={this.handleParagraphSelection}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <label className="edit-top-menu-label">Edit Mode:</label>
              <Switch
                width={45}
                height={20}
                checked={this.state.editorActive}
                onChange={this.handleEditorToggle}
              />
            </div>
            <div className="editor-container">
              {editor}
              {editorScrim}
            </div>
            <div className="editor-bottom-menu">Editor Bottom Marker</div>
          </div>
          {infocolumn}
        </div>
        <div className="statusbar">statusbar</div>
        {progresswindow}
      </div>
    );

    return mainPage;
  }
}
