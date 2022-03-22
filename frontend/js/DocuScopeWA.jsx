import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import DocuScopeWAScrim from './DocuScopeWAScrim';
import DocuScopeWAInstructor from './DocuScopeWAInstructor';
import DocuScopeWAStudent from './DocuScopeWAStudent';
import DocuScopeRules from './DocuScopeRules';
import DocuScopeProgressWindow from './DocuScopeProgressWindow';

import '../css/main.css';
import '../css/docuscope.css';

/**
 * https://bit.dev/digiaonline/react-foundation
 */
export default class DocuScopeWA extends Component {

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

    this.ruleManager=new DocuScopeRules ();
    this.pingTimer=-1;
    this.token="AAA";
    this.session="BBB";
    this.standardHeader={
      method: "GET",       
      cache: 'no-cache'
    };

    this.state = {
      state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTING,
      progress: 0,
      progressState: "Loading ...",
      globallyDisabled: false,
      activeIndex: 1,
      ruleManager: this.ruleManager
    }

    this.onLaunch=this.onLaunch.bind(this);

    //ruleManager.debugRules ();
  }

  /**
   *
   */
  componentDidMount () {
    console.log ("componentDidMount ()");

    setTimeout ((e) => {
      this.setState ({
        state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTED,
        progress: 50,
        progressState: "Backend connected, loading data ..."
      });

      this.apiCall ("rules").then ((result) => {
        this.ruleManager.parse (result.data);

        if (this.ruleManager.getReady ()==true) {
          this.setState ({
            state: DocuScopeWA.DOCUSCOPE_STATE_LOADING,
            progress: 75,
            progressState: "Ruleset loaded, Initializing ..."
          });

          console.log ("Starting ping service timer ...");

          this.pingTimer=setInterval ((e) => {
            this.apiCall ("ping").then ((result) => {
              console.log (result);
            });
          },30000);

          this.setState ({
            state: DocuScopeWA.DOCUSCOPE_STATE_READY,
            progress: 100,
            progressState: "Application ready"
          });          
        } else {
         this.setState ({
            state: DocuScopeWA.DOCUSCOPE_STATE_FATAL,
            progress: 100,
            progressState: "Error: unable to process ruleset"
          });
        }
      });
    },1000);
  }

  /**
   *
   */
  componentDidUnmount () {
    console.log ("componentDidUnmount ()");

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
  apiCall (aCall,anArgumentSet) {
    console.log ("apiCall ("+aCall+")");

    let aURL="/api/v1/"+aCall+"?token="+this.token+"&session="+this.session+"&"+anArgumentSet;

    return new Promise((resolve, reject) => {  
      fetch(aURL,this.standardHeader).then(resp => resp.text()).then((result) => {
        let raw=JSON.parse(result);
        let evaluation=this.evaluateResult (raw);
        if (evaluation!=null) {
          reject(evaluation);
        } else {
          resolve (raw);
        }
      });
    }) .catch((error) => {
      console.log (error);
      reject(error);
    });
  }  

  /**
   *
   */
  isStudent () {
    if (this.state.globallyDisabled==true) {
      return (false);
    }

    if (!serverContext) {
      return (false);
    }


    if (!serverContext.roles) {
      return (false);
    }

    var splitter=serverContext.roles.split (",");

    for (var i=0;i<splitter.length;i++) {
      if (splitter [i]=="urn:lti:instrole:ims/lis/Student") {
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

    if (!serverContext) {
      return (false);
    }


    if (!serverContext.roles) {
      return (false);
    }


    var splitter=serverContext.roles.split (",");

    for (var i=0;i<splitter.length;i++) {
      if (splitter [i]=="urn:lti:instrole:ims/lis/Instructor") {
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
  showLoader () {
    return (<div className="loader">
        <button id="launcher" className="center_button" onClick={this.onLaunch}>Open in new Window</button>
        <div className="iframe">
          <form id="ltirelayform" target="docuscopewa" method="post"></form>
        </div>        
      </div>);progress
  }   

  /**
   *
   */
  onLaunch () {
    console.log ("onLaunch ("+window.location.href+")");

    var ltiFields = serverContext.lti;

    console.log (ltiFields);

    var relayform = document.getElementById ("ltirelayform");

    for (let key in ltiFields) {
      if (ltiFields.hasOwnProperty(key)) {
        console.log("Appending: " + key + " -> " + ltiFields[key]);

        var ltiField=document.createElement ("input");
        ltiField.type="hidden";
        ltiField.id=key;
        ltiField.name=key;
        ltiField.value=ltiFields [key];
        /*
        $('<input>').attr({
          type: 'hidden',
          id: key,
          name: key,
          value: ltiFields [key]
        }).appendTo('#ltirelayform');
        */

        relayform.appendChild (ltiField);
      }
    }

    relayform.setAttribute ("action",window.location.href);
    relayform.submit();
    relayform.style.visibility="hidden";
  }   

  /**
   *
   */
  render() {
    let progresswindow;
    let mainPage;

    if (this.inIframe ()==true) {
      return (this.showLoader ());
    }

    if (this.state.state != DocuScopeWA.DOCUSCOPE_STATE_READY) {
      progresswindow=<DocuScopeProgressWindow state={this.state.progressState} progress={this.state.progress} />;
      mainPage=<DocuScopeWAScrim>{progresswindow}</DocuScopeWAScrim>;      
    } else {
      if (this.isInstructor ()) {
        mainPage=<DocuScopeWAScrim><DocuScopeWAInstructor ruleManager={this.state.ruleManager}></DocuScopeWAInstructor></DocuScopeWAScrim>;
      } else {
        mainPage=<DocuScopeWAScrim><DocuScopeWAStudent ruleManager={this.state.ruleManager}></DocuScopeWAStudent></DocuScopeWAScrim>;
      }
    }

    return (mainPage);
  }
}
