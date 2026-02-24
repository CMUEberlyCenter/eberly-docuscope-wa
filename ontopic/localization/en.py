MODEL = "en_core_web_sm"

EXTRA_STOP_WORDS = [
    "therefore",
    "however",
    "thus",
    "hence",
    "'s",
    "mr.",
    "mrs.",
    "ms.",
    "dr.",
    "prof.",
]

PRONOUNS = [
    "it",
    "i",
    "we",
    "you",
    "he",
    "she",
    "they",
    "its",
    "my",
    "our",
    "your",
    "his",
    "her",
    "their",
    "me",
    "us",
    "him",
    "them",
    "mine",
    "ours",
    "yours",
    "hers",
    "theirs",
]

PRONOUN_LEMMAS = {
    "he": ["he", "his", "him", "himself"],
    "she": ["she", "her", "hers", "herself"],
    "I": ["i", "my", "mine", "myself"],
    "you": ["you", "your", "yours", "yourself", "yourselves"],
    "we": ["we", "our", "us", "ours", "ourselves"],
    "they": ["they", "their", "them", "theirs", "themselves"],
    "it": ["it", "its", "itself"],
}

BE_VERBS = [
    "be",
    "been",
    "am",
    "is",
    "are",
    "was",
    "were",
    "'m",
    "'re",
    "'s",
    "\u2019s",
    "\u2019m",
    "\u2019re",
]

IGNORE_ADVCL_FIRST_WORDS = [
    "after",
    "before",
    "until",
    "soon",
    "once",
    "now",
    "during",
    "while",
    "when",
    "whenever",
    "if",
    "whether",
    "provided",
    "in",
    "unless",
    "even",
    "because",
    "as",
    "since",
    "so",
    "isasmuch",
    "where",
    "although",
    "though",
    "thanks",
    "based",
    "to",
    "based",
]

NO_SPACE_PATTERNS = [
    "\u2019ve",
    "n\u2019t",
    ".\u201d",
    ".\u2019",
    "\u2019s",
    "\u2019t",
    "\u2019m",
    "\u2019ll",
    "\u2019re",
    "\u2019d",
    "'ve",
    "n't",
    '."',
    ".'",
    "'s",
    "'t",
    "'m",
    "'ll",
    "'re",
    "'d",
    "%",
]  # note: use a single quote for apostorophes

TABLE_SUMMARY= {
    "empty": "Empty table",
    "template": "{rows} rows, {cols} columns",
}

TERMINAL_PUNCTUATION = [".", ",", ";", ":", "?", "!"]

START_QUOTES = ["\u201c", "\u2018", "(", "[", "$", '"', "'", "\u00bf", "<"]
END_QUOTES = ["\u201d", "\u2019", ")", "]", ">"]

em_dash = "\u2014"
en_dash = "\u2013"
horizontal_bar = "\u2015"
dashes = [em_dash, en_dash, horizontal_bar]
ellipsis = "\u2026"
EMPHASIS_PUNCTUATION = [*dashes, ellipsis]