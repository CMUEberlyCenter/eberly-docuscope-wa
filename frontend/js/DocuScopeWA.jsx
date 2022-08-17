import React, { Component } from 'react';

import '../css/docuscope.css';
import '../css/main.css';

import EberlyLTIBase from './EberlyLTIBase';
import DocuScopeProgressWindow from './components/DocuScopeProgressWindow/DocuScopeProgressWindow';
import DataTools from './DataTools';
import DocuScopeTools from './DocuScopeTools';
import DocuScopeRules from './DocuScopeRules';
import DocuScopeWAScrim from './DocuScopeWAScrim';
import InstructorView from './views/Instructor/InstructorView';
import StudentView from './views/Student/StudentView';

/**
 * 
 */
export default class DocuScopeWA extends EberlyLTIBase {

  static DOCUSCOPE_STATE_FATAL=-1;
  static DOCUSCOPE_STATE_CONNECTING=0;
  static DOCUSCOPE_STATE_CONNECTED=1;
  static DOCUSCOPE_STATE_LOADING=2;
  static DOCUSCOPE_STATE_READY=3;

  /**
   *
   */
  constructor(props) {
    super(props);

    console.log ("DocuScopeWA ()");

    this.dataTools=new DataTools ();
    this.docuscopeTools=new DocuScopeTools ();
    this.ruleManager=new DocuScopeRules ();
    
    this.pingEnabled=true;
    this.pingTimer=-1;

    this.token=this.dataTools.uuidv4 ();
    this.session=this.dataTools.uuidv4 ();
    this.standardHeader={
      method: "GET",
      cache: 'no-cache'
    };

    this.state = {
      state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTING,
      html: null,
      progress: 0,
      progressTitle: "Loading ...",
      globallyDisabled: false,
      activeIndex: 1,
      ruleManager: this.ruleManager,
      server: {
        uptime: "retrieving ...",
        version: "retrieving ..."
      }
    }

    this.onLaunch=this.onLaunch.bind(this);
    this.apiCall=this.apiCall.bind(this);
  }

  /**
   *
   */
  componentDidMount () {
    console.log ("componentDidMount ()");

    setTimeout ((_e) => {
      this.setState ({
        state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTED,
        progress: 50,
        progressTitle: "Backend connected, loading data ..."
      });

      this.apiCall ("rules",null,"GET").then ((result) => {
        this.ruleManager.load (result);

        if (this.ruleManager.getReady ()==true) {
          if (this.pingEnabled==false) {
            this.setState ({
              state: DocuScopeWA.DOCUSCOPE_STATE_READY,
              progress: 100,
              progressTitle: "Application ready"
            });
          } else {
            this.setState ({
              state: DocuScopeWA.DOCUSCOPE_STATE_LOADING,
              progress: 75,
              progressTitle: "Ruleset loaded, Initializing ..."
            });

            console.log ("Starting ping service timer ...");
              
            /*
             Originally named 'ping', we had to change this because a bunch of browser-addons have a big
             problem with it. It trips up Adblock-Plus and Ghostery. So at least for now it's renamed
             to 'ding'
            */
            this.apiCall ("ding",null,"GET").then ((result) => {
              this.setState ({
                state: DocuScopeWA.DOCUSCOPE_STATE_READY,
                server: result
              });
            });

            /*
             Originally named 'ping', we had to change this because a bunch of browser-addons have a big
             problem with it. It trips up Adblock-Plus and Ghostery. So at least for now it's renamed
             to 'ding'
            */
            /*
            this.pingTimer=setInterval ((_e) => {
              this.apiCall ("ding",null,"GET").then ((result) => {
                this.setState ({
                  state: DocuScopeWA.DOCUSCOPE_STATE_READY,
                  server: result
                });
              });
            },30000);
            */

            this.setState ({
              state: DocuScopeWA.DOCUSCOPE_STATE_READY,
              progress: 100,
              progressTitle: "Application ready"
            });
          }
        } else {
         this.setState ({
            state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
            progress: 100,
            progressTitle: "Error: unable to process ruleset"
          });
        }
      });
    },1000);
  }

  /**
   *
   */
  evaluateResult (aMessage) {
    if (aMessage.status!="success") {
      return (aMessage.message);
    }

    return (null);
  }

  /**
   *
   */
  createDataMessage (aData) {
    let message={
      status: "request",
      data: aData
    }
    return (JSON.stringify(message));
  }

