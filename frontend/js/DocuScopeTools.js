/**
 *
 */
// export function fixIncoming(incomingData) {
//   console.log("fixIncoming");

//   if (incomingData.rules) {
//     if (incomingData.rules.rules) {
//       console.log("Patching ...");
//       let rules = incomingData.rules.rules;
//       incomingData.rules = rules;
//     }
//   }

//   return incomingData;
// }

/**
 *
 */
export function onTopic2DSWAHTML(anHTMLDataset) {
  /*
  let transformedHTML=anHTMLDataset.replaceAll ("<sent","<span");
  transformedHTML=transformedHTML.replaceAll ("</sent","</span");
  return (transformedHTML);
  */

  return anHTMLDataset.replaceAll("_", " ");
}


/**
 *
 */
export function coherenceToClusterCounts(aCoherenceData, _aCoherenceDataLocal) {
  const counts = [];

  if (!aCoherenceData.data) {
    return counts;
  }

  for (let i = 0; i < aCoherenceData.data.length; i++) {
    let testLemma = aCoherenceData.data[i];
    if (testLemma.is_topic_cluster) {
      if (testLemma.sent_count) {
        //console.log ("Found sentence count: " + testLemma.sent_count);

        const lemmaFound = {
          count: testLemma.sent_count,
          lemma: "",
        };

        // We need to make sure we take the plurals as well

        if (testLemma.topic) {
          if (testLemma.topic.length == 3) {
            lemmaFound.lemma = testLemma.topic[2];
          } else {
            if (testLemma.topic.length == 2) {
              lemmaFound.lemma = testLemma.topic[1];
            }
          }
        }

        counts.push(lemmaFound);
      }
    }
  }

  return counts;
}

/**
 * The toLowerCase() method converts a string to lowercase letters.
 * The toLowerCase() method does not change the original string.
 * @param {string} aLemmaA
 * @param {string} aLemmaB
 */
export function compareLemmas(aLemmaA, aLemmaB) {
  return aLemmaA.toLowerCase() === aLemmaB.toLowerCase();
}

/**
 *
 */

/**
 *
 */
export function cleanAndRepairHTMLSentenceData(aData) {

  for (const aParagraph of aData) {
    let clean = false;
    while (!clean) {
      clean = true;

      for (let j = 0; j < aParagraph.length; j++) {
        if (aParagraph[j] === "") {
          aParagraph.splice(j, 1);
          clean = false;
          break;
        }
      }
    }
  }

  return aData;
}
