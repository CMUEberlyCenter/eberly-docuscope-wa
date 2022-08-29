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

  /**
   * 
   */
  coherenceToClusterCounts (aCoherenceData) {
    //console.log ("coherenceToClusterCounts ()");

    let counts=[];

    if (!aCoherenceData.data) {
      return (counts);
    }

    for (let i=0;i<aCoherenceData.data.length;i++) {
      let testLemma=aCoherenceData.data [i];
      if (testLemma.sent_count) {
        //console.log ("Found sentence count: " + testLemma.sent_count);

        let lemmaFound={
          count: testLemma.sent_count,
          lemma: ""
        };
       
        // We need to make sure we take the plurals as well

        if (testLemma.topic) {
          if (testLemma.topic.length==3) {
            lemmaFound.lemma=testLemma.topic [2];
          } else {
            if (testLemma.topic.length==2) {
              lemmaFound.lemma=testLemma.topic [1];
            }
          }
        }

        counts.push (lemmaFound);
      }
    }

    //console.log (counts);

    return (counts);
  }

  /**
   * The toLowerCase() method converts a string to lowercase letters.
   * The toLowerCase() method does not change the original string.
   */
  compareLemmas (aLemmaA,aLemmaB) {
    //console.log ("compareLemmas ("+aLemmaA+","+aLemmaB+")");

    if (aLemmaA.toLowerCase ()==aLemmaB.toLowerCase ()) {
      //console.log ("Matched " + aLemmaA + " to " + aLemmaB);
      return (true);
    }

    return (false);
  }

  /**
   * 
   */
  clusterListToSentence (aList) {
    //console.log ("clusterListToSentence ()");
    //console.log (aList);

    let sentence="";

    if (aList.length==0) {
      return (sentence);
    }

    if (aList.length==1) {
      sentence=aList [0];
    }

    if (aList.length==2) {
      sentence = aList [0] + " and " + aList [1];
    }

    return (sentence);
  }
}
