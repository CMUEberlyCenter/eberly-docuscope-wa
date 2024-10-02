/**
 * Remove paragraph-highlight, sentence-highlight, and word-highlight css classes.
 */
export function clearAllHighlights() {
  document
    .querySelectorAll('.user-text .highlight')
    .forEach((hl) => hl.classList.remove('highlight'));
  // Select all paragraphs
  document
    .querySelectorAll('.user-text .paragraph.paragraph-highlight')
    .forEach((para) => para.classList.remove('paragraph-highlight'));

  // Select all sentences
  document
    .querySelectorAll('.user-text .sentence.sentence-highlight')
    .forEach((sentence) => sentence.classList.remove('sentence-highlight'));

  // Select all topics
  document
    .querySelectorAll('.user-text .word.word-highlight')
    .forEach((word) => word.classList.remove('word-highlight'));
}

/**
 * Add highlight to the specified paragraph.
 * @param aParagraphIndex 0 based index
 */
export function highlightParagraph(aParagraphIndex: number) {
  clearAllHighlights();
  if (aParagraphIndex < 0) return;
  const element = document.querySelector(
    `.paragraph[data-ds-paragraph="${aParagraphIndex + 1}"]`
  );
  // const pId = `p${aParagraphIndex + 1}`;
  // const element = document.getElementById(pId);
  element?.classList.add('paragraph-highlight');
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const element = document.querySelector(
    `.sentence[data-ds-paragraph="${aParagraphIndex + 1}"][data-ds-sentence="${aSentenceIndex + 1}"]`
  );
  element?.classList.add('highlight');
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
