import React, { Component } from "react";
import { Button, Tab, Tabs } from "react-bootstrap";

import { topicsToArray } from "../../DataTools";
import { clusterListToSentence } from "../../DocuScopeTools";
import TopicHighlighter from "../../TopicHighlighter";

import { setEditorState } from "../../service/editor-state.service";

import "./ClusterPanel.scss";
import "./ClusterTopics.scss";

import clusterIcon from "../../../css/icons/topic_cluster_icon.png";

/**
	"topics": [
		{
		    "lemma": "Data Descriptors",
		    "user_defined": true,
		    "pre_defined_topics": [
		        "IQR",
		        "bimodal",
		        "inter-quartile range",
		        "max",
		        "maximum",
		        "meadian ",
		        "mean",
		        "min ",
		        "minimum",
		        "mode ",
		        "quartile",
		        "sample",
		        "sample size",
		        "small sample",
		        "spread",
		        "standard deviation",
		        "unimodal ",
		        "variability",
		        "variation ",
		        "varied ",
		        "vary"
		    ],
        "custom_topics": [],
		    "no_lexical_overlap": false
		}
	]
 */
class ClusterPanel extends Component {
  /**
   *
   */
  constructor(props) {
    super(props);

    this.topicHighlighter = new TopicHighlighter();

    this.state = {
      currentTab: "expectationabout",
      topicTextOriginal: "",
      topicText: "",
      topicTextStatic: "",
      duplicateFound: false,
      duplicate: null,
    };

    this.switchTab = this.switchTab.bind(this);
    this.onTopicsChange = this.onTopicsChange.bind(this);
    this.onCustomTopicUpdate = this.onCustomTopicUpdate.bind(this);
    this.onTopiEditorFocusOut = this.onTopiEditorFocusOut.bind(this);
    this.onTopiEditorFocusIn = this.onTopiEditorFocusIn.bind(this);
  }

  /**
   * Update with the latest from the actual data
   */
  componentDidUpdate(prevProps) {
    //console.log ("componentDidUpdate ()");

    if (
      prevProps.currentRule != this.props.currentRule ||
      prevProps.currentCluster != this.props.currentCluster
    ) {
      let aText = this.getTopicText();
      let aTextStatic = this.getTopicTextStatic();
      this.setState({
        topicTextOriginal: aText,
        topicText: aText,
        topicTextStatic: aTextStatic,
      });
    }
  }

  /**
   *
   */
  onTopiEditorFocusOut(e) {
    console.log("onTopiEditorFocusOut ()");

    if (this.state.topicText == "") {
      if (this.props.disableTreeSelect) {
        this.props.disableTreeSelect(false);
      }
    }

    if (this.state.topicText == this.state.topicTextOriginal) {
      if (this.props.disableTreeSelect) {
        this.props.disableTreeSelect(false);
      }
    }
  }

  /**
   *
   */
  onTopiEditorFocusIn(e) {
    console.log("onTopiEditorFocusIn ()");
    if (this.props.disableTreeSelect) {
      this.props.disableTreeSelect(true);
    }
  }

  /**
   *
   */
  getTopicTextStatic() {
    //console.log ("getTopicTextStatic ("+this.props.currentRule + "," + this.props.currentCluster+")");

    let topictextStatic = "";
    let cluster = this.props.ruleManager.getClusterByIndex(
      this.props.currentRule,
      this.props.currentCluster
    );
    if (cluster != null) {
      topictextStatic =
        this.props.ruleManager.getClusterTopicTextStatic(cluster);
    } else {
      console.log("Warning cluster not found");
    }

    return topictextStatic;
  }

  /**
   *
   */
  getTopicText() {
    //console.log ("getTopicText ("+this.props.currentRule + "," + this.props.currentCluster+")");

    let topictext = "";
    let cluster = this.props.ruleManager.getClusterByIndex(
      this.props.currentRule,
      this.props.currentCluster
    );
    if (cluster != null) {
      topictext = this.props.ruleManager.getClusterTopicText(cluster);
    } else {
      console.log("Warning cluster not found");
    }

    return topictext;
  }

  /**
   *
   */
  switchTab(key) {
    //console.log ("switchTab ("+key+")");

    this.setState({
      currentTab: key,
    });
  }

