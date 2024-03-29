"use strict";

//import React from "react";

/**
 * @returns
 */
export default class DataTools {
  /**
   *
   */
  isEmpty(str) {
    return !str || 0 === str.length;
  }

  /**
   *
   */
  isBlank(str) {
    return !str || /^\s*$/.test(str);
  }

  /**
   * We need to switch to using the immutable package. That way we
   * avoid really expensive deep copies through bad tricks like the
   * one below.
   * @param {any} anObject
   */
  deepCopy(anObject) {
    return JSON.parse(JSON.stringify(anObject));
  }

  /**
   * This is a method that generates a shallow, non-editable version of a
   * parameter list
   */
  parameterJSONtoArray(anObjectMap) {
    //console.log ("parameterJSONtoArray ()");
    //console.log ("Parameter object: " + JSON.stringify (anObjectMap));

    var newArray = [];

    for (const key in anObjectMap) {
      if (Object.prototype.hasOwnProperty.call(anObjectMap, key)) {
        if (key != "dummy") {
          //console.log(key + " -> " + JSON.stringify (anObjectMap[key]));
          var parameterObject = new Object();
          parameterObject.parameter = key;
          parameterObject.value = anObjectMap[key];

          newArray.push(parameterObject);
        }
      }
    }

    return newArray;
  }

  /**
   *
   */
  parameterArrayToJSON(anArray) {
    var parameterObject = new Object();

    for (var i = 0; i < anArray.length; i++) {
      var testObject = anArray[i];

      if (testObject.path) {
        parameterObject[testObject.parameter] = testObject.path;
      } else {
        parameterObject[testObject.parameter] = testObject.value;
      }
    }

    return parameterObject;
  }

  /**
   *
   */
  jsonToTable(tablejson) {
    return this.parameterJSONtoArray(tablejson);
  }

  /**
   *
   */
  uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   *
   */
  deleteElement(anArray, aTarget) {
    for (var i = 0; i < anArray.length; i++) {
      if (anArray[i] === aTarget) {
        console.log("Deleting element ...");
        anArray.splice(i, 1);
        return anArray;
      }
    }

    return anArray;
  }

  /**
   *
   */
  popElement(anArray) {
    console.log("popElement ()");

    if (!anArray) {
      return anArray;
    }

    if (anArray.length == 0) {
      return anArray;
    }

    console.log("Before pop: " + anArray.length);

    anArray.splice(anArray.length - 1, 1);

    console.log("After pop: " + anArray.length);

    return anArray;
  }

  /**
   * https://www.mattzeunert.com/2016/01/28/javascript-deep-equal.html
   */
  jsonEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   *
   */
  getDateString() {
    var today = new Date();
    var date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    var time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + " " + time;

    return dateTime;
  }

  /**
   *
   */
  isString(aVar) {
    if (typeof aVar === "string" || aVar instanceof String) return true;

    return false;
  }

  /**
   *
   */
  isNumber(n) {
    return !isNaN(parseFloat(n)) && !isNaN(n - 0);
  }

  /**
   *
   */
  capitalizeFLetter(string) {
    return string[0].toUpperCase() + string.slice(1);
  }

  /**
   *
   */
  isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  /**
   *
   */
  isEmptyRow(aRow) {
    for (let i = 0; i < aRow.length; i++) {
      let testObject = aRow[i];
      if (testObject[0] != null) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   */
  debugStringArray(anArray) {
    for (let i = 0; i < anArray.length; i++) {
      console.log("'" + anArray[i] + "'");
    }
  }

  /**
   * 
   */
  topicsToArray (aTopicText) {
    let topics=[];

    let splitter=aTopicText.split ("\n");
    for (let i=0;i<splitter.length;i++) {
      topics.push (splitter [i]);
    }

    return (topics);
  }

  /**
   * Convert a list containing terms separated by newlines into a string with semicolons representing the newlines
   * This is used to transmit custom topics and pre-defined topics to the OnTopic backend. It is very important that
   * this method returns a valid string, this might be empty but it needs to be valid. That ensures a lot less
   * issues on the server side.
   * 
   * Note: make sure that the topics are unique
   */
  textToOnTopicList (aTextBlock) {
    if (aTextBlock==null) {
      return ("");
    }

    if (aTextBlock=="") {
      return ("");
    }
    return (aTextBlock.replace (/(?:\r\n|\r|\n)/g,";"));
  }

  /**
   * How much can this be optimized?
   */
  listContainsListElement (aListSource, aListTarget) {
    for (let i=0;i<aListSource.length;i++) {
      let testA=aListSource [i];
      for (let j=0;j<aListTarget.length;j++) {
        let testB=aListTarget[j];
        if (testA.toLowerCase ()==testB.toLowerCase ()) {
          return (true);
        }
      }
    }

    return (false);
  }

  /**
   * How much can this be optimized?
   */
  listFindDuplucateInList (aListSource, aListTarget) {
    for (let i=0;i<aListSource.length;i++) {
      let testA=aListSource [i];
      for (let j=0;j<aListTarget.length;j++) {
        let testB=aListTarget[j];
        if (testA.toLowerCase ()==testB.toLowerCase ()) {
          return (testA);
        }
      }
    }

    return (null);
  }  
}