  /**
   *
   */
  apiPOSTCall (aURL,aData) {
    console.log ("apiPOSTCall ()");

    let payload=this.createDataMessage (aData);
    let that=this;

    return new Promise((resolve, reject) => {
      fetch(aURL,{
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: payload
      }).then(resp => resp.text()).then((result) => {
        let raw=JSON.parse(result);
        let evaluation=this.evaluateResult (raw);
        if (evaluation!=null) {
          reject(evaluation);
        } else {
          if (raw.data.html) {
            let html=this.docuscopeTools.onTopic2DSWAHTML (window.atob (raw.data.html));
            console.log (html);
            that.setState ({html: html});
          }
          resolve (raw.data);
        }
      }).catch((error) => {
        this.setState ({
          state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
          progress: 100,
          progressTitle: "Error: unable to connect to server, retrying ..."
        });
        reject(error);
      });
    });
  }

  /**
   *
   */
  apiGETCall (aURL, _aData) {
    console.log ("apiGETCall ()");

    let that=this;
    return new Promise((resolve, reject) => {
      fetch(aURL,this.standardHeader).then(resp => resp.text()).then((result) => {
        let raw=JSON.parse(result);
        let evaluation=this.evaluateResult (raw);
        if (evaluation!=null) {
          reject(evaluation);
        } else {
          if (raw.data.html) {
            let html=this.docuscopeTools.onTopic2DSWAHTML (window.atob (raw.data.html));
            console.log (html);
            that.setState ({html: html});
          }          
          resolve (raw.data);
        }
      }).catch((error) => {
        //console.log (error);

        this.setState ({
          state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
          progress: 100,
          progressTitle: "Error: unable to connect to server, retrying ..."
        });
        reject(error);
      });
    });
  }

  /**
     https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

     {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
       'Content-Type': 'application/json'
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    }
   */
  apiCall (aCall,aData,aType) {
    console.log ("apiCall ("+aCall+")");

    let aURL="/api/v1/"+aCall+"?token="+this.token+"&session="+this.session;

    if (aType=="POST") {
      return (this.apiPOSTCall (aURL,aData));
    }

    if (aType=="GET") {
      return (this.apiGETCall (aURL,aData));
    }
  }

  /**
   *
   */
  isStudent () {
    if (this.state.globallyDisabled==true) {
      return (false);
    }

    if (!window.serverContext) {
      return (false);
    }

    if (!window.serverContext.roles) {
      return (false);
    }

    var splitter=window.serverContext.roles.split (",");

    for (var i=0;i<splitter.length;i++) {
      if ((splitter [i]=="urn:lti:instrole:ims/lis/Student") || (splitter [i]=="Student")) {
        return(true);
      }
    }

    return (false);
  }

  /**
   *
   */
  isInstructor () {
    if (this.state.globallyDisabled==true) {
      return (false);
    }

    if (!window.serverContext) {
      return (false);
    }

    if (!window.serverContext.lti) {
      return (false);
    }    


    if (!window.serverContext.lti.roles) {
      return (false);
    }

    var splitter=window.serverContext.lti.roles.split (",");

    for (var i=0;i<splitter.length;i++) {
      if ((splitter [i]=="urn:lti:instrole:ims/lis/Instructor") || (splitter [i]=="urn:lti:instrole:ims/lis/Administrator") || (splitter [i]=="Instructor")) {
        return(true);
      }
    }

    return (false);
  }

  /**
   *
   */
  inIframe () {
    try {
      return (window.self !== window.top);
    } catch (e) {
      return (true);
    }
  }

  /**
   *
   */
  onLaunch (e) {
    this.docuscopeTools.launch (false);
  }

  /**
   *
   */
  showLoader () {
    return (<div className="loader">
        <button id="launcher" className="center_button" onClick={(e) => this.onLaunch(e)}>Open in new Window</button>
        <div className="iframe">
          <form id="ltirelayform" target="docuscopewa" method="post"></form>
        </div>
      </div>);
  }

  /**
   *
   */
  render() {
    let progresswindow;
    let mainPage;

    if (this.isInstructor ()) {
      return (<DocuScopeWAScrim><InstructorView api={this.apiCall} server={this.state.server} ruleManager={this.state.ruleManager} /></DocuScopeWAScrim>);
    }

    if (this.inIframe ()==true) {
      return (this.showLoader ());
    }

    if (this.state.state != DocuScopeWA.DOCUSCOPE_STATE_READY) {
      progresswindow=<DocuScopeProgressWindow title={this.state.progressTitle} progress={this.state.progress} />;
      mainPage=<DocuScopeWAScrim>{progresswindow}</DocuScopeWAScrim>;
    } else {
      mainPage=<DocuScopeWAScrim><StudentView api={this.apiCall} server={this.state.server} ruleManager={this.state.ruleManager} html={this.state.html}></StudentView></DocuScopeWAScrim>;
    }

    return (mainPage);
  }
}