  /**
   *
   */
  onTopicsChange(e) {
    console.log("onTopicsChange (" + e.target.value + ")");

    this.setState(
      {
        topicText: e.target.value,
      },
      () => {
        let topicArray = [];

        if (
          typeof this.state.topicText === "string" &&
          this.state.topicText.trim().length > 0
        ) {
          topicArray = topicsToArray(this.state.topicText);
        }

        let found = false;
        let duplicate = this.props.ruleManager.checkDuplicates(
          this.props.currentRule,
          this.props.currentCluster,
          topicArray
        );

        if (duplicate != null) {
          console.log("Error: duplicate topic found!");
          found = true;
        }

        this.setState({
          duplicateFound: found,
          duplicate: duplicate,
        });
      }
    );
  }

  /**
   *
   */
  onCustomTopicUpdate(e) {
    console.log("onCustomTopicUpdate ()");

    setEditorState(false);

    let topicArray = [];

    if (
      typeof this.state.topicText === "string" &&
      this.state.topicText.trim().length > 0
    ) {
      topicArray = topicsToArray(this.state.topicText);
    }

    if (
      this.props.ruleManager.checkDuplicates(
        this.props.currentRule,
        this.props.currentCluster,
        topicArray
      ) == true
    ) {
      console.log("Error: duplicate topic found!");
      return;
    }

    if (
      this.props.ruleManager.setClusterCustomTopics(
        this.props.currentRule,
        this.props.currentCluster,
        topicArray
      ) == false
    ) {
      console.log("Show an error dialog to the user");
    } else {
      // Request new data from the server

      let text = this.props.editorValue;

      let customTopics = this.props.ruleManager.getAllCustomTopics();
      let customTopicsStructured =
        this.props.ruleManager.getAllCustomTopicsStructured();

      //const escaped = encodeURIComponent(text);
      //const encoded = window.btoa(escaped);

      const encoded = encodeURIComponent(text);

      this.props
        .api(
          "ontopic",
          {
            custom: customTopics,
            customStructured: customTopicsStructured,
            base: encoded,
          },
          "POST"
        )
        .then((incoming) => {});
    }

    if (this.props.disableTreeSelect) {
      this.props.disableTreeSelect(false);
    }
  }

  /**
   *
   */
  createRuleDescription() {
    //console.log ("createRuleDescription ("+this.props.currentRule+","+this.props.currentCluster+")");

    let rules = this.props.ruleManager.rules;

    if (!rules) {
      return "Internal error: no rule definitions available";
    }

    // Nothing selected yet
    if (this.props.currentRule == -1) {
      return "";
    }

    let rule = rules[this.props.currentRule];

    if (!rule) {
      return "Internal error: invalid rule provided";
    }

    if (this.props.currentCluster != -1) {
      let description = rule.children[this.props.currentCluster].description;
      if (description == "") {
        description = " ";
      }
      //console.log ("Description: " + description);
      return description;
    }

    return rule.description;
  }

  /**
   *
   */
  createTopicEditor() {
    let enableEditor = false;
    let textareaClassName = "cluster-topic-input";
    let duplicateWarningClass = "";
    let duplicatewarning;

    if (this.props.currentCluster == -1) {
      enableEditor = true;
      textareaClassName = "cluster-topic-input cluster-textarea-disabled";
    }

    if (this.state.duplicateFound == true) {
      duplicateWarningClass = " cluster-duplicate";
      duplicatewarning = (
        <div className="cluster-warning">
          {"Warning: duplicate topic '" +
            this.state.duplicate.topic +
            "' found in " +
            this.state.duplicate.lemma}
        </div>
      );
    }

    return (
      <div className="cluster-topic-editor">
        <div>Pre-defined Topics:</div>
        <textarea
          readOnly={true}
          className={textareaClassName}
          value={this.state.topicTextStatic}
        ></textarea>
        <div>Custom Topics:</div>
        <textarea
          tabIndex={1}
          readOnly={enableEditor}
          className={textareaClassName + duplicateWarningClass}
          value={this.state.topicText}
          onChange={(e) => this.onTopicsChange(e)}
          onBlur={(e) => this.onTopiEditorFocusOut(e)}
          onFocus={(e) => this.onTopiEditorFocusIn(e)}
        ></textarea>
        <div className="cluster-topic-controls">
          {duplicatewarning}
          <Button
            onClick={(e) => this.onCustomTopicUpdate(e)}
            disabled={enableEditor}
          >
            Update
          </Button>
        </div>
      </div>
    );
  }

