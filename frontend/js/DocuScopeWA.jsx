import React from "react";

import "../css/docuscope.css";
import "../css/main.css";

import { v4 as uuidv4 } from "uuid";
import DocuScopeRules from "./DocuScopeRules";
import {
  cleanAndRepairHTMLSentenceData,
  coherenceToClusterCounts,
  onTopic2DSWAHTML,
} from "./DocuScopeTools";
import DocuScopeWAScrim from "./DocuScopeWAScrim";
import EberlyLTIBase from "./EberlyLTIBase";
import DocuScopeProgressWindow from "../src/app/components/DocuScopeProgressWindow/DocuScopeProgressWindow";
import InstructorView from "./views/Instructor/InstructorView";
import StudentView from "./views/Student/StudentView";
import { assignmentId, isInstructor } from "./service/lti.service";
import { launch } from "../src/app/service/lti.service";

/**
 *
 */
export default class DocuScopeWA extends EberlyLTIBase {
  static DOCUSCOPE_STATE_FATAL = -1;
  static DOCUSCOPE_STATE_CONNECTING = 0;
  static DOCUSCOPE_STATE_CONNECTED = 1;
  static DOCUSCOPE_STATE_LOADING = 2;
  static DOCUSCOPE_STATE_READY = 3;
  static DOCUSCOPE_STATE_REQUESTING = 4;

  /**
   *
   */
  constructor(props) {
    super(props);

    this.progressTimer = -1;

    this.ruleManager = new DocuScopeRules();
    this.ruleManager.updateNotice = this.updateNotice.bind(this);

    this.pingTimer = -1;

    this.token = uuidv4();
    this.session = uuidv4();
    this.standardHeader = {
      method: "GET",
      cache: "no-cache",
    };

    this.state = {
      state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTING,
      html: null,
      htmlSentences: null,
      progress: 0,
      progressTitle: "Loading ...",
      globallyDisabled: false,
      activeIndex: 1,
      ruleManager: this.ruleManager,
      server: {
        uptime: "retrieving ...",
        version: "retrieving ...",
      },
      badUpdatecounter: 0,
    };

    this.updateNotice = this.updateNotice.bind(this);
    this.updateSerializedText = this.updateSerializedText.bind(this);
    this.onLaunch = this.onLaunch.bind(this);
    this.apiCall = this.apiCall.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.ready = this.ready.bind(this);
  }

