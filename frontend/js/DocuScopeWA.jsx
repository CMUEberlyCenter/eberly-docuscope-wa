import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import DocuScopeWAScrim from './DocuScopeWAScrim';
import DocuScopeWAInstructor from './DocuScopeWAInstructor';
import DocuScopeWAStudent from './DocuScopeWAStudent';

import '../css/main.css';

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
  render() {
    let mainPage;

    if (this.isInstructor ()) {
      mainPage=<DocuScopeWAScrim><DocuScopeWAInstructor></DocuScopeWAInstructor></DocuScopeWAScrim>;
    } else {
      mainPage=<DocuScopeWAScrim><DocuScopeWAStudent></DocuScopeWAStudent></DocuScopeWAScrim>;
    }

    return (mainPage);
  }
}
