import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import DataTools from './DataTools';
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

    this.dataTools=new DataTools ();

    this.ruleManager=new DocuScopeRules ();
    this.pingTimer=-1;
    this.token=this.dataTools.uuidv4 ();
    this.session=this.dataTools.uuidv4 ();
    this.standardHeader={
      method: "GET",       
      cache: 'no-cache'
    };

    this.state = {
      state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTING,
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

    setTimeout ((e) => {
      this.setState ({
        state: DocuScopeWA.DOCUSCOPE_STATE_CONNECTED,
        progress: 50,
        progressTitle: "Backend connected, loading data ..."
      });

      this.apiCall ("rules",null,"GET").then ((result) => {
        this.ruleManager.parse (result);

        if (this.ruleManager.getReady ()==true) {
          this.setState ({
            state: DocuScopeWA.DOCUSCOPE_STATE_LOADING,
            progress: 75,
            progressTitle: "Ruleset loaded, Initializing ..."
          });

          console.log ("Starting ping service timer ...");

          this.apiCall ("ping",null,"GET").then ((result) => {
            this.setState ({
              state: DocuScopeWA.DOCUSCOPE_STATE_READY,
              server: result
            });
          });          

          this.pingTimer=setInterval ((e) => {
            this.apiCall ("ping",null,"GET").then ((result) => {
              this.setState ({
                state: DocuScopeWA.DOCUSCOPE_STATE_READY,
                server: result
              });
            });
          },30000);

          this.setState ({
            state: DocuScopeWA.DOCUSCOPE_STATE_READY,
            progress: 100,
            progressTitle: "Application ready"
          });          
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
    let payload=this.createDataMessage (aData);

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
  apiGETCall (aURL,aData) {
    return new Promise((resolve, reject) => {  
      fetch(aURL,this.standardHeader).then(resp => resp.text()).then((result) => {
        let raw=JSON.parse(result);
        let evaluation=this.evaluateResult (raw);
        if (evaluation!=null) {
          reject(evaluation);
        } else {
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
      progresswindow=<DocuScopeProgressWindow title={this.state.progressTitle} progress={this.state.progress} />;
      mainPage=<DocuScopeWAScrim>{progresswindow}</DocuScopeWAScrim>;      
    } else {
      if (this.isInstructor ()) {
        mainPage=<DocuScopeWAScrim><DocuScopeWAInstructor api={this.apiCall} server={this.state.server} ruleManager={this.state.ruleManager}></DocuScopeWAInstructor></DocuScopeWAScrim>;
      } else {
        mainPage=<DocuScopeWAScrim><DocuScopeWAStudent api={this.apiCall} server={this.state.server} ruleManager={this.state.ruleManager}></DocuScopeWAStudent></DocuScopeWAScrim>;
      }
    }

    return (mainPage);
  }
}
