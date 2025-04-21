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
