/**
 *
 */
export function clearAllHighlights() {
  // Select all paragraphs
  const pElements = document.querySelectorAll(".paragraph");
  for (let i = 0; i < pElements.length; i++) {
    pElements[i].classList.remove("paragraph-highlight");
  }

  // Select all sentences
  const sElements = document.querySelectorAll(".sentence");
  for (let i = 0; i < sElements.length; i++) {
    sElements[i].classList.remove("sentence-highlight");
  }

  // Select all topics
  const tElements = document.querySelectorAll(".word");
  for (let i = 0; i < tElements.length; i++) {
    tElements[i].classList.remove("word-highlight");
  }
}

/**
 *
 */
export function highlightParagraph(aParagraphIndex: number) {
  clearAllHighlights();

  const pId = "p" + (aParagraphIndex + 1);

  const pElement = document.getElementById(pId);
  if (pElement != null) {
    console.log("Paragraph element found");
    pElement.classList.add("paragraph-highlight");
  } else {
    console.log("Unable to find paragraph element");
  }
}

/**
 *
 */
export function highlightSentence(aParagraphIndex: number, aSentenceIndex: number) {
  clearAllHighlights();

  const pId = `p${aParagraphIndex + 1}`;

  const pElement = document.getElementById(pId);
  if (!pElement) {
    console.warn("Unable to find paragraph element %s", pId);
    return;
  }
  pElement.classList.add("paragraph-highlight");

  const sId = `p${aParagraphIndex + 1}s${aSentenceIndex + 1}`;

  const sElement = document.getElementById(sId);
  if (sElement) {
    sElement.classList.add("sentence-highlight");
  } else {
    console.log("Unable to find sentence element");
  }
}

/**
 *
 */
export function highlightTopic(aParagraphIndex: number, aSentenceIndex: number, aTopicList: string[]) {
  clearAllHighlights();

  const paragraphElement = document.getElementById("p" + (aParagraphIndex + 1));

  const topicElements = paragraphElement ? paragraphElement.getElementsByClassName("word") :
    document.getElementsByClassName("word");

  // const testElements = [...topicElements].map(el => el.innerHTML);

  if (aParagraphIndex >= 0 && aSentenceIndex >= 0) {
    for (const anElement of topicElements) {
      const topic = (anElement as HTMLElement).dataset.topic?.toLowerCase() ?? '';
      if (aTopicList.some(li => li.toLowerCase() === topic)) {
        anElement.classList.add("word-highlight");
        anElement.parentElement?.classList.add("sentence-highlight");
      }
    }
  } else {
    // This is a really bad and slow way of doing this!
    for (let i = 0; i < topicElements.length; i++) {
      const anElement = topicElements[i] as HTMLElement;
      const topic = anElement.dataset.topic?.toLowerCase();

      for (let j = 0; j < aTopicList.length; j++) {
        if (aSentenceIndex === -1) {
          //if (anElement.innerHTML.toLowerCase ()==aTopicList [j].toLowerCase()) {
          if (topic === aTopicList[j].toLowerCase()) {
            anElement.classList.add("word-highlight");
            anElement.parentElement?.classList.add("sentence-highlight");
          }
        } else {
          if (j === aSentenceIndex) {
            //if (anElement.innerHTML.toLowerCase ()==aTopicList [j].toLowerCase()) {
            if (topic === aTopicList[j].toLowerCase()) {
              anElement.classList.add("word-highlight");
              anElement.parentElement?.classList.add("sentence-highlight");
            }
          }
        }
      }
    }
  }
}
