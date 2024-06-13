/**
 * Remove paragraph-highlight, sentence-highlight, and word-highlight css classes.
 */
export function clearAllHighlights() {
  // Select all paragraphs
  document
    .querySelectorAll('.paragraph')
    .forEach((para) => para.classList.remove('paragraph-highlight'));

  // Select all sentences
  document
    .querySelectorAll('.sentence')
    .forEach((sentence) => sentence.classList.remove('sentence-highlight'));

  // Select all topics
  document
    .querySelectorAll('.word')
    .forEach((word) => word.classList.remove('word-highlight'));
}

/**
 * Add highlight to the specified paragraph.
 * @param aParagraphIndex 0 based index
 */
export function highlightParagraph(aParagraphIndex: number) {
  clearAllHighlights();

  const pId = `p${aParagraphIndex + 1}`;
  document.getElementById(pId)?.classList.add('paragraph-highlight');
}

/**
 * Add highlight to the specified sentence in a given paragraph.
 * @param aParagraphIndex 0 based index.
 * @param aSentenceIndex 0 based index.
 */
export function highlightSentence(
  aParagraphIndex: number,
  aSentenceIndex: number
) {
  clearAllHighlights();

  const pId = `p${aParagraphIndex + 1}`;
  document.getElementById(pId)?.classList.add('paragraph-highlight');
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
