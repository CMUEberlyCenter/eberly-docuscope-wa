/**
 *
 */
export function isEmptyString(str) {
  return !str || 0 === str.length;
}

/**
 *
 */
export function isBlank(str) {
  return !str || /^\s*$/.test(str);
}

/**
 * We need to switch to using the immutable package. That way we
 * avoid really expensive deep copies through bad tricks like the
 * one below.
 * @param {any} anObject
 */
export function deepCopy(anObject) {
  return JSON.parse(JSON.stringify(anObject));
}

/**
 * This is a method that generates a shallow, non-editable version of a
 * parameter list
 */
export function parameterJSONtoArray(anObjectMap) {
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
export function parameterArrayToJSON(anArray) {
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
export function jsonToTable(tablejson) {
  return this.parameterJSONtoArray(tablejson);
}

/**
 *
 */
export function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 *
 * @template A
 * @param {A[]} anArray
 * @param {A} aTarget
 */
export function deleteElement(anArray, aTarget) {
  return anArray.filter((a) => a !== aTarget);
}

/**
 *
 */
export function popElement(anArray) {
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
export function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 *
 */
export function getDateString() {
  var today = new Date();
  return today.toLocaleString();
}

/**
 *
 */
export function isString(aVar) {
  if (typeof aVar === "string" || aVar instanceof String) return true;

  return false;
}

/**
 *
 */
export function isNumber(n) {
  return !isNaN(parseFloat(n)) && !isNaN(n - 0);
}

/**
 *
 */
export function capitalizeFLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

/**
 *
 */
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 *
 * @param {unknown[][]} aRow
 */
export function isEmptyRow(aRow) {
  return aRow.every((row) => row[0] === null);
}

/**
 *
 */
export function debugStringArray(anArray) {
  anArray.forEach((i) => console.log(`'${i}'`));
}

/**
 *
 * @param {string} aTopicText
 */
export function topicsToArray(aTopicText) {
  return aTopicText.split("\n");
}

/**
 * Convert a list containing terms separated by newlines into a string with semicolons representing the newlines
 * This is used to transmit custom topics and pre-defined topics to the OnTopic backend. It is very important that
 * this method returns a valid string, this might be empty but it needs to be valid. That ensures a lot less
 * issues on the server side.
 *
 * Note: make sure that the topics are unique
 * @param {string?} aTextBlock
 */
export function textToOnTopicList(aTextBlock) {
  if (aTextBlock === null) {
    return "";
  }

  if (aTextBlock === "") {
    return "";
  }
  return aTextBlock.replace(/(?:\r\n|\r|\n)/g, ";");
}

/**
 * How much can this be optimized?
 */
export function listContainsListElement(aListSource, aListTarget) {
  for (let i = 0; i < aListSource.length; i++) {
    let testA = aListSource[i];
    for (let j = 0; j < aListTarget.length; j++) {
      let testB = aListTarget[j];
      if (testA.toLowerCase() == testB.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * How much can this be optimized?
 * Reduced from O(n^2) to O(n) or O(n lg n) depending on the Set implementation.
 * @param {string[]} aListSource
 * @param {string[]} aListTarget
 */
export function listFindDuplucateInList(aListSource, aListTarget) {
  const targets = new Set(aListTarget.map((t) => t.toLowerCase()));
  return aListSource.find((a) => targets.has(a.toLowerCase())) ?? null;
}
