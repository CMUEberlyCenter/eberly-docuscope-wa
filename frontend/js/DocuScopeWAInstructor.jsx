import React, { Component } from 'react';

import 'foundation-sites/dist/css/foundation.min.css';

import { Button, Colors } from 'react-foundation';
import { Tabs, TabItem, TabsContent, TabPanel } from 'react-foundation';

import DocuScopeWA from './DocuScopeWAScrim';
import DocuScopeRules from './DocuScopeRules';

import '../css/main.css';

/**
 * https://bit.dev/digiaonline/react-foundation
 */
export default class DocuScopeWAInstructor extends Component {

  /**
   *
   */
  constructor(props) {
    super(props);

    console.log ("DocuScopeWAInstructor ()");
  }

  /**
   *
   */
  render() {
    let mainPage;

    mainPage=<div></div>;

    return (mainPage);
  }
}