  /**
   *
   */
  componentDidMount() {
    setTimeout((_e) => {
      this.setState({
        state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTED,
        progress: 50,
        progressTitle: "Backend connected, loading data ...",
      });

      if (!this.isInstructor()) {
        const ruleUrl = new URL(
          `/api/v1/assignments/${assignmentId()}/configuration`,
          location.href
        );
        // TODO add lti token, session, etc.
        fetch(ruleUrl)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error("Unable to retrieve configuration.");
          })
          .then((rules) => {
            // initializing state unnecessary.
            this.setState({
              state: DocuScopeWA.DOCUSCOPE_STATE_LOADING,
              progress: 75,
              progressTitle: "Ruleset loaded, Initializing ...",
            });
            this.ruleManager.load(rules);
            this.ready();
          })
          .catch((err) => {
            console.error(err);
            this.setState({
              state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
              progress: 100,
              progressTitle: "Error: unable to process ruleset",
            });
          });
      } else {
        console.log(
          "Operating in instructor mode, no need to fetch a rule file"
        );
        this.ready();
      }
    }, 1000);
  }

  /**
   *
   */
  ready() {
    if (this.progressTimer != -1) {
      clearInterval(this.progressTimer);
      this.progressTimer = -1;
    }

    this.setState({
      state: DocuScopeWA.DOCUSCOPE_STATE_READY,
      progress: 100,
      progressTitle: "Application ready",
    });
  }

  /**
   *
   */
  updateProgress() {
    let tempProgress = this.state.progress;
    tempProgress += 10;
    if (tempProgress > 100) {
      tempProgress = 100;
    }

    this.setState({
      progress: tempProgress,
    });
  }

  /**
   * Replace with RxJS
   */
  updateNotice(resetState) {
    console.log("updateNotice (reset:" + resetState + ")");

    if (resetState) {
      this.setState({
        badUpdatecounter: Math.floor(Math.random() * 10000),
        html: null,
        htmlSentences: null,
      });
    } else {
      this.setState({
        badUpdatecounter: Math.floor(Math.random() * 10000),
      });
    }
  }

  /**
   *
   */
  evaluateResult(aMessage) {
    if (aMessage.status !== "success") {
      return aMessage.message;
    }

    return null;
  }

  /**
   *
   */
  createDataMessage(aData) {
    let message = {
      status: "request",
      data: aData,
    };
    return JSON.stringify(message);
  }

  /**
   * Make sure the preview contains the same text as the editor. We call this to make sure that the 'hidden'
   * serialized text version of the editor is set so that we can go into read-only- mode
   */
  updateSerializedText(_aText) {
    this.setState({
      html: null,
      htmlSentences: null,
    });
  }

  /**
   *
   */
  async apiPOSTCall(aURL, aData) {
    const payload = this.createDataMessage(aData);

    this.updateSerializedText(null);

    this.setState({
      progress: 0,
      progressTitle: "Retrieving data ...",
      state: DocuScopeWA.DOCUSCOPE_STATE_REQUESTING,
    });

    this.progressTimer = setInterval(this.updateProgress, 1000);

    try {
      const resp = await fetch(aURL, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: payload,
      });
      const raw = await resp.json();
      this.ready();
      let evaluation = this.evaluateResult(raw);
      if (evaluation !== null) {
        throw new Error(evaluation);
      }
      if (raw.data.html) {
        //let html=onTopic2DSWAHTML (window.atob (raw.data.html));
        const html = onTopic2DSWAHTML(raw.data.html);
        let html_sentences = null;
        if (raw.data.html_sentences) {
          html_sentences = cleanAndRepairHTMLSentenceData(
            raw.data.html_sentences
          );
        }

        this.setState({
          html: html,
          htmlSentences: html_sentences,
        });
      }

      if (raw.data.coherence) {
        //console.log (raw.data.coherence);

        // If there really is a very small amount of data, like a one word phrase, then you might get this exclusively:
        // {error: "ncols is 0"} Let's handle that in cleanCoherenceData so that the rest of the code goes through its
        // usual paces instead of creating a global exception

        // Clean and replace
        raw.data.coherence = this.ruleManager.cleanCoherenceData(
          raw.data.coherence
        );
        raw.data.local = this.ruleManager.cleanLocalCoherenceData(
          raw.data.local
        );
        this.ruleManager.updateLemmaCounts(
          coherenceToClusterCounts(raw.data.coherence, raw.data.local)
        );
      }
      return raw.data;
    } catch (error) {
      this.setState({
        state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
        progress: 100,
        progressTitle: "Error: unable to connect to server",
      });
      throw error;
    }
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   */
  apiGETCall(aURL, _aData) {
    this.updateSerializedText(null);

    return new Promise((resolve, reject) => {
      fetch(aURL, this.standardHeader)
        .then((resp) => resp.text())
        .then((result) => {
          let raw = JSON.parse(result);
          let evaluation = this.evaluateResult(raw);
          if (evaluation != null) {
            reject(evaluation);
          } else {
            if (raw.data.html) {
              let html = onTopic2DSWAHTML(window.atob(raw.data.html));
              let html_sentences = null;
              if (raw.data.html_sentences) {
                html_sentences = cleanAndRepairHTMLSentenceData(
                  raw.data.html_sentences
                );
              }

              this.setState({
                html: html,
                htmlSentences: html_sentences,
              });
            }

            if (raw.data.coherence) {
              // Clean and replace
              raw.data.coherence = this.ruleManager.cleanCoherenceData(
                raw.data.coherence
              );
              raw.data.local = this.ruleManager.cleanLocalCoherenceData(
                raw.data.local
              );
              this.ruleManager.updateLemmaCounts(
                coherenceToClusterCounts(raw.data.coherence, raw.data.local)
              );
            }

            resolve(raw.data);
          }
        })
        .catch((error) => {
          console.log(error);
          this.setState({
            state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
            progress: 100,
            progressTitle: "Error: unable to connect to server",
          });
          reject(error);
        });
    });
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   */
  apiCall(aCall, aData, aType) {
    const course_id = assignmentId();

    const aURL = `/api/v1/${aCall}?token=${this.token}&session=${this.session}&course_id=${course_id}`;

    if (aType === "POST") {
      return this.apiPOSTCall(aURL, aData);
    }

    if (aType === "GET") {
      return this.apiGETCall(aURL, aData);
    }
  }

  /**
   *
   */
  isStudent() {
    if (this.state.globallyDisabled == true) {
      return false;
    }

    if (!window.serverContext) {
      return false;
    }

    if (!window.serverContext.roles) {
      return false;
    }

    var splitter = window.serverContext.lti.roles.split(",");

    for (var i = 0; i < splitter.length; i++) {
      if (
        splitter[i] == "urn:lti:instrole:ims/lis/Student" ||
        splitter[i] == "Student"
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   *
   */
  isInstructor() {
    if (this.state.globallyDisabled == true) {
      return false;
    }
    return isInstructor();

    // if (!window.serverContext) {
    //   return false;
    // }

    // if (!window.serverContext.lti) {
    //   return false;
    // }

    // if (!window.serverContext.lti.roles) {
    //   return false;
    // }

    // var splitter = window.serverContext.lti.roles.split(",");

    // for (var i = 0; i < splitter.length; i++) {
    //   if (
    //     splitter[i] == "urn:lti:instrole:ims/lis/Instructor" ||
    //     splitter[i] == "urn:lti:instrole:ims/lis/Administrator" ||
    //     splitter[i] == "Instructor"
    //   ) {
    //     return true;
    //   }
    // }

    // return false;
  }

  /**
   *
   */
  inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  /**
   *
   */
  onLaunch(_e) {
    launch(false);
  }

  /**
   *
   */
  showLoader() {
    return (
      <div className="loader">
        <button
          id="launcher"
          className="center_button"
          onClick={(e) => this.onLaunch(e)}
        >
          Open in new Window
        </button>
        <div className="iframe">
          <form id="ltirelayform" target="docuscopewa" method="post"></form>
        </div>
      </div>
    );
  }

  /**
   *
   */
  render() {
    let progresswindow;
    let mainPage;
    let scrimup = false;

    if (this.isInstructor()) {
      return <InstructorView />;
    }

    if (this.inIframe() == true) {
      return this.showLoader();
    }

    if (this.state.state !== DocuScopeWA.DOCUSCOPE_STATE_READY) {
      scrimup = true;
      progresswindow = (
        <DocuScopeProgressWindow
          title={this.state.progressTitle}
          progress={this.state.progress}
        />
      );
    }

    mainPage = (
      <DocuScopeWAScrim enabled={scrimup} dialog={progresswindow}>
        <StudentView
          api={this.apiCall}
          ruleManager={this.state.ruleManager}
          html={this.state.html}
          htmlSentences={this.state.htmlSentences}
          update={this.updateSerializedText}
        ></StudentView>
      </DocuScopeWAScrim>
    );

    return mainPage;
  }
}
