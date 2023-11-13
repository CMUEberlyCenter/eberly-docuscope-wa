/**
 * unused
 */
// export function isEmptyString(str) {
//   return !str || 0 === str.length;
// }

/**
 * unused
 */
// export function isBlank(str) {
//   return !str || /^\s*$/.test(str);
// }

/**
 * We need to switch to using the immutable package. That way we
 * avoid really expensive deep copies through bad tricks like the
 * one below.
 * @param {any} anObject
 */
export function deepCopy<T>(anObject: T): T {
  return JSON.parse(JSON.stringify(anObject));
}

type ParameterValue = { parameter: string, value: string, path?: string };
/**
 * This is a method that generates a shallow, non-editable version of a
 * parameter list
 */
export function parameterJSONtoArray(anObjectMap: Record<string, string>): ParameterValue[] {
  //console.log ("parameterJSONtoArray ()");
  //console.log ("Parameter object: " + JSON.stringify (anObjectMap));

  const newArray: ParameterValue[] = [];

  for (const key in anObjectMap) {
    if (Object.prototype.hasOwnProperty.call(anObjectMap, key)) {
      if (key !== "dummy") {
        newArray.push({ parameter: key, value: anObjectMap[key] });
      }
    }
  }

  return newArray;
}

/**
 *
 */
export function parameterArrayToJSON(anArray: ParameterValue[]): Record<string, string> {
  const parameterObject: Record<string, string> = {};

  anArray.forEach(({ parameter, value, path }) => {
    parameterObject[parameter] = path ?? value;
  });

  return parameterObject;
}

/**
 * unused
 */
// export function jsonToTable(tablejson) {
//   return parameterJSONtoArray(tablejson);
// }

/**
 * unused
 * @template A
 * @param {A[]} anArray
 * @param {A} aTarget
 */
// export function deleteElement(anArray, aTarget) {
//   return anArray.filter((a) => a !== aTarget);
// }

/**
 * unused
 */
// export function popElement(anArray) {
//   console.log("popElement ()");

//   if (!anArray) {
//     return anArray;
//   }

//   if (anArray.length == 0) {
//     return anArray;
//   }

//   console.log("Before pop: " + anArray.length);

//   anArray.splice(anArray.length - 1, 1);

//   console.log("After pop: " + anArray.length);

//   return anArray;
// }

/**
 * https://www.mattzeunert.com/2016/01/28/javascript-deep-equal.html
 */
// unused
// export function jsonEqual(a, b) {
//   return JSON.stringify(a) === JSON.stringify(b);
// }

/**
 * unused
 */
// export function getDateString() {
//   var today = new Date();
//   return today.toLocaleString();
// }

/**
 * unused
 */
// export function isString(aVar) {
//   if (typeof aVar === "string" || aVar instanceof String) return true;

//   return false;
// }

/**
 * unused
 */
// export function isNumber(n) {
//   return !isNaN(parseFloat(n)) && !isNaN(n - 0);
// }

/**
 * unused
 */
// export function capitalizeFLetter(string) {
//   return string[0].toUpperCase() + string.slice(1);
// }

/**
 *
 * @param {*} obj
 * @returns {boolean}
 */
export function isEmpty(obj: Record<string, never>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * unused
 * @param {unknown[][]} aRow
 */
// export function isEmptyRow(aRow) {
//   return aRow.every((row) => row[0] === null);
// }

/**
 * unused
 */
// export function debugStringArray(anArray) {
//   anArray.forEach((i) => console.log(`'${i}'`));
// }

/**
 *
 * @param {string} aTopicText
 */
// export function topicsToArray(aTopicText) {
//   return aTopicText.split("\n");
// }

/**
 * Convert a list containing terms separated by newlines into a string with semicolons representing the newlines
 * This is used to transmit custom topics and pre-defined topics to the OnTopic backend. It is very important that
 * this method returns a valid string, this might be empty but it needs to be valid. That ensures a lot less
 * issues on the server side.
 *
 * Note: make sure that the topics are unique
 * @param {string?} aTextBlock
 */
// unused
// export function textToOnTopicList(aTextBlock) {
//   if (aTextBlock === null) {
//     return "";
//   }

//   if (aTextBlock === "") {
//     return "";
//   }
//   return aTextBlock.replace(/(?:\r\n|\r|\n)/g, ";");
// }

/**
 * How much can this be optimized?
 * unused
 */
// export function listContainsListElement(aListSource, aListTarget) {
//   for (let i = 0; i < aListSource.length; i++) {
//     let testA = aListSource[i];
//     for (let j = 0; j < aListTarget.length; j++) {
//       let testB = aListTarget[j];
//       if (testA.toLowerCase() == testB.toLowerCase()) {
//         return true;
//       }
//     }
//   }

//   return false;
// }
