/**
 *
 */
export function clearAllHighlights() {
  // Select all paragraphs
  const pElements = document.querySelectorAll('.paragraph');
  for (let i = 0; i < pElements.length; i++) {
    pElements[i].classList.remove('paragraph-highlight');
  }

  // Select all sentences
  const sElements = document.querySelectorAll('.sentence');
  for (let i = 0; i < sElements.length; i++) {
    sElements[i].classList.remove('sentence-highlight');
  }

  // Select all topics
  const tElements = document.querySelectorAll('.word');
  for (let i = 0; i < tElements.length; i++) {
    tElements[i].classList.remove('word-highlight');
  }
}

/**
 *
 */
export function highlightParagraph(aParagraphIndex: number) {
  clearAllHighlights();

  const pId = `p${aParagraphIndex + 1}`;

  const pElement = document.getElementById(pId);
  if (pElement) {
    // console.log('Paragraph element found');
    pElement.classList.add('paragraph-highlight');
    // } else {
    //   console.log('Unable to find paragraph element');
  }
}

/**
 *
 */
export function highlightSentence(
  aParagraphIndex: number,
  aSentenceIndex: number
) {
  clearAllHighlights();

  const pId = `p${aParagraphIndex + 1}`;
  const pElement = document.getElementById(pId);
  if (!pElement) {
    // console.warn('Unable to find paragraph element %s', pId);
    return;
  }
  pElement.classList.add('paragraph-highlight');

  const sId = `p${aParagraphIndex + 1}s${aSentenceIndex + 1}`;
  document.getElementById(sId)?.classList.add('sentence-highlight');
}

/**
 *
 */
export function highlightTopic(
  aParagraphIndex: number,
  aSentenceIndex: number,
  aTopicList: string[]
) {
  clearAllHighlights();

  const paragraphElement = document.getElementById('p' + (aParagraphIndex + 1));

  const topicElements = paragraphElement
    ? paragraphElement.getElementsByClassName('word')
    : document.getElementsByClassName('word');
  const tElements = [...topicElements].map((e) => e as HTMLElement);
  const topics = aTopicList.map((li) => li.toLowerCase());

  if (aParagraphIndex >= 0 && aSentenceIndex >= 0) {
    tElements
      .filter((element) =>
        topics.includes(element.dataset.topic?.toLowerCase() ?? '')
      )
      .forEach((element) => {
        element.classList.add('word-highlight');
        element.parentElement?.classList.add('sentence-highlight');
      });
  } else {
    tElements.forEach((element) => {
      const topic = element.dataset.topic?.toLowerCase() ?? '';
      if (
        (aSentenceIndex === -1 && topics.includes(topic)) ||
        topics.at(aSentenceIndex) === topic
      ) {
        element.classList.add('word-highlight');
        element.parentElement?.classList.add('sentence-highlight');
      }
    });
  }
}
