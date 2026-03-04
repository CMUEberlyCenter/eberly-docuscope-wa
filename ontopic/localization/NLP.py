import re
from typing import Dict, List, Optional, Tuple

import spacy
from spacy.language import Language
from . import en, es


def invert_pronoun_lemmas(lemmas):
    """Given a dictionary of pronoun lemmas, create an inverted mapping from each form to its lemma."""
    inverted = {}
    for key, values in lemmas.items():
        for value in values:
            inverted[value] = key
    return inverted


@Language.component("html_sentence_splitter")
def html_sentence_splitter(doc):
    # Define which tags should trigger sentence splits
    split_tags = re.compile(r"^<img\d+/>$")  # Add your tags here

    for i, token in enumerate(doc):
        # Only split on specific tags
        if split_tags.match(token.text):
            token.is_sent_start = True
            if i + 1 < len(doc):
                doc[i + 1].is_sent_start = True

    return doc


def initialize_nlp_model(model_name: str) -> Language:
    """Initialize NLP model."""
    nlp = spacy.load(model_name)
    nlp.tokenizer.token_match = re.compile(r"<[^>]+>").match  # type: ignore
    nlp.add_pipe("html_sentence_splitter", before="parser")
    return nlp


class Locale:
    def __init__(
        self,
        model_name: str,
        extra_stop_words: List[str],
        pronouns: List[str],
        pronoun_lemmas: Dict[str, List[str]],
        no_space_patterns: List[str],
        be_verbs: List[str],
        ignore_first_words: List[str],
        table_summary: Dict[str, str],
        terminal_punctuation: List[str],
        start_quotes: List[str],
        end_quotes: List[str],
        emphasis_punctuation: List[str],
    ) -> None:
        self.model_name = model_name
        self.pronoun_lemmas = pronoun_lemmas
        self.pronoun_to_lemma = invert_pronoun_lemmas(pronoun_lemmas)
        self.nlp = initialize_nlp_model(model_name)
        self.emphasis_punctuation = set(emphasis_punctuation)
        self.table_summary = table_summary
        self.no_space_patterns = set(no_space_patterns)
        self.be_verbs = set(be_verbs)
        self.ignore_first_words = set(ignore_first_words)
        self.stop_words = (
            set(self.nlp.Defaults.stop_words)
            .union(extra_stop_words)
            .difference(pronouns)
        )
        self.terminal_punctuation = set(terminal_punctuation)
        self.start_quotes = set(start_quotes)
        self.end_quotes = set(end_quotes)

    def getPronounLemma(self, pronoun: str) -> str:
        """Get the lemma for a given pronoun."""
        return self.pronoun_to_lemma.get(pronoun, pronoun)

    def isStopWord(self, word: str) -> bool:
        """Check if a word is a stop word."""
        return word in self.stop_words

    def shouldNotHaveSpace(self, word: str) -> bool:
        """Check if a word is in the no-space patterns list."""
        return word in self.no_space_patterns

    def isBeVerb(self, word: str) -> bool:
        """Check if a word is a form of the verb 'to be'."""
        return word in self.be_verbs

    def shouldIgnoreAsFirstWord(self, word: str) -> bool:
        """Check if a word is in the ignore list for first words."""
        return word in self.ignore_first_words

    def tableSummary(self, row_col: Optional[Tuple[int, int]]) -> str:
        """Get a brief summary of table content"""
        if not row_col:
            return self.table_summary["empty"]
        rows, cols = row_col
        return self.table_summary["template"].format(rows=rows, cols=cols)

    def isTerminalPunctuation(self, text: str) -> bool:
        """Check if a text fragment is in the list of terminal punctuation."""
        return text in self.terminal_punctuation

    def isStartQuote(self, text: str) -> bool:
        """Check if a text fragment is a left quote."""
        return text in self.start_quotes

    def isEndQuote(self, text: str) -> bool:
        """Check if a text fragment is a right quote."""
        return text in self.end_quotes

    def isEmphasisPunctuation(self, text: str) -> bool:
        """Check if a text fragment is a punctuation that indicates emphasis."""
        return text in self.emphasis_punctuation


NLP_MODELS: dict[str, Locale] = {
    "en": Locale(
        model_name=en.MODEL,
        extra_stop_words=en.EXTRA_STOP_WORDS,
        pronouns=en.PRONOUNS,
        pronoun_lemmas=en.PRONOUN_LEMMAS,
        no_space_patterns=en.NO_SPACE_PATTERNS,
        be_verbs=en.BE_VERBS,
        ignore_first_words=en.IGNORE_ADVCL_FIRST_WORDS,
        table_summary=en.TABLE_SUMMARY,
        terminal_punctuation=en.TERMINAL_PUNCTUATION,
        start_quotes=en.START_QUOTES,
        end_quotes=en.END_QUOTES,
        emphasis_punctuation=en.EMPHASIS_PUNCTUATION,
    ),
    "es": Locale(
        model_name=es.MODEL,
        extra_stop_words=es.EXTRA_STOP_WORDS,
        pronouns=es.PRONOUNS,
        pronoun_lemmas={},
        no_space_patterns=[],
        be_verbs=[],
        ignore_first_words=[],
        table_summary=es.TABLE_SUMMARY,
        terminal_punctuation=en.TERMINAL_PUNCTUATION,
        start_quotes=en.START_QUOTES,
        end_quotes=en.END_QUOTES,
        emphasis_punctuation=en.EMPHASIS_PUNCTUATION,
    ),
}
