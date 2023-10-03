import { Component } from "react";

//import EberlyNetworkTools from './EberlyNetworkTools';

var idleTime = 0;
var tutorTimeout = 5; // in minutes
// var disableCallback = null;
var idleInterval = -1;

/**
 *
 */
class EberlyLTIBase extends Component {
  /**
   *
   */
  constructor(props) {
    super(props);

    this.state = {
      scrimUp: false,
      scrimMessage: "Your session has timed out, please reload this page.",
      scrimExtended: "",
    };

    //this.networkTools=new EberlyNetworkTools ();

    this.revokeTokens = this.revokeTokens.bind(this);
    this.timerIncrement = this.timerIncrement.bind(this);
    this.disableApp = this.disableApp.bind(this);

    this.setIdleTimeout();
  }

  /**
   *
   */
  eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999;";
  }

  // use v4 from uuid library.

  /**
   *
   */
  setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  /**
   *
   */
  getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  /**
   *
   */
  setIdleTimeout() {
    // Increment the idle time counter every minute.
    idleInterval = setInterval(this.timerIncrement, 60000); // 1 minute or 60 * 1000 millis

    // Zero the idle timer on mouse movement.
    document.addEventListener("mousemove", (_e) => {
      //console.log ("reset idle time");
      idleTime = 0;
    });

    document.addEventListener("keypress", (_e) => {
      //console.log ("reset idle time");
      idleTime = 0;
    });
  }

  /**
   *
   */
  timerIncrement() {
    if (idleTime < 0) {
      return;
    }

    idleTime = idleTime + 1;

    if (idleTime > tutorTimeout) {
      // 20 minutes by default
      idleTime = -1;
      this.disableApp();
    }
  }

  /**
   *
   */
  disableApp() {
    console.log("disableApp ()");

    this.setState(
      {
        scrimUp: true,
        scrimMessage: "Your session has timed out, please reload this page.",
        scrimExtended: "",
      },
      (_e) => {
        clearInterval(idleInterval);
        this.revokeTokens();
      }
    );
  }

  /**
   *
   */
  revokeTokens() {
    console.log("revokeTokens ()");

    //let result=this.networkTools.postData("/lti/activity/catme/revoketokens", window.settings);
    //console.log (result);
  }
}

export default EberlyLTIBase;
