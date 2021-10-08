import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import DocuScopeWAScrim from './DocuScopeWAScrim';
import DocuScopeWAInstructor from './DocuScopeWAInstructor';
import DocuScopeWAStudent from './DocuScopeWAStudent';

import '../css/main.css';
import '../css/docuscope.css';

/**
 * https://bit.dev/digiaonline/react-foundation
 */
export default class DocuScopeWA extends Component {

  /**
   *
   */
  constructor(props) {
    super(props);

    console.log ("DocuScopeWA ()");

    this.state = {
      globallyDisabled: false,
      activeIndex: 1
    }

    this.onLaunch=this.onLaunch.bind(this);
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
      </div>);
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
    let mainPage;

    if (this.inIframe ()==true) {
      return (this.showLoader ());
    }

    if (this.isInstructor ()) {
      mainPage=<DocuScopeWAScrim><DocuScopeWAInstructor></DocuScopeWAInstructor></DocuScopeWAScrim>;
    } else {
      mainPage=<DocuScopeWAScrim><DocuScopeWAStudent></DocuScopeWAStudent></DocuScopeWAScrim>;
    }

    return (mainPage);
  }
}
