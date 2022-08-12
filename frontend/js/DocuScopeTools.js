"use strict";

/**
 * 
 */
export default class DocuScopeTools {

  /**
   * 
   */
  onTopic2DSWAHTML (anHTMLDataset) {
    /*
    let transformedHTML=anHTMLDataset.replaceAll ("<sent","<span");
    transformedHTML=transformedHTML.replaceAll ("</sent","</span");
    return (transformedHTML);
    */

    return (anHTMLDataset);
  }

  /**
   *
   */
  launch (forceStudent) {
    console.log ("launch ("+window.location.href+","+forceStudent+")");

    var ltiFields = window.serverContext.lti;
    
    // Change the role to student if forceStudent is set
    if (forceStudent==true) {
      ltiFields ["roles"]="urn:lti:instrole:ims/lis/Student,Student";
      ltiFields ["ext_roles"]="urn:lti:instrole:ims/lis/Student,Student";
    }

    var relayform = document.getElementById ("ltirelayform");
    relayform.innerHTML = '';

    // Now transform the LTI fields into form elements

    for (let key in ltiFields) {
      if (Object.prototype.hasOwnProperty.call(ltiFields, key)) {
        var ltiField=document.createElement ("input");
        ltiField.type="hidden";
        ltiField.id=key;
        ltiField.name=key;
        ltiField.value=ltiFields [key];

        relayform.appendChild (ltiField);
      }
    }

    relayform.setAttribute ("action",window.location.href);
    relayform.submit();
    relayform.style.visibility="hidden";
  }  
}