  /**
   *
   */
  createExamplePanel() {
    let rules = this.props.ruleManager.rules;

    if (!rules) {
      return (
        <div className="cluster-examples">
          Internal error: no rule definitions available
        </div>
      );
    }

    if (this.props.currentRule == -1) {
      return <div className="cluster-examples"></div>;
    }

    if (this.props.currentCluster == -1) {
      return <div className="cluster-examples"></div>;
    }

    let rule = rules[this.props.currentRule];

    if (!rule) {
      return (
        <div className="cluster-examples">
          Internal error: invalid rule provided
        </div>
      );
    }

    let cluster = rule.children[this.props.currentCluster];

    if (!cluster) {
      return (
        <div className="cluster-examples">
          Internal error: invalid cluster provided
        </div>
      );
    }

    //console.log ("Example data: " + cluster.examples);

    return (
      <div
        className="cluster-examples"
        dangerouslySetInnerHTML={{ __html: cluster.examples }}
      ></div>
    );
  }

  /**
   * Via Suguru in email:
   *
   * I don’t think we talked about this… There is a hard coded HTML string defined the UI code, which I have not externalized yet :-(
   *
   * CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE = "<p>Enter words and phrases associated with <b style=\"color: \'{}\'\">{}</b> in the text field.</p>"
   *
   * The variable “{}” is replaced by the name of the topic cluster associated with the currently selected rule.
   *
   * It is followed by the following HTML string in the instructions_en.yml file.
   *
   * topic_cluster_edu: >
   *  <p><b>What are topic clusters?</b> &mdash; Consider what your responses are for this expectation, and enter the words/phrases you need to convey them to your reader. A set of words/phrases for each response is called a topic cluster.</p>
   *
   */
  createClusterDefinition() {
    if (this.props.currentCluster != -1) {
      let cluster = this.props.ruleManager.getClusterByIndex(
        this.props.currentRule,
        this.props.currentCluster
      );

      let clusterList = this.props.ruleManager.listClustersForRule(
        this.props.currentRule,
        this.props.currentCluster
      );
      let clusterSentence = clusterListToSentence(clusterList);

      let defined =
        '<p>Enter words and phrases associated with <b style="color: black;">[replacer]</b> in the text field.</p> <br> <p><b>What are topic clusters?</b> &mdash; Consider what your responses are for this expectation, and enter the words/phrases you need to convey them to your reader. A set of words/phrases for each response is called a topic cluster.</p>';
      let clean = defined;
      if (cluster != null) {
        clean = defined.replace("[replacer]", clusterSentence);
      }
      return clean;
    }

    return "&nbsp;";
  }

  /**
   *
   */
  render() {
    let ruledescription = "<div></div>";
    let topiceditor;
    let examples;
    let clusterdefinition;

    ruledescription = this.createRuleDescription();
    topiceditor = this.createTopicEditor();
    examples = this.createExamplePanel();
    clusterdefinition = this.createClusterDefinition();

    return (
      <div className="cluster-container">
        <div className="cluster-title">
          <img src={clusterIcon} className="cluster-icon" />
          <div className="card-title h5">Topic Cluster</div>
        </div>
        <div className="cluster-content">
          <div
            className="cluster-content-left"
            dangerouslySetInnerHTML={{ __html: clusterdefinition }}
          ></div>
          {topiceditor}
        </div>
        <Tabs className="mt-1 px-2" onSelect={(key) => this.switchTab(key)}>
          <Tab eventKey={"expectationabout"} title="About this Expectation">
            <div
              className="cluster-text-padder"
              dangerouslySetInnerHTML={{ __html: ruledescription }}
            ></div>
          </Tab>
          <Tab eventKey={"examples"} title="Sample Sentences">
            {examples}
          </Tab>
        </Tabs>
      </div>
    );
  }
}

export default ClusterPanel;
