#!/usr/bin/env python
# -*- coding: utf-8 -*-

""" """

__author__ = "Suguru Ishizaki"
__copyright__ = "2017-25 Suguru Ishizaki, Carnegie Mellon University"

import logging
import json
import re
import string
import os
import pprint  # pretty prnting for debugging
import copy
from typing import Any, List, Dict, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import Counter, namedtuple
import regex
import unidecode

from bs4 import Tag, BeautifulSoup as bs
import mammoth
import spacy  # SpaCy NLP library
from spacy.language import Language
from spacy.tokenizer import Tokenizer

from PIL import Image
import io
import base64

no_space_patterns = [
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
]
# note: use a single quote for apostorophes

left_quotes = ["\u201c", "\u2018", "(", "[", "$", '"', "'", "\u00bf", "<"]
right_quotes = ["\u201d", "\u2019", ")", "]", ">"]

dashes = ["\u2014", "\u2013", "\u2015"]  # em dash, en dash, horizontal bar
hyphen_slash = [
    "-",
    "/",
]  # hyphen, slash,

ellipsis = "\u2026"

end_puncts = [".", ",", ";", ":", "?", "!"]

be_verbs = [
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

##################################################

NLP_MODEL_DEFAULT = 0
NLP_MODEL_LARGE = 1

TOPIC_FILTER_LEFT = 0  # LEFT
TOPIC_FILTER_LEFT_RIGHT = 1  # LEFT + RIGHT
TOPIC_FILTER_ALL = 2  # ALL

TOPIC_SORT_APPEARANCE = 0
TOPIC_SORT_LEFT_COUNT = 1

# Default font info used to create HTML strings.
default_font_info = {
    "Title": 24,
    "Normal": 14,
    "List Bullet": 14,
    "List Bullet 2": 14,
    "List Bullet 3": 14,
    "List Number": 14,
    "List Number 2": 14,
    "List Number 3": 14,
    "List Paragraph": 14,
    "Heading 1": 22,
    "Heading 2": 20,
    "Heading 3": 18,
    "Heading 4": 16,
}

pp = pprint.PrettyPrinter(
    indent=4
)  # create a pretty printing object used for debugging.

# TEXT_COLOR      = RGBColor( 64,  64,  64)
# TEXT_VERB_COLOR = RGBColor(  0, 188, 242)
# TEXT_NP_VCOLOR  = RGBColor(125,   0, 125)

# Constants for sentence['text_w_info']. Each word is represented using a tuple with
# the following elements.
# TODO: Create a enumeration class to represent this. The indexes have grown too long.
#
POS = 0  # Part of Speech
WORD = 1  # Original Word
LEMMA = 2  # Lemmatized word
ISLEFT = 3  # True if the word is on the left side of the main verb
SUBJ = 3  # True if the word is on the left side of the main verb (SUBJ = ISLEFT) same thing!!
DEP = 4  # Dependency Type (e.g., 'pobj', 'nsubj', etc.)
STEM = 5  # Stem of the word
LINKS = 6  # If it is a verb, it is the total # of links from the verb. Otherwise, None.
QUOTE = 7  # QUOTED or not
WORD_POS = 8  # Indexes between 8 and 13 have been changed on July 17.
DS_DATA = 9  # DocuScope Data (i.e., models.DSWord)
PARA_POS = 10  # Paragraph Position
SENT_POS = 11  # Sentence Position
NEW = 12  # New noun phrase
GIVEN = 13  # Given noun phrase
IS_SKIP = 14  # If true, it should be skipped
IS_TOPIC = 15  # True if it is a topic

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

SUBJECTS = ["nsubj", "nsubjpass", "csubj", "csubjpass", "agent", "expl"]

nlp = None
LOAD_TRAINED_MODEL = (
    False  # If True, will check for the existence of models in the filesystem.
)


##########
#
# Helper Functions
#
##########

stop_words = []

# English
en_extra_stop_words = [
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
en_pronouns = [
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
# Spanish
es_extra_stop_words = []  # TBD
es_pronouns = []  # TBD


@Language.component("tag_sentencizer")
def tag_sentencizer(doc):
    for token in doc:
        # ONLY break sentences for image tags
        if re.match(r"<img\d+/?>", token.text):
            # This token starts a sentence
            if token.i > 0:
                doc[token.i].is_sent_start = True
            # Next token also starts a sentence
            if token.i < len(doc) - 1:
                doc[token.i + 1].is_sent_start = True

    return doc


def setLanguageModel(lang, model=NLP_MODEL_DEFAULT):
    """Set the language model used by SpaCy."""
    global nlp
    global stop_words

    try:
        pronouns = []
        extra_stop_words = []
        if lang == "en":
            default_model = "data/default_model"  # resource_path("data/default_model")
            large_model = "data/large_model"  # resource_path("data/large_model")

            if (
                LOAD_TRAINED_MODEL
                and model == NLP_MODEL_DEFAULT
                and os.path.exists(default_model)
            ):
                logging.info("Loading Spacy default model ...")
                nlp = spacy.load(default_model)
            elif LOAD_TRAINED_MODEL and os.path.exists(large_model):
                logging.info("Loading Spacy large model ...")
                nlp = spacy.load(large_model)
            else:
                nlp = spacy.load("en_core_web_sm")

            pronouns = en_pronouns
            extra_stop_words = en_extra_stop_words

        elif lang == "es":
            nlp = spacy.load("es_core_web_sm")

            pronouns = es_pronouns
            extra_stop_words = es_extra_stop_words

        if nlp is None:
            return

        # Pattern to match any HTML tag (so they all stay intact during tokenization)
        # This prevents < and > from being split
        html_tag_pattern = r"</?[a-zA-Z][^>]*/?>"

        nlp.tokenizer = Tokenizer(
            nlp.vocab, token_match=re.compile(html_tag_pattern).match
        )

        # Add the component to the pipeline, before the 'parser'
        nlp.add_pipe("tag_sentencizer", before="parser")

        # initialize the list of stop_words in the current language
        stop_words = list(
            nlp.Defaults.stop_words
        )  # get a list of language specific stop words
        stop_words += extra_stop_words
        for p in pronouns:  # remove pronouns from the stop_word list.
            if p in stop_words:
                stop_words.remove(p)

    except Exception as e:
        logging.error(e)
    else:
        logging.info("Spacy language model loaded successfully")
        logging.info(spacy.info())  # type: ignore


def isModelLoaded():
    """Check if the SpaCy model is loaded."""
    return nlp is not None


Position = namedtuple("Position", ["start", "end"])


def removeQuotedSlashes(s):
    """Remove slashes that are in strings with matching quotes."""
    if s.find("“") > 0 and s.find("”") > 0:
        return regex.sub(r"\s\/\s", " ", s)
    if s.count('"') == 2:
        return regex.sub(r"\s\/\s", " ", s)
    return s


def is_skip(elem, left_count, topic_filter):

    # if theme_only == True:
    if topic_filter == TOPIC_FILTER_LEFT:

        # if the left only mode is on
        if not elem[IS_TOPIC]:
            # skip, if it is not a topic word
            return True  # skip

        if left_count < 1 and not elem[ISLEFT]:
            # skip if it's a right-side word and left_count < 1 (==0)
            return True  # skip

        return False  # otherwise, it's not a skip word.
    return False


def contains_html_tags(text):
    # Regular expression to match HTML tags
    pattern = r"<[^>]+>"

    # Search for the pattern in the text
    match = re.search(pattern, text)

    # Return True if a match is found, False otherwise
    return match is not None


def get_text_preserve_inline(element, inline_tags=None):
    if inline_tags is None:
        inline_tags = [
            "strong",
            "em",
            "b",
            "i",
            "u",
            "span",
            "a",
            "code",
            "mark",
            "small",
            "sub",
            "sup",
        ]

    # Get the inner HTML
    html = element.decode_contents()

    # Remove block-level tags but keep their content
    block_tags = [
        "div",
        "p",
        "h[1-6]",
        "section",
        "article",
        "header",
        "footer",
        "nav",
        "aside",
    ]
    for tag in block_tags:
        html = re.sub(f"</?{tag}[^>]*>", " ", html)

    # Clean up extra whitespace
    html = re.sub(r"\s+", " ", html).strip()

    return html


def extract_and_replace_images(html_string):
    """
    Replaces <img> tags with numbered IDs and extracts them into a dictionary.

    Args:
        html_string: HTML string containing <p> tag with images

    Returns:
        tuple: (modified_string, dict_of_image_tags)
    """
    images = {}
    counter = [0]  # Using list to make it mutable in nested function

    def replace_img(match):
        counter[0] += 1
        img_tag = match.group(0)
        replacement = f" <img{counter[0]:02d}/> "
        replacement_key = replacement.strip()
        images[replacement_key] = img_tag
        return replacement

    # Find and replace all <img> tags
    modified_string = re.sub(r"<img[^>]*>", replace_img, html_string)

    return modified_string, images


def resized_image_handler(image):
    """
    mammoth.convert_to_html() will use this function to determine the display
    dimensions of the image. Without this function, high-resolution
    images will be displayed using their original pixel dimensions since
    the img tag will not have width and height attributes.
    """    
    with image.open() as image_bytes:
        # Open the image to get its actual dimensions
        img_data = image_bytes.read()
        img = PILImage.open(BytesIO(img_data))
        
        # Get original dimensions
        original_width, original_height = img.size
        
        # Set max dimensions in case we can't find them.
        max_width = 800
        max_height = 600
        
        # Resize while maintaining aspect ratio
        img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)
        
        # Re-encode
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
    
    return {
        "src": f"data:image/png;base64,{encoded}"
    }
    
##################
#
##################


class ContentType(Enum):
    """
    A list of content types used by DocumentElement.
    """

    PARAGRAPH = "paragraph"
    LIST = "list"
    LISTITEM = "list_item"
    HEADING = "heading"
    TABLE = "table"
    IMAGE = "image"
    OTHER = "other"


@dataclass
class DocumentElement:
    """
    This class represents an HTML block element. It is used by DSDocument.
    """

    content_type: ContentType
    text: str = ""
    html: str = ""
    position: int = 0
    para_id: int = -1
    styles: Dict = field(default_factory=dict)
    metadata: Dict = field(default_factory=dict)
    id: str = ""
    data: Dict = field(default_factory=dict)

    def setData(self, data: Dict) -> None:
        """
        'data': a dictionary that contains the NLP analyis.
        """
        self.data = data


##########
#
# DSDocument
#
##########


class DSDocument:
    """
    This class is used to holds the textual data for myprose.
    """

    ##########################################
    # Class variables/methods
    ##########################################

    noun_subject_options = ["nsubj", "nsubjpass", "csubj", "csubjpass", "expl", "agent"]

    multiword_topics = []
    deleted_multiword_topics = []

    user_defined_synonyms = {}
    user_defined_synonym_names = []
    user_defined_topics = []

    @classmethod
    def setNounSubjectOptions(cls, options):
        DSDocument.noun_subject_options = options

    @classmethod
    def setUserDefinedSynonyms(cls, synsets):
        # convert a list of synonyms into a dictionary for faster look up
        if synsets == [] or synsets is None:
            DSDocument.user_defined_synonyms = None
            return

        DSDocument.user_defined_synonyms = {}
        DSDocument.user_defined_synonym_names = []
        undefined_count = 0

        for synset in synsets:
            lemma = synset.getLemma_()
            synonyms = synset.getSynonyms()

            for synonym in synonyms:
                s = synonym.replace(" ", "_")

                DSDocument.user_defined_synonyms[s] = lemma
                DSDocument.user_defined_synonyms[s.lower()] = lemma
                DSDocument.user_defined_synonyms[s.capitalize()] = lemma
                DSDocument.user_defined_synonyms[s.title()] = lemma

            if synonyms == []:
                key = "undefined_{}"
                DSDocument.user_defined_synonyms[key] = lemma  # undefined synonym
                undefined_count += 1

            DSDocument.user_defined_synonym_names.append(lemma)

    @classmethod
    def isUserDefinedSynonym(cls, lemma):
        return (
            DSDocument.user_defined_synonyms is not None
            and lemma in DSDocument.user_defined_synonym_names
        )

    @classmethod
    def isUserDefinedSynonymDefined(cls, lemma):
        if (
            DSDocument.user_defined_synonyms is not None
            and lemma in DSDocument.user_defined_synonym_names
        ):
            for synonym, name in DSDocument.user_defined_synonyms.items():
                if name == lemma:
                    if synonym.startswith("undefined_"):
                        return False
                    return True
            return False
        return False

    @classmethod
    def setMultiwordTopics(cls, topics):
        if topics is None:
            DSDocument.multiword_topics = []
            DSDocument.deleted_multiword_topics = []
        else:
            topics.sort(reverse=True, key=lambda x: len(x.split()))
            DSDocument.deleted_multiword_topics = list(
                set(DSDocument.multiword_topics) - set(topics)
            )
            DSDocument.multiword_topics = topics

    @classmethod
    def setUserDefinedTopics(cls, topics):
        DSDocument.user_defined_topics = [t.lower().replace(" ", "_") for t in topics]

    @classmethod
    def isUserDefinedTopic(cls, lemma):
        return lemma in DSDocument.user_defined_topics

    @classmethod
    def addUserDefinedTopic(cls, topic):
        if topic is not None and topic != "":
            lc_topic = topic.lower()
            if lc_topic not in DSDocument.user_defined_topics:
                DSDocument.user_defined_topics.append(lc_topic)

    @classmethod
    def deleteUserDefinedTopic(cls, topic_to_delete):
        if topic_to_delete in DSDocument.user_defined_topics:
            DSDocument.user_defined_topics.remove(topic_to_delete)

    @classmethod
    def clearUserDefinedTopics(cls):
        DSDocument.user_defined_topics = []

    @classmethod
    def getUserDefinedTopics(cls):
        return DSDocument.user_defined_topics

    @classmethod
    def getUserDefinedSynonyms(cls):
        return DSDocument.user_defined_synonym_names

    @classmethod
    def clearUserDefinedSynonyms(cls):
        DSDocument.user_defined_synonym_names = []

    ##########################################
    # Instance methods
    ##########################################

    def __init__(self):

        self.controller = None
        self.dictionary = None

        # Data & Stats
        # self.stats    = None         # Stats (dictionary)
        self.current_section = 0

        self.filename = None
        self.header_labels = []

        # Visualizer options
        self.noun = True
        self.verb = False
        self.adj = False
        self.adv = False
        self.prp = False

        self.lang = "en"

        self.max_paras = 500
        self.skip_paras = 0

        self.is_collapsed = True

        self.total_words = 0

        self.para_accum_mode = True
        self.sent_accum_mode = True

        self.selectedTopic = (None, None)
        self.selectedTopicCluster = []
        self.keyTopics = []

        self.keyParaTopics = []
        self.keySentTopics = []

        self.selectedSent = -1
        self.selectedWord = None
        self.showKeyTopics = False
        self.showKeySentTopics = False

        self.selected_sent_info = None

        self.bQuote = False  # temp variable

        self.progress_callback = None

        self.img_count = 0

        self.global_topical_prog_data = None

        # variables used by the methods for the online version of write & audit
        self.local_topics_dict = None
        self.global_header = []
        self.local_header = []
        self.global_topics = []
        self.local_topics = []
        # self.topic_location_dict = None

        self.lexical_overlaps_analyzed = False

        self.elements = []
        self.soup = None

        self.sections = []
        self.num_quoted_words = 0
        self.word_count = 0
        self.para_count = 0

    ###############
    #
    # Internal methods for processintg an element
    #
    ###############

    def _process_document(self) -> List[DocumentElement]:
        """Process document and extract all elements in order"""

        def element_not_in_table_cell(tag):
            # Only apply the table cell check to 'p' tags
            if tag.name == "p":
                # Check if any parent is a <td> or <th> tag
                for parent in tag.parents:
                    if parent.name in ["td", "th"]:
                        return False
            return tag.name in [
                "p",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "table",
                "img",
                "ul",
                "ol",
                "li",
            ]

        self.elements = []
        position = 1  # every element has a unique position
        self.para_count = 0  # paragraph count/ID (exclude non paragraphs)
        self.word_count = 0

        all_elements = (
            self.soup.find_all(element_not_in_table_cell) if self.soup else []
        )

        for html_element in all_elements:
            doc_element = self._process_element(html_element, position)
            if doc_element:
                self.elements.append(doc_element)
                position += 1

        return self.elements

    def _process_element(
        self, html_element, position: int
    ) -> Union[DocumentElement, None]:
        """Process individual HTML element"""
        tag_name = html_element.name.lower()
        styles = {}
        data = {}

        if nlp is None:
            logging.warning("SpaCy model is not loaded.")
            return None

        if tag_name in ["p"]:
            self.para_count += 1  # increment the paragraph ID.

            text = get_text_preserve_inline(html_element)

            text, images = extract_and_replace_images(text)

            data["sentences"] = []
            parsed_para = nlp(text)
            slist = list(parsed_para.sents)  # list of sentences

            for s in slist:
                if s.text.startswith("<img"):
                    text = images[s.text]
                    is_image = True
                    s = text
                else:
                    text = s.text.strip()
                    is_image = False

                sent_dict = {}
                sent_dict["text"] = text
                sent_dict["sent"] = s  # spacy's NLP object if it's not an image.
                sent_dict["is_image"] = is_image
                data["sentences"].append(sent_dict)

            html_element["data-ds-paragraph"] = f"{self.para_count}"
            html_element["id"] = f"p{self.para_count}"
            html_element["class"] = "paragraph"

            return DocumentElement(
                content_type=ContentType.PARAGRAPH,
                text=text,
                data=data,
                html=str(html_element),
                position=position,
                para_id=self.para_count,
                styles=styles,
                metadata={"tag": tag_name, "length": len(text)},
            )

        if tag_name in ["li"]:
            self.para_count += 1  # increment the paragraph ID.

            text = get_text_preserve_inline(html_element)

            data["sentences"] = []
            parsed_para = nlp(text)
            slist = list(parsed_para.sents)  # list of sentences

            for s in slist:
                sent_dict = {}
                sent_dict["text"] = s.text.strip()
                sent_dict["sent"] = s
                data["sentences"].append(sent_dict)

            html_element["data-ds-paragraph"] = f"{self.para_count}"
            html_element["id"] = f"p{self.para_count}"
            html_element["class"] = tag_name

            return DocumentElement(
                content_type=ContentType.LISTITEM,
                text=text,
                data=data,
                html=str(html_element),
                position=position,
                para_id=self.para_count,
                styles=styles,
                metadata={"tag": tag_name, "length": len(text)},
            )

        if tag_name in ["ol", "ul"]:
            self.para_count += 1  # increment the paragraph ID.

            text = html_element.get_text()

            data["sentences"] = []
            parsed_para = nlp(text)
            slist = list(parsed_para.sents)

            for s in slist:
                sent_dict = {}
                sent_dict["text"] = s.text.strip()
                sent_dict["sent"] = s
                data["sentences"].append(sent_dict)

            html_element["data-ds-paragraph"] = f"{self.para_count}"
            html_element["id"] = f"p{self.para_count}"
            html_element["class"] = tag_name

            return DocumentElement(
                content_type=ContentType.LIST,
                text=text,
                data=data,
                html=str(html_element),
                position=position,
                para_id=self.para_count,
                styles=styles,
                metadata={"tag": tag_name, "length": len(text)},
            )

        if tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            self.para_count += 1  # increment the paragraph ID.

            text = get_text_preserve_inline(html_element)

            data["sentences"] = []
            sent_dict = {}
            sent_dict["text"] = text.strip()
            sent_dict["sent"] = text
            data["sentences"].append(sent_dict)

            # html_element['id'] = f"h{position}"
            html_element["id"] = f"p{self.para_count}"
            html_element["class"] = tag_name

            return DocumentElement(
                content_type=ContentType.HEADING,
                text=text,
                data=data,
                html=str(html_element),
                position=position,
                para_id=self.para_count,
                styles=styles,
                metadata={"tag": tag_name, "level": int(tag_name[1])},
            )

        if tag_name == "table":
            data = {"sentences": []}

            html_element["id"] = f"table{position}"
            html_element["class"] = tag_name

            return DocumentElement(
                content_type=ContentType.TABLE,
                text=f"[TABLE: {self._get_table_summary(html_element)}]",
                data=data,
                html=str(html_element),
                position=position,
                styles=styles,
                metadata={"tag": "table", "rows": len(html_element.find_all("tr"))},
            )

        if tag_name in ["img"]:
            alt_text = html_element.get("alt", "")
            src = html_element.get("src", "")
            caption = self._get_image_caption(html_element)

            display_text = "[IMAGE"
            if alt_text:
                display_text += f": {alt_text}"
            if caption:
                display_text += f" - {caption}"
            display_text += "]"

            data = {"sentences": []}

            html_element["id"] = f"img{position}"
            html_element["class"] = tag_name

            return DocumentElement(
                content_type=ContentType.IMAGE,
                text=display_text,
                data=data,
                html=str(html_element),
                position=position,
                styles=styles,
                metadata={
                    "tag": tag_name,
                    "src": src,
                    "alt": alt_text,
                    "caption": caption,
                },
            )

        return None

    def _get_table_summary(self, table_element) -> str:
        """Get a brief summary of table content"""
        rows = table_element.find_all("tr")
        if not rows:
            return "Empty table"

        cols = len(rows[0].find_all(["td", "th"])) if rows else 0
        return f"{len(rows)} rows, {cols} columns"

    def _get_image_caption(self, img_element) -> str:
        """Extract image caption if available"""
        # Look for caption in parent figure
        if img_element.name == "figure":
            figcaption = img_element.find("figcaption")
            if figcaption:
                return figcaption.get_text()

        # Look for caption in surrounding elements
        parent = img_element.parent
        if parent:
            caption_elem = parent.find("figcaption")
            if caption_elem:
                return caption_elem.get_text()

        return ""

    ########################################
    #
    # Clear/Reset Methods
    #
    ########################################

    def clearData(self):
        # self.sections = None
        self.elements = []

    def clearGlobalTopicalProgDataCache(self):
        self.global_topical_prog_data = None  # clear the cache

    ########################################
    #
    # Set Methods
    #
    ########################################

    ###############
    #
    # Set Methods
    #
    ###############

    def setHtml(self, html_str):
        self.soup = bs(html_str, "html.parser")
        self._process_document()  # this creates a new self.elements list

    def setLanguage(self, lang):
        self.lang = lang

    def setController(self, c):
        self.controller = c

    def setDictionary(self, d):
        self.dictionary = d

    def setProgressCallback(self, cb_func):
        self.progress_callback = cb_func

    def setFilters(self, vis_mode, max_paras, skip_paras):
        """
        Update the visualizer options.
        """
        self.verb = False
        self.noun = True
        self.adj = False
        self.adv = False

        self.para_accum_mode = True
        self.sent_accum_mode = True

        self.max_paras = max_paras
        self.skip_paras = skip_paras

    def setHeaderLabels(self, val):
        self.header_labels = val

    def getHeaderLabels(self, val):
        return self.header_labels

    def setPronounsVisible(self, val):
        self.prp = val

    # def setUserTopics(self, user_topics):
    #     doc = nlp(user_topics) if nlp is not None else None
    #     self.userTopics = [t.lemma_ for t in doc] if doc else []

    def setKeySentTopics(self, keytopics):
        self.keySentTopics = keytopics

    def setKeyParaTopics(self, keytopics):
        self.keyParaTopics = keytopics
        self.keyTopics = keytopics

    def setSelectedTopic(self, topic):
        if topic is not None:
            self.selectedTopic = topic
        else:
            self.selectedTopic = (None, None)

    def setSelectedTopicCluster(self, topic_cluster):
        if topic_cluster is not None:
            self.selectedTopicCluster = topic_cluster
        else:
            self.selectedTopicCluster = []

    # def setTextWrap(self, val):
    #     self.text_wrap_mode = val

    def setSelectedSentence(self, sent_id):
        if sent_id < 0:
            self.selectedSent = None
        else:
            self.selectedSent = sent_id

    def setSelectedWord(self, selected_word):
        self.selectedWord = selected_word  # word is a tuple = elem

    def setShowKeyTopics(self, val):
        self.showKeyTopics = val

    def setShowKeySentTopics(self, val):
        self.showKeySentTopics = val

    def setCollapsed(self, val):
        self.is_collapsed = val

    ########################################
    #
    # Query Mthods
    #
    ########################################

    # def userTopicsDefined(self):
    #     if len(self.userTopics) > 0:
    #         return True
    #     else:
    #         return False

    # def isUserTopic(self, topic):
    #     if len(topic) == 0:
    #         return True
    #     if topic in self.userTopics:
    #         return True
    #     else:
    #         return False

    # def isSelectedTopic(self, lemma):
    #     for w in self.selectedTopic[1:]:
    #         if w == lemma:
    #             return True
    #     return False

    # def isPronounsVisible(self):
    #     return self.prp

    def isPOSVisible(self, pos):
        """
        Given a POS tag, returns a WordNet POS tag (one of 4 tags), or None.
        """
        if pos.startswith("NOUN") or pos.startswith("PROPN"):
            # res = self.noun
            return self.noun
        if pos.startswith("VERB"):
            # res = self.verb
            return self.verb
        if pos.startswith("ADJ"):
            # res = self.adj
            return self.adj
        if pos.startswith("ADV"):
            # res = self.adv
            return self.adv
        if pos.startswith("PRP"):
            # res = self.prp      # pronoun, personal
            return self.prp
        if pos.startswith("PRON"):
            return True

        return False

    ########################################
    #
    # Get Methods
    #
    ########################################

    # def getWordCount(self):
    # return self.word_count

    # def getParagraphs(self):
    #     return self.data["paragraphs"]

    def getRealParaCount(self) -> int:
        return self.getParaCount()

    def getParaCount(self) -> int:
        return len(self.elements)

    def getSentCount(self) -> int:
        sent_count = 0
        for elem in self.elements:
            sent_count += len(elem.data["sentences"])
        return sent_count

    def getNumParagraphs(self) -> int:
        return len(self.elements)

    # def getKeyTopics(self):
    # return self.keyTopics

    # def getKeyTopicsFirstSent(self):
    #     return self.keyTopicsFirstSent

    def getKeyParaTopics(self):
        return self.keyParaTopics

    # def setHighlightQuotes(self, val):
    #     self.show_quotes = val

    # def getNumQuotedWords(self):
    #     return self.num_quoted_words

    def getTotalWords(self):
        return self.total_words

    def getFilename(self):
        if self.filename is not None:
            return self.filename
        return "Undefined"

    def getSelectedSentInfo(self):
        return self.selected_sent_info

    # def findSentences(self, ruleset):
    #     """
    #     Returns a python dictionary, where keys are rules and the values are sentences.
    #     """

    #     res = []
    #     pcount = 1
    #     # for para in data['paragraphs']:
    #     for elem in self.elements:

    #         scount = 1
    #         for sent in elem.getSentences():
    #             b_topic = False
    #             b_experience = False

    #             # get the list of lemmas (i.e., topics)
    #             lemmas = sent["lemmas"]

    #             # get the list of clusters (i.e., experiences)
    #             clusters = []
    #             for w in sent["text_w_info"]:
    #                 dsw = w[DS_DATA]  # docuscope word
    #                 if dsw is not None:
    #                     lat = dsw.getLAT()
    #                     dim, clust = self.dictionary.getDimensionAndCluster(lat) \
    #                         if self.dictionary else (None, None)
    #                     if clust is not None and clust not in clusters:
    #                         clusters.append(clust)
    #                 else:
    #                     logging.warning("ERROR: dsw is none.")
    #                     continue
    #             res = dict
    #             for rule in ruleset.getRules():
    #                 b_match = rule.isMatching(lemmas, clusters)
    #                 if res.get(rule, False) and sent not in res[rule]:
    #                     res[rule].append(sent)
    #             scount += 1
    #         pcount += 1
    #     return res

    ########################################
    #
    # Analysis Methods
    #
    ########################################

    def processSent(self, sent, start=0):
        """
        Given a sentence 'sent' in a string format, return a list [] of analyzed words.
        Each entry in the list is a tuple (POS, Word, Lemma, bLeft_of_the_Main_Verb).
        e.g., ('NOUN', 'dogs', 'dog', False)
        """

        word_pos = start

        def processHeading(heading):
            nonlocal word_pos
            res = []
            if nlp is None:
                return res, ()
            spacy_doc = nlp(heading)

            # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT,
            #     4.DEP, 5.STEM, 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA
            # Note: the nouns in headings/titels are always considered 'pre-verb' ISLEFT + TRUE
            is_left = False
            for token in spacy_doc:
                # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT,
                #     4.DEP, 5.STEM, 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA
                # Note: the nouns are always considered 'pre-verb' ISLEFT + TRUE
                is_left = False
                if token.pos_ in ("NOUN", "PROPN", "PRON"):
                    is_left = True

                if token.text in end_puncts:
                    pos = "PUNCT"
                elif token.pos_ == "PROPN":  # Proper Nouns
                    pos = "NOUN"
                elif token.tag_ in ("PRP", "PRP$"):  # Pronouns / Pronoun Possessive
                    pos = "PRP"
                elif token.is_punct:  # Punctuations
                    pos = "PUNCT"
                elif token.pos_ == "PRON" and token.tag_ == "NN":
                    pos = "NOUN"
                else:  # Everything else
                    pos = token.pos_

                res.append(
                    (
                        pos,
                        token.text,
                        token.lemma_.lower(),
                        is_left,
                        token.dep_,
                        "",
                        None,
                        False,
                        word_pos,
                        None,
                    )
                )
                word_pos += 1

            temp = []
            for n in spacy_doc.noun_chunks:
                n = str(n)
                n = n.translate(
                    n.maketrans("", "", string.punctuation)
                )  # removes punctuation
                temp.append(n)

            noun_phrases = tuple(temp)

            return res, noun_phrases

        def getPronounLemma(t):
            lemma = None
            if t in ["he", "his", "him", "himself"]:
                lemma = "he"
            elif t in ["she", "her", "hers", "herself"]:
                lemma = "she"
            elif t in ["i", "my", "me", "mine", "myself"]:
                lemma = "I"
            elif t in ["you", "your", "yours", "yourself", "yourselves"]:
                lemma = "you"
            elif t in ["we", "our", "us", "ours", "ourselves"]:
                lemma = "we"
            elif t in ["they", "their", "them", "theirs", "themselves"]:
                lemma = "they"
            elif t in ["it", "its", "itself"]:
                lemma = "it"
            else:
                lemma = t

            return lemma

        # TODO: We should not do this here... This should be passed to this method as an argument...
        if self.controller:
            incl_nsubj = self.controller.postMainVerbTopics()  # true or false
        else:
            incl_nsubj = True  # default

        res = []
        is_left = True
        if not isinstance(sent, str):  # sent is a spacy object
            spacy_doc = sent
            # root = None

            for token in spacy_doc:
                lemma = ""

                if DSDocument.user_defined_synonyms is not None:
                    if token.pos_ in ("NOUN", "PROPN"):  # if the token is a noun
                        t = token.text.lower()  # original spelling
                        lemma = DSDocument.user_defined_synonyms.get(t, None)  #

                        if lemma is None:
                            t = token.lemma_.lower()  # SpaCy's lemma
                            lemma = DSDocument.user_defined_synonyms.get(t, None)

                        if lemma is None:
                            lemma = token.lemma_.lower()

                    elif token.tag_ in ("PRP", "PRP$"):
                        t = token.text.lower()
                        lemma = DSDocument.user_defined_synonyms.get(
                            t, None
                        )  # e.g., He

                        if lemma is None:
                            lemma = getPronounLemma(t)  # e.g., his
                            if lemma is None:
                                lemma = token.lemma_.lower()
                        else:
                            token.pos_ = "NOUN"
                            token.tag_ = (
                                "NN"  # if it is a synonym, treat them like a noun
                            )

                    else:
                        t = token.text.lower()
                        lemma = DSDocument.user_defined_synonyms.get(
                            t, None
                        )  # non-noun phrases included in a topic cluster

                        if lemma is None:
                            lemma = getPronounLemma(t)
                            if lemma is None:
                                lemma = token.lemma_.lower()
                        else:
                            token.pos_ = "NOUN"
                            token.tag_ = "NN"

                elif token.tag_ in ("PRP", "PRP$"):
                    t = token.text.lower()
                    lemma = getPronounLemma(t)
                    if lemma is None:
                        lemma = token.lemma_.lower()
                else:
                    t = token.text.lower()
                    lemma = getPronounLemma(t)
                    if lemma is None:
                        lemma = token.lemma_.lower()

                # temporary fix about 'data'
                if lemma == "datum":
                    lemma = "data"

                if token.text in end_puncts:
                    pos = "PUNCT"
                elif token.pos_ == "PROPN":  # Proper Nouns
                    pos = "NOUN"
                elif token.tag_ in ("PRP", "PRP$"):  # Pronouns / Pronoun Possessive
                    pos = "PRP"
                elif token.is_punct:  # Punctuations
                    pos = "PUNCT"
                elif token.pos_ == "PRON" and token.tag_ == "NN":
                    pos = "NOUN"
                else:  # Everything else
                    pos = token.pos_

                # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 4.DEP, 5.STEM,
                # 6.LINKS (for ROOT), 7.QUOTE, 8.WORD_POS, 9.DS_DATA,
                # 10.PARA_POS, 11.SENT_POS, 12.NEW, 13.GIVEN, 14.IS_SKIP, 15.IS_TOPIC
                # 10 thr 15 are added later.

                if incl_nsubj and token.dep_ in DSDocument.noun_subject_options:
                    # if incl_nsubj is True (user option), and the POS tag is in
                    # the options selected by the user
                    left = True
                elif lemma.lower() in DSDocument.user_defined_topics:
                    left = True
                else:
                    left = is_left

                w = (
                    pos,
                    token.text,
                    lemma,
                    left,
                    token.dep_,
                    "",
                    None,
                    False,
                    word_pos,
                    None,
                )
                res.append(w)

                if token.dep_ == "ROOT":
                    is_left = False

                word_pos += 1

            temp = []
            for n in spacy_doc.noun_chunks:
                n = str(n)
                n = n.translate(
                    n.maketrans("", "", string.punctuation)
                )  # removes punctuation
                temp.append(n)
            noun_phrases = tuple(temp)

        else:
            # sent is a string. Process it as a string
            res, noun_phrases = processHeading(sent)

        return res, noun_phrases, word_pos

    # end of processSent(...)

    def analyzeSent(self, sent_dict, content_type):
        """
        Perform a basic analysis of a given sentence in'sent_data'.
        """

        def traverse(token, is_left):
            l = None
            r = None
            res = None

            l = []
            for w in token.lefts:
                l += traverse(w, is_left)

            m = [token.text]

            r = []
            for w in token.rights:
                r += traverse(w, is_left)

            res = l + m + r

            return res  # end of traverse

        # def isNP(d, i):
        #     if d is not None:
        #         for np in d:
        #             if np[0] <= i < np[1]:
        #                 return True
        #     return False

        sent_data = sent_dict["text_w_info"]

        res = {}  # create a dictionary

        res["NOUNS"] = 0  # total # of nouns
        res["HNOUNS"] = 0  # total # of head nouns
        res["L_HNOUNS"] = 0  # head nouns on the left
        res["R_HNOUNS"] = 0  # head nouns on the right

        res["L_NOUNS"] = []  # nouns on the left
        res["R_NOUNS"] = []  # nouns on the right

        res["MV_LINKS"] = 0  # total # of links fron the root verb
        res["MV_L_LINKS"] = 0  # total # of left links from the root veb
        res["MV_R_LINKS"] = 0  # total # of right links from the root verb

        res["V_LINKS"] = 0  # total # of links from all the non-root verbs
        res["V_L_LINKS"] = 0  # total # of left links from all the non-root verbs
        res["V_R_LINKS"] = 0  # total # of right links fromn all the non-root verbs

        res["NR_VERBS"] = 0  # total # of non-root verbs
        res["NPS"] = []
        res["NUM_NPS"] = 0  # total # of NPs
        res["L_NPS"] = 0
        res["R_NPS"] = 0
        res["BE_VERB"] = False
        res["HEADING"] = False

        word_count = 1
        root_pos = -1
        for data in sent_data:
            if data[POS] == "NOUN" or data[POS] == "PRP":
                res["NOUNS"] += 1

                if data[ISLEFT] is True:
                    res["L_NOUNS"].append(data)
                else:
                    res["R_NOUNS"].append(data)

            if (
                data[DEP] in SUBJECTS
            ):  # we may want to change SUBJECTS to DSDocument.noun_subject_options:
                res["HNOUNS"] += 1

                if data[ISLEFT] is True:
                    res["L_HNOUNS"] += 1
                else:
                    res["R_HNOUNS"] += 1

            if data[DEP] == "ROOT":
                links = data[LINKS]
                if links is not None:
                    res["MV_LINKS"] = links["CCOUNT"]
                    res["MV_L_LINKS"] = links["LCOUNT"]
                    res["MV_R_LINKS"] = links["RCOUNT"]

                if data[WORD] in be_verbs:
                    res["BE_VERB"] = True

                root_pos = word_count

            elif data[POS] == "VERB":
                links = data[LINKS]
                if links is not None:
                    res["V_LINKS"] += links["CCOUNT"]
                    res["V_L_LINKS"] += links["LCOUNT"]
                    res["V_R_LINKS"] += links["RCOUNT"]
                    res["NR_VERBS"] += 1

            word_count += 1

        text = sent_dict["text"]
        if contains_html_tags(text):
            # Strip HTML tags, if any.
            soup = bs(text, "html.parser")
            text = soup.text

        text = text.strip().replace("\n", " ").replace("   ", " ").replace("  ", " ")
        spacy_doc = nlp(text) if nlp is not None else None

        if content_type == ContentType.HEADING:
            # if isinstance(sent, str):
            res["HEADING"] = True

        for token in spacy_doc if spacy_doc is not None else {}:
            if token.dep_ == "ROOT":
                root_pos = token.i
                break

        left_nps = []
        for np in spacy_doc.noun_chunks if spacy_doc is not None else []:
            if (np.end - 1) < root_pos:  # LEFT
                res["L_NPS"] += 1
                left_nps.append(np)
            elif (np.end - 1) > root_pos:  # RIGHT
                res["R_NPS"] += 1
            res["NPS"].append(np.text)
        res["NUM_NPS"] = len(res["NPS"])

        res["NOUN_CHUNKS"] = (
            [
                {"text": np.text, "start": np.start, "end": np.end}
                for np in spacy_doc.noun_chunks
            ]
            if spacy_doc is not None
            else []
        )

        tokens = []
        for token in spacy_doc if spacy_doc is not None else {}:
            is_root = token.dep_ == "ROOT"
            tokens.append({"text": token.text, "is_root": is_root})
        res["TOKENS"] = tokens

        advcl_root = None
        for token in spacy_doc if spacy_doc is not None else {}:
            if (
                token.dep_ == "ROOT"
            ):  # we are only intersted in the advcl before the main verb
                break
            if token.dep_ == "advcl":
                advcl_root = token
                break

        bIgnore = False
        if advcl_root is not None:
            left_span = []
            right_span = []
            count = 0
            start = 0
            for w in advcl_root.lefts:
                if count == 0:
                    start = w.i
                    if w.text.lower() in IGNORE_ADVCL_FIRST_WORDS or start != 0:
                        bIgnore = True
                        break

                left_span += traverse(w, True)
                count += 1
            if not bIgnore:
                for w in advcl_root.rights:
                    right_span += traverse(w, False)

                tmp = left_span + [advcl_root.text] + right_span
                end = start + len(tmp)

                mod_cl = " ".join(tmp)

                # Let's count how many NPs are in the modifier clause
                last_np = 0
                for np in left_nps:
                    if np.end <= end:
                        last_np = np.end
                    else:
                        break

                res["MOD_CL"] = (start, end, mod_cl, last_np)
            else:
                res["MOD_CL"] = None

        else:
            res["MOD_CL"] = None

        return res

    def processDoc(self):
        """
        This function iterates through all the paragraphs in the given docx document.
        and find all the unique lemmas in each sentence, and in each paragraph.
        """

        if not isModelLoaded():
            logging.warning("Warning: language model not loaded yet, loading ...")
            setLanguageModel(self.lang, NLP_MODEL_DEFAULT)

        if not isModelLoaded():
            logging.error("Error: unable to load language model!")
            return []

        logging.info("Language model appears to be loaded, processing text ...")

        self.global_topical_prog_data = None  # clear the cache

        if self.progress_callback:
            self.progress_callback(max_val=20, msg="Preprocessing...")
        self.num_quoted_words = 0

        word_pos = 0

        # Optimized by only adding NOUNs. We ignore all the other POSs.
        def listLemmas(sent):
            """Compose a list of lemmas in the given sentence."""
            lemmas = []
            temp = []

            for w in sent:
                if w[POS] is not None and w[LEMMA] not in stop_words:
                    if w[POS] in ("NOUN", "PRP"):
                        # FIXME: this if condition will always be true since
                        # the shape of the tuple and what is in temp differ.
                        if (w[POS], w[LEMMA]) not in temp:
                            temp.append(
                                (w[WORD], w[POS], w[LEMMA])
                            )  # 'they' + 'NOUN' + 'man'
                            lemmas.append(w)
            return lemmas

        # Optimization. We are only interested in nouns now.
        def accumulateParaLemmas():
            temp = []
            accum = []
            # for para in paragraphs:
            for elem in self.elements:
                elem_data = elem.data
                if elem_data and "lemmas" in elem_data:
                    lemmas = elem_data["lemmas"]
                    for l in lemmas:
                        if l[POS] == "NOUN":
                            if l[LEMMA] not in temp:
                                temp.append(l[LEMMA])
                                accum.append(l)
            return accum

        self.bQuote = False
        num_paras = len(self.elements)

        skip_paras = self.skip_paras

        for count_para, elem in enumerate(
            self.elements, start=1
        ):  # for each paragraph in the file
            if count_para <= skip_paras:
                continue
            if count_para > (skip_paras + self.max_paras):
                break

            if self.progress_callback:
                self.progress_callback(new_val=round(100 * count_para / num_paras))

            para_dict = elem.data  # we assume that sentences are alraedy initialized
            para_dict["lemmas"] = []
            para_dict["accum_lemmas"] = []
            para_dict["given_lemmas"] = []
            para_dict["new_lemmas"] = []
            para_dict["given_accum_lemmas"] = []
            para_dict["new_accum_lemmas"] = []

            # We only need to analyze lexical overlaps within these three block elements.
            if elem.content_type in [
                ContentType.PARAGRAPH,
                ContentType.LIST,
                ContentType.HEADING,
                ContentType.LISTITEM,
            ]:
                p = elem.text
            else:
                para_dict["text"] = ""
                continue

            if p == "":  # skip if it is an empty line.
                continue

            para_dict["text"] = p  # assign the paragraph obj to para_dict['text']

            for sent_dict in para_dict["sentences"]:

                if elem.content_type == ContentType.HEADING:
                    sent_dict["text_w_info"], NPs, word_pos = self.processSent(
                        sent_dict["text"], start=word_pos + 1
                    )
                else:
                    if sent_dict.get("is_image", False):
                        continue
                    sent_dict["text_w_info"], NPs, word_pos = self.processSent(
                        sent_dict["sent"], start=word_pos + 1
                    )

                sent_dict["sent_analysis"] = self.analyzeSent(
                    sent_dict, elem.content_type
                )
                sent_dict["lemmas"] = listLemmas(
                    sent_dict["text_w_info"]
                )  # list lemmas in the sentence
                sent_dict["accum_lemmas"] = []
                sent_dict["given_lemmas"] = []
                sent_dict["new_lemmas"] = []
                sent_dict["given_accum_lemmas"] = []
                sent_dict["new_accum_lemmas"] = []

                # update the paragraph's 'lemmans' field by adding new lemmas from the new sentence 's'
                for sl in sent_dict["lemmas"]:  # for each lemma in the new sentence,
                    match = False
                    for pl in para_dict[
                        "lemmas"
                    ]:  # check against each lemma in its paragraph.
                        if (
                            sl[POS] == pl[POS] and sl[LEMMA] == pl[LEMMA]
                        ):  # if there is a match
                            match = True  # mark 'match' as True, and beak
                            break
                    if not match:
                        para_dict["lemmas"].append(sl)

                sent_dict["accum_lemmas"] = list(para_dict["lemmas"])

            para_dict["accum_lemmas"] = accumulateParaLemmas()

            self.word_count = word_pos + 1

    def recalculateGivenWords(self):
        """
        (re)Calculate given words at the sentence and the paragraph level.
        """
        if len(self.elements) == 0:
            return
        if self.lexical_overlaps_analyzed:
            return

        if self.progress_callback:
            self.progress_callback(
                max_val=50, msg="Finding lexical overlaps between paragraphs..."
            )

        self.findGivenWordsPara()  # find given words between paragraphs

        if self.progress_callback:
            self.progress_callback(
                max_val=80, msg="Finding lexical overlaps between sentences..."
            )

        self.findGivenWordsSent()  # find given words between sentences in each paragraph

        self.clearGlobalTopicalProgDataCache()
        self.lexical_overlaps_analyzed = True

    def isGiven(self, l1, l2, pos1, pos2, pronoun=False):

        if pos1 == pos2:
            # these 2 lemmas share the same POS tag.
            if not pronoun and pos1 == "PRP":
                # we'll ignore this since they are pronouns and the pronoun display is OFF.
                return False
            if l1 == l2:  # lemma 1 == lemma 2 and POS1 == POS1
                return True
            return False

        if pronoun is True and pos1 == "PRP":
            # The pronoun display is ON, and pos1 is a pronoun.
            # Pronouns are ALWAYS given.
            return True

        return False

    def findGivenWordsSent(self):
        """
        This method iterates through the sentences in each paragraph
        of the document, and find all the given and 'new' lemmas. Notice
        that this function only finds given words/lemmas between sentences
        within a given paragraph. (i.e., No given words are discovered
        between the last sentence of a paragraph and the first sentence
        of the next paragraph.)
        """
        num_paras = len(self.elements)
        count_para = 0
        for elem in self.elements:

            if elem.content_type not in [ContentType.PARAGRAPH, ContentType.LIST]:
                continue

            para = elem.data

            count_para += 1

            if self.progress_callback:
                self.progress_callback(new_val=round(100 * count_para / num_paras))

            prev_s = None
            for sent in para["sentences"]:  # for each sentence in the paragraph
                sent["given_accum_lemmas"] = []
                sent["new_accum_lemmas"] = []

                if prev_s is not None:  # start with the 2nd sentence.
                    for gl in sent["lemmas"]:  # for each given lemmas in the sentence

                        for cl in prev_s["accum_lemmas"]:
                            # for each given accum_lemmas in the prev sentence
                            # if a lemma ('gl') is in the previous paragraph AND their POSs maatch

                            # Note: POS is no longer checked for optmization.
                            # if self.isPOSVisible(gl[POS]) and self.isGiven(gl[LEMMA], cl[LEMMA], gl[POS], cl[POS], pronoun=True):
                            if self.isGiven(
                                gl[LEMMA], cl[LEMMA], gl[POS], cl[POS], pronoun=self.prp
                            ):

                                # and if 'gl' is not already in the sentence's given lemma's list
                                if gl[LEMMA] not in [
                                    x[LEMMA] for x in sent["given_accum_lemmas"]
                                ]:
                                    sent["given_accum_lemmas"].append(
                                        gl
                                    )  # add 'gl' to the list

                        # commented out 9/16/2021
                        for temp_sent in para["sentences"]:
                            # for each sentence in the paragraph
                            if (
                                temp_sent == sent
                            ):  # break if temp_sent is the currente sent.
                                break
                            for cl in temp_sent[
                                "accum_lemmas"
                            ]:  # for each accum_lemma in the sentence
                                # if a lemma ('gl') is in the sentence AND their POSs maatch
                                # Note: POS is no longer checked for optmization.
                                if self.isGiven(
                                    gl[LEMMA],
                                    cl[LEMMA],
                                    gl[POS],
                                    cl[POS],
                                    pronoun=self.prp,
                                ):
                                    # if 'cl' is not already in the sentence's new lemmas list
                                    if gl[POS] != "PRP" and cl[LEMMA] not in [
                                        x[LEMMA] for x in temp_sent["new_accum_lemmas"]
                                    ]:
                                        temp_sent["new_accum_lemmas"].append(
                                            gl
                                        )  # add 'cl' to the list ol

                        # if 'lemma' a user defined topic, force it to be 'given'
                        if gl[LEMMA].lower() in DSDocument.user_defined_topics:
                            if gl[LEMMA].lower() not in sent["given_accum_lemmas"]:
                                sent["given_accum_lemmas"].append(gl)

                    prev_s = sent

                else:
                    prev_s = sent
                    for gl in sent["lemmas"]:
                        if gl[LEMMA].lower() in DSDocument.user_defined_topics:
                            if gl[LEMMA].lower() not in sent["given_accum_lemmas"]:
                                sent["given_accum_lemmas"].append(gl)

    def findGivenWordsPara(self):
        """
        This method iterates through the paragraphs in the data (Document),
        and find all the given and 'new' lemmas. (connection lemmmas are those words that
        appear in the following paragraph.
        """
        num_paras = len(self.elements)
        count_para = 0
        prev_p = None
        for elem in self.elements:

            if elem.content_type not in [ContentType.PARAGRAPH, ContentType.LIST]:
                continue

            para = elem.data

            count_para += 1

            if self.progress_callback:
                self.progress_callback(new_val=round(100 * count_para / num_paras))

            para["given_accum_lemmas"] = []
            para["new_accum_lemmas"] = []
            if prev_p is not None:  # start with the 2nd paragraph.
                for gl in para["lemmas"]:  # for each lemma in the paragraph

                    for cl in prev_p[
                        "accum_lemmas"
                    ]:  # for each given lemmas in the prev. paragraph
                        # if a lemma ('gl') is in the previous paragraphs AND their POSs maatch
                        # if self.isPOSVisible(gl[POS]) and self.isGiven(gl[LEMMA], cl[LEMMA], gl[POS], cl[POS]):
                        if self.isGiven(
                            gl[LEMMA], cl[LEMMA], gl[POS], cl[POS], pronoun=self.prp
                        ):
                            para["given_accum_lemmas"].append(
                                gl
                            )  # add 'gl' to the list
                            break  # 2024.12.02

                    for temp_elem in self.elements:
                        temp_para = temp_elem.data
                        if temp_para == para:
                            break

                        for cl in temp_para[
                            "accum_lemmas"
                        ]:  # for each paragraph's accum_lemmas
                            # if a lemma ('gl') is in the previous paragraph AND their POSs maatch
                            if self.isGiven(
                                gl[LEMMA], cl[LEMMA], gl[POS], cl[POS], pronoun=self.prp
                            ):
                                # if 'cl' is not already in the previous paragraph's new lemmas list
                                if gl[LEMMA] not in [
                                    x[LEMMA] for x in temp_para["new_accum_lemmas"]
                                ]:
                                    temp_para["new_accum_lemmas"].append(
                                        gl
                                    )  # add 'gl' to the list

                # remove the duplicates. It may be a bit faster to do it here than checking duplicates in the loop above...
                para["given_accum_lemmas"] = list(set(para["given_accum_lemmas"]))

                prev_p = para

            else:
                prev_p = para
                for gl in para["lemmas"]:
                    #### Adding new (not-given) lemmas to the first paragraph (2024.12.02)
                    if gl[LEMMA] not in [x[LEMMA] for x in para["new_accum_lemmas"]]:
                        para["new_accum_lemmas"].append(gl)

    ########################################
    #
    # Load Methods
    #
    ########################################

    def loadFromTxt(self, a_text):

        logging.info(a_text)

        paragraphs = a_text.splitlines()  # create a list of paragraphs

        html_str = "<html><body>"  # create an HTML string from the list of paragraphs
        for para in paragraphs:
            if para.strip() != "":
                html_str += f"<p>{para}</p>"
        html_str = "</body></html>"

        self.setHtml(html_str)
        self.processDoc()

    # def loadFromTxtFile(self, src_dir, file):
    #     """
    #     Load a text from a plain text file.
    #     """

    #     if self.progress_callback:
    #         self.progress_callback(new_val=10, msg="Opening file...")

    #     with open(os.path.join(src_dir, file), errors="ignore") as fin:
    #         text = fin.read()
    #         paragraphs = text.splitlines()

    #     loadFromTxt(text)

    def loadFromMSWordFile(self, src_dir, file):

        if self.progress_callback:
            self.progress_callback(max_val=10, msg="Opening file...")

        self.sections = []
        docx_path = os.path.join(src_dir, file)

        # Convert with style preservation
        with open(docx_path, "rb") as docx_file:
            result = mammoth.convert_to_html(docx_file,
                           convert_image=mammoth.images.img_element(convert_image))
            html_str = result.value

        # Process with style extraction
        self.setHtml(html_str)
        self.processDoc()

    def loadFromHtmlString(self, html_str):

        # Process with style extraction
        self.setHtml(html_str)
        self.processDoc()

    def loadFromHtmlFile(self, src_dir, html_file):
        with open(
            os.path.join(src_dir, html_file), errors="ignore", encoding="utf-8"
        ) as fin:
            html_str = fin.read()
        self.loadFromHtmlString(html_str)

    ########################################
    #
    # Methods for creating HTML/XML strings from the text data
    # Doesn't rely on DocuScope tagging, does rely on PythonDocX
    #
    ########################################

    def toHtml(self, topics=None, para_pos=-1, font_info=None):

        if topics is None:
            topics = []
        if font_info is None:
            font_info = default_font_info

        prev_content_type = None
        tag = None
        pcount = 0
        para_id = -1
        scount = 0
        for elem in self.elements:

            html_str = ""

            if elem.content_type not in [ContentType.PARAGRAPH, ContentType.LISTITEM]:
                # We only need to update sentences in paragraphns and lists.
                continue

            if elem.content_type == ContentType.PARAGRAPH:
                para_id = elem.para_id
                if self.soup:
                    tag = self.soup.find(
                        id=f"p{para_id}"
                    )  # find the tag with the id = elem.para_id
                    if isinstance(tag, Tag):
                        tag.clear()
            elif elem.content_type == ContentType.LISTITEM:
                pcount = elem.position
                para_id = elem.para_id
                if self.soup:
                    tag = self.soup.find(
                        id=f"li{pcount}"
                    )  # find the tag with the id = elem.position
                    if isinstance(tag, Tag):
                        tag.clear()
                    tag = self.soup.find(
                        id=f"p{pcount}"
                    )  # find the tag with the id = elem.position
                    if isinstance(tag, Tag):
                        tag.clear()  # clear the content

            if (
                elem.content_type == ContentType.LISTITEM
                and prev_content_type == ContentType.LISTITEM
            ):
                # We don't reset the pragraph count/id within a list.
                pass
            else:
                scount = 1

            prev_content_type = elem.content_type

            # Tag each sentence with a uniquje ID.
            for sent in elem.data[
                "sentences"
            ]:  # for each sentence within this element.
                next_char = ""
                if sent.get("is_image", False):
                    html_str += " "
                    html_str += sent["text"]
                    html_str += " "
                    scount += 1
                    continue

                total_words = len(sent["text_w_info"])  # get the total # of words
                is_combo = False
                combo_word = ""
                word_count = 0

                # open <span> tag
                html_str += f'<span id="p{para_id}s{scount}" class="sentence" data-ds-paragraph="{para_id}" data-ds-sentence="{scount}"> '
                while word_count < total_words:

                    w = sent["text_w_info"][word_count]
                    word = w[WORD]  # ontopic word
                    lemma = w[LEMMA]  # lemma/topic

                    if lemma in topics and (
                        w[POS] == "NOUN" or w[POS] == "PRP"
                    ):  # if w[LEMMA] in topics:
                        # we need to remove periods.
                        topic = unidecode.unidecode(w[LEMMA].replace(".", ""))
                        html_word = f'<span class="word" data-ds-paragraph="{para_id}" data-ds-sentence="{scount}" data-topic="{topic}">{word}</span> '
                    else:
                        html_word = word

                    is_space = True
                    is_combo = False
                    temp_word_count = 0

                    if word_count < total_words - 1:
                        # Let's deal with hyphenations and words followed by a no-space units.
                        next_w = sent["text_w_info"][word_count + 1]
                        next_next_w = None

                        if word_count + 1 < total_words - 1:
                            next_next_w = sent["text_w_info"][word_count + 2]

                        if word in right_quotes and html_str[-1] == " ":
                            # if w[WORD] is a right side quotes, and the current html_str string ends
                            # with a space, remove the space.
                            html_str = html_str[:-1]

                        if word in left_quotes or word in hyphen_slash:
                            # w is a left side punct or a dash (not em-dash or en-dash)
                            is_space = False

                        elif word == "." and next_w[WORD].isdigit():
                            # if word is a period and the next word is a digit + %, it's a decimal point.
                            is_space = False

                        elif (
                            word == "."
                            and len(next_w[WORD]) == 1
                            and next_w[WORD].isalpha()
                        ):
                            # if word is a period and the next word is single alphabet, it's a decimal point
                            # or multi-level figure numbers.
                            is_space = False

                        elif (
                            word == "can"
                            and next_w[WORD] == "not"
                            and next_next_w is not None
                            and next_next_w[WORD] != "only"
                        ):
                            # we always spell 'can not' without a space, except when it is followd by 'only'.
                            is_space = False

                        elif next_w[WORD] not in left_quotes:
                            # next_w is a punct, which is not on one of the left quotes

                            temp_word_count = 0
                            if next_w[WORD] in no_space_patterns:

                                combo_word = html_word + next_w[WORD]
                                temp_word_count = word_count + 2

                                if (
                                    temp_word_count < total_words
                                ):  # is the folloiwng word punct?
                                    temp_w = sent["text_w_info"][temp_word_count]

                                    if (
                                        temp_w[WORD] in no_space_patterns
                                        or temp_w[WORD] in right_quotes
                                    ):
                                        combo_word = combo_word + temp_w[WORD]
                                        word_count = temp_word_count
                                        is_space = True
                                        is_combo = True

                                    elif (
                                        temp_w[POS] == "PUNCT"
                                        and temp_w[WORD] not in dashes
                                        and temp_w[WORD] != ellipsis
                                    ):
                                        combo_word = combo_word + temp_w[WORD]
                                        word_count = temp_word_count
                                        is_space = True
                                        is_combo = True

                                    else:
                                        word_count += 1
                                        is_space = True
                                        is_combo = True

                                else:
                                    word_count += 1  # skip the next word
                                    is_space = True
                                    is_combo = True

                            elif next_w[WORD] in hyphen_slash:
                                combo_word = (
                                    html_word + next_w[WORD]
                                )  # word + '-' or '/'
                                temp_word_count = word_count + 2

                                if temp_word_count >= total_words:
                                    pass

                                temp_next_w = None
                                while True:

                                    if temp_word_count >= (total_words):
                                        break

                                    # get the next pair
                                    temp_w = sent["text_w_info"][temp_word_count]
                                    if temp_w[LEMMA] in topics and (
                                        temp_w[POS] == "NOUN" or temp_w[POS] == "PRP"
                                    ):
                                        topic = unidecode.unidecode(
                                            w[LEMMA].replace(".", "")
                                        )
                                        html_temp_word = f'<span class="word" data-ds-paragraph="{para_id}" data-ds-sentence="{scount}" data-topic="{topic}">{temp_w[WORD]}</span> '
                                    else:
                                        html_temp_word = temp_w[WORD]

                                    if temp_word_count + 1 < (total_words):
                                        temp_next_w = sent["text_w_info"][
                                            temp_word_count + 1
                                        ]

                                        if temp_next_w[WORD] in hyphen_slash:
                                            combo_word += html_temp_word
                                            combo_word += temp_next_w[
                                                WORD
                                            ]  # word + '-' or '/'
                                            temp_word_count += 2
                                        else:
                                            combo_word += html_temp_word
                                            break
                                    else:
                                        combo_word += html_temp_word
                                        break

                                if temp_next_w is not None:

                                    if (
                                        temp_next_w[WORD] in no_space_patterns
                                        or temp_next_w[WORD] in right_quotes
                                    ):
                                        is_space = False

                                    elif (
                                        temp_next_w[WORD] in end_puncts
                                        and temp_next_w[WORD] not in dashes
                                        and temp_next_w[WORD] != ellipsis
                                    ):
                                        is_space = False

                                    else:
                                        is_space = True
                                else:
                                    is_space = True

                                word_count = temp_word_count  # skip all the words in the hyphenated word
                                # is_space = True
                                is_combo = True

                            elif next_w[WORD] in right_quotes:
                                is_space = False

                            elif (
                                next_w[POS] == "PUNCT"
                                and next_w[WORD] not in dashes
                                and next_w[WORD] != ellipsis
                            ):
                                is_space = False

                            elif next_w[POS] == "PUNCT" and next_w[WORD] in end_puncts:
                                is_space = False
                            else:
                                is_space = True

                        if is_space:
                            next_char = " "
                        else:
                            next_char = ""

                    else:  # last word/char in 'sent'
                        if word in ["\u201c", "\u2018"]:
                            # If the last word is an opening/left single/double quote, no space should be added.
                            # This case should only happen if the NLP parser's result is incorrect.
                            next_char = ""

                        elif word in right_quotes:
                            if html_str[-1] == " ":
                                html_str = html_str.rstrip()
                            next_char = " "
                        else:
                            next_char = ""  # end of 'sent' Jan 14

                    if is_combo:
                        html_str += combo_word
                    else:
                        html_str += html_word

                    html_str += next_char
                    word_count += 1

                #  word
                html_str += "</span> "
                html_str += next_char
                scount += 1

            new_content = bs(html_str, "html.parser")
            for e in new_content:
                if tag and isinstance(tag, Tag):
                    tag.append(e)

        html_str = str(self.soup)  # create a new html_string with sentence tags

        return html_str

    def getSentencesWithTopics(self, topics):
        if self.soup is None:
            logging.error("Error: soup is None, cannot get sentences with topics!")
            return []
        res = []

        for topic in topics:
            tags = self.soup.find_all("span", attrs={"data-topic": f"{topic}"})
            for tag in tags:
                if isinstance(tag, Tag):
                    pid = tag.get("data-ds-paragraph")
                    sid = tag.get("data-ds-sentence")
                    t = (int(str(pid)), int(str(sid)), topic)
                    res.append(t)

        return res

    ########################################
    #
    # Methods for creating HTML/XML strings from the text data
    #
    ########################################

    def toXml(self, removed_tags=[]):
        """
        Convert the document to XML format.
        removed_tags: A list of tags to be removed.
        """

        if self.elements is None or len(self.elements) == 0:
            logging.error("Error: no elements found, document is unprocessed.")
            return ""
        if self.soup is None:
            logging.error("Error: soup is None, cannot convert to XML!")
            return ""

        allowed_attrs = ["id", "alt", "src"]

        soup_copy = copy.deepcopy(self.soup)

        if removed_tags:
            # Remove the tags in removed_tags from the html string.
            for tag in soup_copy.find_all(['img', 'table']):
                tag.decompose()

        for tag in soup_copy.find_all():
            if isinstance(tag, Tag) and tag.attrs:
                new_attrs = {k: v for k, v in tag.attrs.items() if k in allowed_attrs}
                tag.attrs = new_attrs

        xml_string = soup_copy.decode(formatter="minimal")

        return xml_string

    ########################################
    #
    # Methods for generating data used for visualization
    #
    ########################################

    def getLocalTopicalProgData(self, selected_paragraphs):

        selected_paragraphs.sort()

        all_lemmas = []
        temp = []

        if self.elements is None or len(self.elements) == 0:
            return []

        selected_elem_list = []
        for pos in selected_paragraphs:
            if pos > len(self.elements):
                break
            e = self.elements[pos - 1]
            if e.content_type in [
                ContentType.PARAGRAPH,
                ContentType.HEADING,
                ContentType.LIST,
            ]:
                selected_elem_list.append(e)

        if len(selected_elem_list) == 0:
            return []

        for elem in selected_elem_list:
            p = elem.data
            for s in p["sentences"]:  # for each sentence
                if s.get("is_image", False):
                    continue
                for l in s["new_accum_lemmas"]:  # for each new lemma
                    t = (l[POS], l[LEMMA])  # tuple = (POS, LEMMA)
                    if t not in temp:  # if the lemma 'l' is not already in the list,
                        all_lemmas.append(
                            (l[POS], l[LEMMA], l[8])
                        )  # append a tuple (POS, LEMMA, first word_pos)
                        temp.append(t)

                for l in s["given_accum_lemmas"]:  # for each given lemma
                    t = (l[POS], l[LEMMA])  # tuple = (POS, LEMMA)
                    if t not in temp:  # if the lemma 'l' is not already in the list,
                        all_lemmas.append(
                            (l[POS], l[LEMMA], l[8])
                        )  # append a tuple (POS, LEMMA, first_word_pos)
                        temp.append(t)

        # Adding local given/new lemmas from adjacent paragraphs.
        if (
            len(selected_paragraphs) > 1
        ):  # applicable if 2 or more paragrpahs are selected.
            temp_count = 0
            p_all_lemmas = []  # all the global given & new lemmas.
            p_temp = temp
            for elem in selected_elem_list:
                p = elem.data

                for l in p["new_accum_lemmas"]:
                    t = (l[POS], l[LEMMA])
                    if t not in p_temp:
                        p_all_lemmas.append((l[POS], l[LEMMA], l[8]))
                        p_temp.append(t)

                for l in p["given_accum_lemmas"]:
                    t = (l[POS], l[LEMMA])
                    if t not in p_temp:
                        p_all_lemmas.append((l[POS], l[LEMMA], l[8]))
                        p_temp.append(t)

                temp_count += 1

            # Exclude the lemmas that do not appear in more than 2 paragraphs
            for l in p_all_lemmas:
                count = 0
                for p in selected_elem_list:
                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in p["lemmas"]]:
                        count += 1
                if count >= 2:
                    all_lemmas.append(l)

        all_lemmas.sort(key=lambda tup: tup[2])  # sort by the order of appearance.

        res = []
        res.append(all_lemmas)
        p_count = 1

        bSkipPunct = False

        new_lemmas = []
        given_lemmas = []
        prev_given_lemmas = []
        prev_para = None
        for elem in selected_elem_list:

            p = elem.data
            s_count = 1

            # we'll need to find a sentence with a single punctuation character.
            for s in p["sentences"]:
                if s.get("is_image", False):
                    continue
                bSkipPunct = bool(
                    len(s["text"]) == 1
                    and (
                        s["text"] in dashes
                        or s["text"] in hyphen_slash
                        or s["text"] in left_quotes
                        or s["text"] in right_quotes
                        or s["text"] == ellipsis
                    )
                )

                # The following changes support the local cohesion visualization with 2 or more paragraphs
                # remove any lemmas that have appeared in the previous paragraphs from new_lemmas list
                # new_lemmas   = list(set(s['new_accum_lemmas']) - set(prev_given_lemmas)) # OLD

                # add the given_accum_lemmas from the last sentence of the previous paragraphs
                # and remove duplicates

                s_lemmas = [(t[POS], t[LEMMA]) for t in s["lemmas"]]
                s_new_accum_lemmas = [(t[POS], t[LEMMA]) for t in s["new_accum_lemmas"]]
                s_given_accum_lemmas = [
                    (t[POS], t[LEMMA]) for t in s["given_accum_lemmas"]
                ]
                new_lemmas = list(
                    set(s_lemmas) & (set(s_new_accum_lemmas) - set(prev_given_lemmas))
                )

                if prev_para is not None:
                    prev_para_given_accum_lemmas = [
                        (t[POS], t[LEMMA]) for t in prev_para["given_accum_lemmas"]
                    ]
                    prev_para_new_accum_lemmas = [
                        (t[POS], t[LEMMA]) for t in prev_para["new_accum_lemmas"]
                    ]

                    given_lemmas = list(
                        set(s_lemmas)
                        & set(
                            s_given_accum_lemmas
                            + prev_given_lemmas
                            + prev_para_given_accum_lemmas
                            + prev_para_new_accum_lemmas
                        )
                    )
                else:
                    given_lemmas = list(
                        set(s_lemmas) & set(s_given_accum_lemmas + prev_given_lemmas)
                    )

                sres = []  # get an empty list
                for l in all_lemmas:

                    is_new = False
                    is_given = False

                    # if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in new_lemmas]:
                    if (l[0], l[1]) in new_lemmas:
                        is_new = True

                    # if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in given_lemmas]:
                    if (l[0], l[1]) in given_lemmas:
                        is_given = True

                    is_match = False
                    t = None
                    if is_new or is_given:
                        is_left = False
                        left_t = None
                        for sl in s["lemmas"]:

                            if sl[LEMMA] == l[1]:

                                # LOCAL
                                # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 4.DEP, 5.STEM,
                                # 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA,
                                # 10.PARA_POS, 11.SENT_POS, 12.NEW, 13.GIVEN,
                                # 14.IS_SKIP, 15.IS_TOPIC

                                if sl[ISLEFT]:
                                    is_left = True
                                    left_t = sl + tuple(
                                        [
                                            p_count,
                                            s_count,
                                            is_new,
                                            is_given,
                                            bSkipPunct,
                                            True,
                                        ]
                                    )
                                elif not is_left:
                                    t = sl + tuple(
                                        [
                                            p_count,
                                            s_count,
                                            is_new,
                                            is_given,
                                            bSkipPunct,
                                            False,
                                        ]
                                    )

                                is_match = True
                                break  # 2021.11.21

                        if is_match:
                            if is_left and left_t is not None:
                                sres.append(left_t)
                            else:
                                sres.append(t)

                    if not is_match:
                        sres.append(tuple([None, bSkipPunct]))

                # for each lemmas in 'all_lemmas'

                res.append(sres)
                s_count += 1

                prev_given_lemmas = given_lemmas
                prev_para = p

            res.append([-1] * (len(all_lemmas) + 2))
            p_count += 1

        res = res[:-1]

        return res

    def getGlobalTopicalProgData(self, sort_by=TOPIC_SORT_APPEARANCE):

        if (
            self.lexical_overlaps_analyzed
        ):  # if lexical overlaps have been analyzed already
            if (
                self.global_topical_prog_data is not None
            ):  # if global_topical_prog_data are already genreated, return themn.
                return (
                    self.global_topical_prog_data
                )  # otherwise, we'll generate new global_topical_prog_data

        # first we should make a list of given lemmas as they appear in the text
        all_lemmas = []
        temp = []

        for elem in self.elements:
            if elem.content_type not in [
                ContentType.PARAGRAPH,
                ContentType.LIST,
                ContentType.HEADING,
            ]:
                continue

            p = elem.data
            for l in p["new_accum_lemmas"]:  # for each new lemma
                t = (l[POS], l[LEMMA])  # tuple = (POS, LEMMA)
                if t not in temp:  # if the lemma 'l' is not already in the list,
                    all_lemmas.append(
                        (l[POS], l[LEMMA], l[8])
                    )  # append a tuple (POS, LEMMA, word_pos)
                    temp.append(t)
            for l in p["given_accum_lemmas"]:  # for each new lemma
                t = (l[POS], l[LEMMA])  # tuple = (POS, LEMMA)
                if t not in temp:  # if the lemma 'l' is not already in the list,
                    all_lemmas.append(
                        (l[POS], l[LEMMA], l[8])
                    )  # append a tuple (POS, LEMMA, word_pos)
                    temp.append(t)

        # Count how many times each topic appears on the left side of a sentence.
        sent_topic_counter = Counter()
        para_topic_set = set()
        p_count = 1

        for elem in self.elements:
            if elem.content_type not in [
                ContentType.PARAGRAPH,
                ContentType.LIST,
                ContentType.HEADING,
            ]:
                continue

            p = elem.data

            s_count = 1
            for s in p["sentences"]:  # for each sentence
                if s.get("is_image", False):
                    continue
                for l in all_lemmas:  # for each topic candidate
                    is_new = False
                    is_given = False

                    if (l[0], l[1]) in [
                        (t[POS], t[LEMMA]) for t in p["new_accum_lemmas"]
                    ]:
                        is_new = True
                    if (l[0], l[1]) in [
                        (t[POS], t[LEMMA]) for t in p["given_accum_lemmas"]
                    ]:
                        is_given = True

                    if is_new or is_given:  # if 'l' is given or new
                        for sl in s["lemmas"]:
                            if sl[LEMMA] == l[1] and sl[POS] == l[0]:
                                if sl[ISLEFT]:
                                    sent_topic_counter[sl[LEMMA]] += 1
                                    para_topic_set.add((p_count, sl[LEMMA]))
            p_count += 1

        para_topic_counter = Counter()
        for t in para_topic_set:
            para_topic_counter[t[1]] += 1

        all_lemmas = []
        temp = []

        for elem in self.elements:
            if elem.content_type not in [
                ContentType.PARAGRAPH,
                ContentType.LIST,
                ContentType.HEADING,
            ]:
                continue

            p = elem.data
            for l in p["new_accum_lemmas"]:  # for each new lemma
                t = (l[POS], l[LEMMA])  # tuple = (POS, LEMMA)
                if t not in temp:  # if the lemma 'l' is not already in the list,
                    s_topic_count = sent_topic_counter[l[LEMMA]]
                    p_topic_count = para_topic_counter[l[LEMMA]]
                    all_lemmas.append(
                        (l[POS], l[LEMMA], l[8], s_topic_count, p_topic_count)
                    )  # append a tuple (POS, LEMMA, word_pos)
                    temp.append(t)
            for l in p["given_accum_lemmas"]:  # for each new lemma
                t = (l[POS], l[LEMMA])  # tuple = (POS, LEMMA)
                if t not in temp:  # if the lemma 'l' is not already in the list,
                    s_topic_count = sent_topic_counter[l[LEMMA]]
                    p_topic_count = para_topic_counter[l[LEMMA]]
                    all_lemmas.append(
                        (l[POS], l[LEMMA], l[8], s_topic_count, p_topic_count)
                    )  # append a tuple (POS, LEMMA, word_pos)
                    temp.append(t)

        all_lemmas.sort(key=lambda tup: tup[2])  # sort by the order of appearance.
        if sort_by == TOPIC_SORT_LEFT_COUNT:
            all_lemmas.sort(
                key=lambda tup: tup[3], reverse=True
            )  # sort by the total left count

        res = []
        res.append(all_lemmas)
        collapsed_res = []
        res.append([-1] * (len(all_lemmas) + 2))

        pres: List[Any] = [None] * (len(self.elements) + 2)
        pres[0] = all_lemmas
        pres[1] = [-1] * (len(all_lemmas) + 2)

        bSkipPunct = False

        # NOTE: Create a dictionary that keeps track of given/new counts
        # given_new_counts = {}

        for p_count, elem in enumerate(self.elements, start=1):
            if elem.content_type not in [
                ContentType.PARAGRAPH,
                ContentType.LIST,
                ContentType.HEADING,
            ]:
                continue

            p = elem.data

            for s_count, s in enumerate(p["sentences"], start=1):  # for each sentence
                # if s['text'] is a single character, and one of these punct chracters
                # we'll make the row as bSkipPunct == True.
                bSkipPunct = bool(
                    len(s["text"]) == 1
                    and (
                        s["text"] in dashes
                        or s["text"] in hyphen_slash
                        or s["text"] in left_quotes
                        or s["text"] in right_quotes
                        or s["text"] == ellipsis
                    )
                )

                sres = []  # get an empty list
                for l in all_lemmas:  # for each topic candidate
                    is_new = False
                    is_given = False

                    if (l[0], l[1]) in [
                        (t[POS], t[LEMMA]) for t in p["new_accum_lemmas"]
                    ]:
                        is_new = True
                    if (l[0], l[1]) in [
                        (t[POS], t[LEMMA]) for t in p["given_accum_lemmas"]
                    ]:
                        is_given = True

                    is_match = False
                    t = None
                    if is_new or is_given:  # if 'l' is given or new
                        is_left = False
                        left_t = None
                        for sl in s["lemmas"]:
                            # and the lemma is also in the sentence.
                            if sl[LEMMA] == l[1] and sl[POS] == l[0]:

                                # Global
                                # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 4.DEP, 5.STEM,
                                # 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA, 10.PARA_POS, 11.SENT_POS
                                # 12.NEW, 13.GIVEN, 14.IS_SKIP, 15.IS_TOPIC

                                if sl[ISLEFT]:
                                    is_left = True
                                    left_t = sl + tuple(
                                        [
                                            p_count,
                                            s_count,
                                            is_new,
                                            is_given,
                                            bSkipPunct,
                                            is_left,
                                        ]
                                    )
                                elif not is_left:
                                    t = sl + tuple(
                                        [
                                            p_count,
                                            s_count,
                                            is_new,
                                            is_given,
                                            bSkipPunct,
                                            is_left,
                                        ]
                                    )

                                is_match = True
                                break  # 2021.11.21

                        if is_match:
                            if is_left and left_t is not None:
                                pres[p_count + 1] = left_t
                                sres.append(left_t)
                            else:
                                pres[p_count + 1] = t
                                sres.append(t)

                    if not is_match:
                        sres.append(tuple([None, bSkipPunct]))

                    # end of 'for l in all_lemmas:'

                # append a sentencce
                collapsed_res.append(pres)
                res.append(sres)

                # end of 'for s in p['sentences']:'

            res.append([-1] * (len(all_lemmas) + 2))
            # end of 'for p in data['paragraphs']:''

        self.global_topical_prog_data = {"data": res, "para_data": []}

        return self.global_topical_prog_data

    def getSentStructureData(self):
        p_count = 1
        para_id = 0
        s_count = 1
        res = []

        bSkipPunct = False
        prev_content_type = None

        for elem in self.elements:

            if elem.content_type == ContentType.LISTITEM:
                if prev_content_type != ContentType.LISTITEM:
                    res.append("\n")
            else:
                res.append("\n")

            if elem.content_type in [
                ContentType.PARAGRAPH,
                ContentType.LISTITEM,
                ContentType.HEADING,
            ]:
                p = elem.data
                para_id = elem.para_id

                if (
                    elem.content_type == ContentType.LISTITEM
                    and prev_content_type == ContentType.LISTITEM
                ):
                    pass
                else:
                    s_count = 1  ## If list-item, don't reset s_count!!

                prev_content_type = elem.content_type

                for s in p["sentences"]:  # for each sentence
                    if s.get("is_image", False):
                        continue
                    bSkipPunct = bool(
                        len(s["text"]) == 1
                        and (
                            s["text"] in dashes
                            or s["text"] in hyphen_slash
                            or s["text"] in left_quotes
                            or s["text"] in right_quotes
                            or s["text"] == ellipsis
                        )
                    )
                    res.append(
                        tuple([para_id, s_count, s["sent_analysis"], s, bSkipPunct])
                    )

                    s_count += 1

                p_count += 1
            elif elem.content_type in [ContentType.TABLE, ContentType.IMAGE]:
                res.append(tuple([para_id, s_count, None, elem.text, bSkipPunct]))

        res.append("\n")

        return res

    ########################################
    #
    # Debugging tools
    #
    ########################################

    def saveJSON(self, filepath):
        """Save the document sections as a JSON file."""
        with open(f"{filepath}.json", "w", encoding="utf-8") as fout:
            fout.write(json.dumps(self.sections, indent=4))

    ###############################################################################
    #
    # The Methods below here are used only by the online version of DocuScope Write & Audit
    #
    # The following are the top level functions that should be used to retrieve the data.
    #     DSDocument.generateLocalVisData(self, selected_paragraphs, max_topic_sents=1, min_topics=2)
    #     DSDocument.generateGlobalVisData(self, min_topics=2, max_topic_sents=1, sort_by=TOPIC_SORT_APPEARANCE)
    #
    # You can use the following methods to test the data genereated by the above methods.
    # These functions print the visualization using ASCII characters.
    #
    #    testPrintLocalVisData(data)
    #    testPrintGlobalVisdata(data)
    #
    ###############################################################################

    def generateLocalVisData(
        self, selected_paragraphs, max_topic_sents=1, min_topics=2
    ):
        """
        This method returns a python dictionary that contains the data that are needed for
        the visualization of coherence across sentences within 1 or more pragraphs.

        selected_paragraphs:    A list of paragraph IDs.
        max_topic_sents:        The total number of sentences at the beginning of paragraphs that
                                should be considered a topic sentence.
        min_topics:             The minimum number of lexical overlaps between sentences.

        """

        self.local_topics = []

        data = self.getLocalTopicalProgData(selected_paragraphs)
        if data is None:
            return {"error": "data is None"}

        topic_filter = TOPIC_FILTER_LEFT_RIGHT
        # key_para_topics = self.getKeyParaTopics()
        # key_sent_topics = []

        header = data[0]  # list of tuples (POS, LEMMA)
        self.local_header = header
        nrows = len(data)
        ncols = len(header)

        if ncols == 0:
            return {"error": "ncols is 0"}

        vis_data = {
            "num_topics": ncols,
            "data": [],
        }

        if selected_paragraphs:
            sent_filter = self.filterLocalTopics(data, nrows, ncols)
            selected_paragraphs.sort()
            b_para_break = False
            true_left_count = 0
            l_count = 0
            num_topics = 0
            # num_sents = 0
            for ci in range(ncols):

                topic = header[ci][1]
                topic_data: List[Any] = [None] * (nrows - 1)
                # b_skip = False
                sent_pos = 0
                sent_id = 0
                count = -1

                if topic is not None:
                    true_left_count = sent_filter[topic]["left_count"]

                    if topic_filter == TOPIC_FILTER_ALL:
                        count = sent_filter[topic]["count"]
                        l_count = sent_filter[topic]["left_count"]
                    else:
                        l_count = sent_filter[topic]["left_count"]
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

                if count < min_topics:
                    continue

                is_global = False
                if topic in self.global_topics:
                    is_global = True

                is_tc = DSDocument.isUserDefinedSynonym(topic)

                self.local_topics.append((topic, is_global))

                topic_info = None
                para_count = 0
                para_id = selected_paragraphs[para_count]

                for ri in range(1, nrows):  # for each row
                    elem = data[ri][ci]  # get the elem

                    if isinstance(elem, int) and elem < 0:
                        b_para_break = True
                    elif (
                        isinstance(elem, tuple)
                        and elem[0] is not None
                        and not is_skip(elem, true_left_count, topic_filter)
                    ):
                        if not elem[IS_SKIP]:
                            topic_data[sent_pos] = {
                                # "topic": elem,
                                "sent_pos": sent_id,
                                "para_pos": para_id,
                                "is_left": elem[ISLEFT],
                                "is_topic_sent": sent_id < max_topic_sents,
                            }
                            topic_info = elem

                    # b_skip is unused
                    # elif (
                    #     isinstance(elem, tuple)
                    #     and elem[0] is not None
                    #     and is_skip(elem, true_left_count, topic_filter)
                    # ):
                    #     b_skip = True

                    # elif isinstance(elem, tuple) and elem[0] is None:
                    #     b_skip = True

                    if b_para_break:
                        para_count += 1
                        para_id = selected_paragraphs[para_count]
                        sent_id = 0
                        b_para_break = False
                    else:
                        sent_pos += 1
                        sent_id += 1

                vis_data["data"].append(
                    {
                        "sentences": topic_data,
                        "is_topic_cluster": is_tc,
                        "is_global": is_global,
                        "num_sents": len(topic_data),
                        "topic": list(topic_info[0:3]) if topic_info else None,
                    }
                )
                num_topics += 1

            vis_data["num_topics"] = num_topics

        return vis_data

    def generateGlobalVisData(
        self, min_topics=2, max_topic_sents=1, sort_by=TOPIC_SORT_APPEARANCE
    ):
        """
        This method returns a python dictionary that contains the data that are needed for
        the visualization of coherence across paragraphs.
        min_topics:             The minimum number of lexical overlaps between sentences.
        max_topic_sents:        The total number of sentences at the beginning of paragraphs that
                                should be considered a topic sentence.
        sort_by:                The sorting method option.
        """

        self.recalculateGivenWords()

        global_data = self.getGlobalTopicalProgData(sort_by=sort_by)
        self.updateLocalTopics()
        self.updateGlobalTopics(global_data)

        if global_data is None:
            return {"error": "ncols is 0"}

        data = global_data["data"]
        # para_data = global_data['para_data']

        if data is None:
            return {"error": "ncols is 0"}

        header = data[0]  # list of tuples (POS, LEMMA, POS, COUNT)

        nrows = len(data)  # Initialize the number of rows and the number of columns.
        ncols = len(header)

        self.global_topics = []

        if ncols == 0:
            return {"error": "ncols is 0"}

        vis_data = {}
        vis_data["num_topics"] = ncols
        vis_data["data"] = []

        # Filters
        # para_filter = self.filterParaTopics(data, nrows, ncols)
        sent_filter = self.filterTopics(data, nrows, ncols)
        topic_filter = TOPIC_FILTER_LEFT_RIGHT

        # num_sents_per_topic = 0
        b_break = False
        true_left_count = 0
        l_count = 0
        count = 0

        for ci in range(ncols):  # for each topic entry,

            topic = header[ci][1]  # find a topic from the header list.
            topic_data: List[dict | None] = [None] * (
                nrows - 1
            )  # initialize the topic data
            p_ri = 0  # initialize the row index w/in paragraph

            if topic is not None:  # topic exists
                if not self.isLocalTopic(topic) and not DSDocument.isUserDefinedSynonym(
                    topic
                ):  # topic cluster = user defined synonym
                    # if the topic is NOT a local topic AND it is NOT a topic cluster,
                    # we should skip this topic.
                    continue

                # Count how manu times the topic appears on the left side of the main verb.
                if DSDocument.isUserDefinedSynonym(topic):  # topic is a topic cluster.
                    true_left_count = sent_filter[topic]["left_count"]
                    count = sent_filter[topic]["count"]
                    l_count = sent_filter[topic]["left_count"]
                    count = max(count, 2)  # at least 2
                else:  # topic is not a topic sluster
                    true_left_count = sent_filter[topic]["left_count"]
                    if topic_filter == TOPIC_FILTER_ALL:  # rarely used.
                        count = sent_filter[topic]["count"]
                        l_count = sent_filter[topic]["left_count"]
                    else:  # default
                        l_count = sent_filter[topic]["left_count"]
                        if l_count == 1:  # one left + one right case.
                            count = 2
                        else:
                            count = l_count

            if count < min_topics:  # min_topics == 2 by default.
                # Skip topics that do not apper in more than 2 paragraphs.
                continue

            self.global_topics.append(
                topic
            )  # if we get here, the topic is a global topic.

            is_tc = DSDocument.isUserDefinedSynonym(
                topic
            )  # check if topic is a topic cluster.

            topic_info = None
            sent_count = 0

            # we will start with the index == 2 because the first index is the header row,
            # and the second index is the pragraph break indicator.

            for ri in range(2, nrows):  # for each column (r & c are flipped!)

                elem = data[ri][ci]  # get the elem

                if isinstance(elem, int) and elem < 0:  # paragraph brek
                    b_break = True

                # Not the first column (not the paragraph ID/Number)
                elif (
                    isinstance(elem, tuple)
                    and elem[0] is not None
                    and not is_skip(elem, true_left_count, topic_filter)
                ):

                    curr_elem = topic_data[p_ri]

                    # d['sent_id'] captures the sent id of the first occurence
                    # of the topic on the left side.
                    if (
                        curr_elem is not None
                        and elem[ISLEFT] is True
                        and curr_elem["topic"][ISLEFT] is False
                    ):
                        # 'elem' not the first instance for this paragraph
                        # the existing element 'curr_elem' is on the right side.
                        d = {
                            "topic": list(elem),
                            "first_left_sent_id": sent_count,
                            "para_pos": p_ri,
                            "is_left": True,
                            # 'is_topic_cluster': is_tc,
                        }

                        if sent_count < max_topic_sents:
                            d["is_topic_sent"] = True
                        else:
                            d["is_topic_sent"] = False

                        topic_data[p_ri] = d

                    elif curr_elem is None:
                        d = {}
                        d["topic"] = list(elem)
                        d["para_pos"] = p_ri

                        if elem[ISLEFT] is True:
                            d["first_left_sent_id"] = sent_count
                            d["is_left"] = True
                        else:
                            d["first_left_sent_id"] = -1
                            d["is_left"] = False

                        if sent_count < max_topic_sents:
                            d["is_topic_sent"] = True
                        else:
                            d["is_topic_sent"] = False

                        topic_data[p_ri] = d
                        topic_info = elem

                elif (
                    isinstance(elem, tuple)
                    and elem[0] is not None
                    and is_skip(elem, true_left_count, topic_filter)
                ):
                    pass

                elif isinstance(elem, tuple) and elem[0] is None:  # if empty slot
                    pass

                if b_break:
                    p_ri += 1
                    b_break = False
                    sent_count = 0
                else:
                    sent_count += 1

            topic_data = topic_data[0:p_ri]

            for d in topic_data:  # delete the topic data.
                if d is not None:
                    del d["topic"]

            is_non_local = not self.isLocalTopic(topic)
            # num_sents_per_topic = self.countSentencesWithTopic(topic)

            vis_data["data"].append(
                {
                    "paragraphs": topic_data,
                    "is_topic_cluster": is_tc,
                    "is_non_local": is_non_local,
                    "topic": list(topic_info[0:3]) if topic_info else None,
                    "sent_count": 0,
                    # "sent_count": num_sents_per_topic,
                }
            )

            vis_data["num_paras"] = p_ri

        # Add missing topic clusters, if any
        tcs = DSDocument.getUserDefinedSynonyms()
        if tcs is not None:
            missing_tcs = list(set(tcs) - set(self.global_topics))
            for tc in missing_tcs:

                topic_info = ["NOUN", "", tc]

                vis_data["data"].append(
                    {
                        "paragraphs": [],
                        "is_topic_cluster": True,
                        "is_non_local": False,
                        "topic": topic_info,
                        "sent_count": 0,
                    }
                )

        return vis_data

    def filterTopics(self, data, nrows, ncols):
        res = {}
        for c in range(1, ncols + 1):  # for each topic

            l_start = -1  # left only
            l_end = -1
            start = -1  # left or right
            end = -1
            given_count = 0
            given_left_count = 0
            given_right_count = 0
            para_count = 0
            # num_paras = 0
            header = data[0][c - 1][1]
            given_left_paras = []
            given_right_paras = []
            # first_new_paras = []

            for r in range(1, nrows):
                elem = data[r][c - 1]

                if isinstance(elem, tuple) and elem[0] is not None:
                    if start < 0:
                        start = r
                    elif start >= 0:
                        end = r

                    if elem[ISLEFT]:
                        if l_start < 0:
                            l_start = r
                        elif l_start >= 0:
                            l_end = r

                        given_left_count += 1
                        given_left_paras.append(para_count)
                    else:
                        given_right_count += 1
                        given_right_paras.append(para_count)

                    given_count += 1

                elif isinstance(elem, int) and elem < 0:
                    para_count += 1

            l_skip_lines = 0
            skip_lines = 0
            sent_count = 0
            for r in range(1, nrows):
                elem = data[r][c - 1]

                if l_start < r < l_end:
                    if isinstance(elem, str) and elem == "heading":
                        l_skip_lines += 1
                    elif isinstance(elem, str) and elem == "title":
                        l_skip_lines += 1
                    elif isinstance(elem, int) and elem < 0:
                        l_skip_lines += 1

                if start < r < end:
                    if isinstance(elem, str) and elem == "heading":
                        skip_lines += 1
                    elif isinstance(elem, str) and elem == "title":
                        skip_lines += 1
                    elif isinstance(elem, int) and elem < 0:
                        skip_lines += 1

                if not isinstance(elem, (str, int)):
                    sent_count += 1

            given_left_paras = list(set(given_left_paras))
            given_right_paras = list(set(given_right_paras))

            is_topic = False
            if len(given_left_paras) > 1:
                is_topic = True
            elif len(given_left_paras) == 1:
                # this topic only appears in one paragraph. Let's see if it appears in
                # another pragraph on the right side...
                if len(set(given_right_paras) - set(given_left_paras)) > 0:
                    # This topic satisfies the min requirement to be a topic.
                    is_topic = True

            # left only
            l_span = max((l_end - l_start + 1) - l_skip_lines, 0)
            norm_l_span = (l_span / sent_count) * 100
            norm_l_coverage = (given_left_count / sent_count) * 100

            # left or right
            span = max(0, (end - start + 1) - skip_lines)
            norm_span = (span / sent_count) * 100
            norm_coverage = (given_count / sent_count) * 100

            res[header] = {
                "type": 0,
                "is_topic": is_topic,
                "left_span": norm_l_span,
                "left_coverage": norm_l_coverage,
                "span": norm_span,  # left+right
                "coverage": norm_coverage,  # left+right
                "count": given_count,
                "left_count": given_left_count,
                "right_count": given_right_count,
                "sent_count": sent_count,
                "para_count": None,
            }

        return res

    def filterParaTopics(self, data, nrows, ncols):
        res = {}
        for c in range(1, ncols + 1):  # for each topic

            p_l_start = -1
            p_l_end = -1
            p_start = -1
            p_end = -1
            given_count = 0
            given_left_count = 0
            given_right_count = 0

            para_count = 0
            given_paras = []
            given_left_paras = []
            given_right_paras = []

            header = data[0][c - 1][1]

            for r in range(1, nrows):

                elem = data[r][c - 1]

                if isinstance(elem, tuple) and elem[0] is not None:
                    if p_start < 0:
                        p_start = para_count
                    elif p_start >= 0:
                        p_end = para_count

                    if elem[ISLEFT]:
                        if p_l_start < 0:
                            p_l_start = para_count
                        elif p_l_start >= 0:
                            p_l_end = para_count

                        given_left_paras.append(para_count)
                        given_left_count += 1
                    else:
                        given_right_paras.append(para_count)
                        given_right_count += 1

                    given_paras.append(para_count)
                    given_count += 1

                elif isinstance(elem, int) and elem < 0:
                    para_count += 1

            para_count -= 1

            p_l_span = p_l_end - p_l_start + 1
            norm_l_span = (p_l_span / para_count) * 100

            p_span = p_end - p_start + 1
            norm_span = (p_span / para_count) * 100

            given_paras = list(set(given_paras))
            given_left_paras = list(set(given_left_paras))
            given_right_paras = list(set(given_right_paras))

            norm_l_coverage = (len(given_left_paras) / para_count) * 100
            norm_coverage = (len(given_paras) / para_count) * 100

            is_topic = False
            if len(given_left_paras) > 1:
                is_topic = True
            elif len(given_left_paras) == 1:
                # this topic only appears in one paragraph. Let's see if it appears in
                # another pragraph on the right side...
                if len(set(given_right_paras) - set(given_left_paras)) > 0:
                    # This topic satisfies the min requirement to be a topic.
                    is_topic = True

            res[header] = {
                "type": 4,
                "is_topic": is_topic,
                "left_span": norm_l_span,
                "left_coverage": norm_l_coverage,
                "span": norm_span,
                "coverage": norm_coverage,
                "count": len(given_paras),
                "left_count": len(given_left_paras),
                "right_count": len(given_right_paras),
                "sent_count": None,
                "para_count": para_count,
            }

        return res

    def filterLocalTopics(self, data, nrows, ncols):

        res = {}
        for c in range(1, ncols + 1):  # for each topic

            start = -1
            end = -1
            given_count = 0
            given_left_count = 0
            # para_count = 0
            first_new_count = 0
            header = data[0][c - 1][1]

            for r in range(1, nrows):
                elem = data[r][c - 1]

                if isinstance(elem, tuple) and elem[0] is not None:
                    # if para_count == para_pos:
                    bSkip = False

                    if not elem[IS_TOPIC]:  # it's not a topic word
                        bSkip = True

                    if bSkip is False:  # it's a topic word
                        if start < 0:
                            start = r
                        elif start >= 0:
                            end = r

                        given_left_count += 1

                        if not elem[ISLEFT]:
                            first_new_count += 1

                    given_count += 1

            if (given_left_count - first_new_count) == 0:
                start = -1
                end = -1

            skip_lines = 0
            sent_count = 0
            # para_count = 0
            for r in range(1, nrows):
                elem = data[r][c - 1]

                if start < r < end:
                    if isinstance(elem, str) and elem == "heading":
                        skip_lines += 1
                    elif isinstance(elem, int) and elem < 0:
                        skip_lines += 1

                if not isinstance(elem, (str, int)):
                    sent_count += 1

            if start >= 0 and end >= 0:
                span = (end - start + 1) - skip_lines
                norm_span = (span / sent_count) * 100
            else:
                span = 0
                norm_span = 0.0

            if sent_count > 0:
                norm_coverage = (given_left_count / sent_count) * 100
            else:
                norm_coverage = 0

            res[header] = {
                "type": 1,
                "span": norm_span,
                "coverage": norm_coverage,
                "count": given_count,
                "left_count": given_left_count,
                "first_new_count": first_new_count,
                "sent_count": sent_count,
                "para_count": None,
                "top": False,
            }

        top_left_count = 0
        for stats in res.values():  # find the top left count
            if stats["left_count"] > top_left_count:
                top_left_count = stats["left_count"]

        for stats in res.values():  # update the 'top' status of each topic.
            if (
                stats["left_count"] == top_left_count
                and stats["left_count"] - stats["first_new_count"] != 0
            ):
                stats["top"] = True

        return res

    def updateGlobalTopics(self, global_data, min_topics=2):
        if global_data is None:
            return []

        data = global_data["data"]

        header = data[0]  # list of tuples (POS, LEMMA, POS, SENT_COUNT, PARA_COUNT)
        self.global_header = (
            header.copy()
        )  # Let's make a copy so that we don't actually change the global data.

        nrows = len(data)
        ncols = len(header)

        self.global_topics = []

        if ncols == 0:
            return []

        topic_filter = TOPIC_FILTER_ALL
        sent_filter = self.filterTopics(data, nrows, ncols)

        # true_left_count = 0
        l_count = 0

        for ci in range(ncols):  # for each colum (word) in a row

            topic = header[ci][1]
            # p_ri = 0
            count = -1

            if topic is not None:
                if not self.isLocalTopic(topic) and not DSDocument.isUserDefinedSynonym(
                    topic
                ):
                    continue

                if DSDocument.isUserDefinedSynonym(topic):
                    # true_left_count = sent_filter[topic]["left_count"]
                    count = sent_filter[topic]["count"]
                    l_count = sent_filter[topic]["left_count"]
                    count = max(count, 2)
                else:
                    # true_left_count = sent_filter[topic]["left_count"]

                    if topic_filter == TOPIC_FILTER_ALL:
                        count = sent_filter[topic]["count"]
                        l_count = sent_filter[topic]["left_count"]
                    else:
                        l_count = sent_filter[topic]["left_count"]
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

            if count < min_topics:
                continue

            self.global_topics.append(topic)

        # find the topic clusters that are not included in self.global_topics.
        # or simply add all the topic clusters and call list(set(...)) so that there
        # no duplicates!!

        tcs = DSDocument.getUserDefinedSynonyms()
        if tcs is not None:
            missing_tcs = list(set(tcs) - set(self.global_topics))
            self.global_topics = self.global_topics + missing_tcs
            count = 0
            for tc in missing_tcs:
                # list of tuples (POS, LEMMA, POS, SENT_COUNT, PARA_COUNT)
                if tc not in [h[1] for h in self.global_header]:
                    self.global_header.append(("NOUN", tc, 10000000 + count, -1, -1))
                    count += 1

        return self.global_topics

    def updateLocalTopics(self):

        def filter_local_topics(data, nrows, ncols):

            res = {}
            for c in range(1, ncols + 1):  # for each topic

                start = -1
                end = -1
                given_count = 0
                given_left_count = 0
                # para_count = 0
                first_new_count = 0
                header = data[0][c - 1][1]

                for r in range(1, nrows):
                    elem = data[r][c - 1]

                    if isinstance(elem, tuple) and elem[0] is not None:
                        # if para_count == para_pos:
                        bSkip = False

                        if not elem[IS_TOPIC]:  # it's not a topic word
                            bSkip = True

                        if bSkip is False:  # it's a topic word
                            if start < 0:
                                start = r
                            elif start >= 0:
                                end = r

                            given_left_count += 1

                            if not elem[ISLEFT]:
                                first_new_count += 1

                        given_count += 1

                if (given_left_count - first_new_count) == 0:
                    start = -1
                    end = -1

                skip_lines = 0
                sent_count = 0
                # para_count = 0
                for r in range(1, nrows):
                    elem = data[r][c - 1]

                    if start < r < end:
                        if isinstance(elem, str) and elem == "heading":
                            skip_lines += 1
                        elif isinstance(elem, int) and elem < 0:
                            skip_lines += 1

                    if not isinstance(elem, (str, int)):
                        sent_count += 1

                if start >= 0 and end >= 0:
                    span = (end - start + 1) - skip_lines
                    norm_span = (span / sent_count) * 100
                else:
                    span = 0
                    norm_span = 0.0

                if sent_count > 0:
                    norm_coverage = (given_left_count / sent_count) * 100
                else:
                    norm_coverage = 0

                res[header] = {
                    "type": 1,
                    "span": norm_span,
                    "coverage": norm_coverage,
                    "count": given_count,
                    "left_count": given_left_count,
                    "first_new_count": first_new_count,
                    "sent_count": sent_count,
                    "para_count": None,
                    "top": False,
                }

            top_left_count = 0
            for stats in res.values():  # find the top left count
                if stats["left_count"] > top_left_count:
                    top_left_count = stats["left_count"]

            for stats in res.values():  # update the 'top' status of each topic.
                if (
                    stats["left_count"] == top_left_count
                    and stats["left_count"] - stats["first_new_count"] != 0
                ):
                    stats["top"] = True

            return res

        def get_local_topics(local_data, min_topics=2):
            data = local_data

            topic_filter = TOPIC_FILTER_LEFT_RIGHT
            header = data[0]
            nrows = len(data)
            ncols = len(header)

            if ncols == 0:
                return []

            sent_filter = filter_local_topics(data, nrows, ncols)

            # true_left_count = 0
            l_count = 0
            self.local_topics = []

            for ci in range(ncols):

                topic = header[ci][1]
                count = -1

                if topic is not None:
                    # true_left_count = sent_filter[topic]["left_count"]

                    if topic_filter == TOPIC_FILTER_ALL:
                        count = sent_filter[topic]["count"]
                        l_count = sent_filter[topic]["left_count"]
                    else:
                        l_count = sent_filter[topic]["left_count"]
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

                if count < min_topics:
                    continue

                is_global = False
                if topic in self.global_topics:
                    is_global = True

                self.local_topics.append((topic, is_global))

            return self.local_topics

        num_paragraphs = self.getNumParagraphs()
        all_local_topics = []
        self.local_topics_dict = {}

        for i in range(num_paragraphs):
            local_data = self.getLocalTopicalProgData([i])
            local_topics = get_local_topics(local_data)
            all_local_topics += local_topics

            self.local_topics_dict[i] = local_topics

        return list(set(all_local_topics))

    def isLocalTopic(self, topic):
        """
        Returns True if <topic> is a local topic.
        """
        if self.local_topics_dict is not None:
            for _, value in self.local_topics_dict.items():  # for each paragraph
                local_topics = [
                    t[0] for t in value
                ]  # make a list of lemma/topic strings
                if topic in local_topics:  # if <topic> is in it, return True
                    return True
        return False

    def getCurrentTopics(self):

        topics = self.global_topics
        if self.local_topics_dict is not None:
            for _, value in self.local_topics_dict.items():
                local_topics = [
                    t[0] for t in value
                ]  # make a list of lemma/topic strings
                topics += local_topics

        topics = list(set(topics))

        return topics

    # def countSentencesWithTopic(self, topic):
    #     """
    #     Given a topic <string>, this method returns the toal number of sentences
    #     that includes the topic.
    #     """
    #     locations = self.topic_location_dict.get(topic, None) \
    #         if self.topic_location_dict is not None else None

    #     temp = []
    #     topic_positions = locations.getTopicPositions() if locations is not None else []
    #     for t in topic_positions:
    #         if t[:2] not in temp:
    #             temp.append(t[:2])

    #     count = len(temp)
    #     return count

    # def locateTopics(self, topics):
    #     """
    #     Given a set of topics, this method locates the topics in a current document,
    #     and update self.topic_location_dict.
    #     """

    #     def locateATopic(topic):
    #         """
    #         This method is called by locateTopics(), and should not
    #         """

    #         if self.sections is None:
    #             return "Error in locateATopic()"
    #         try:
    #             data = self.sections[self.current_section]["data"]  ### TODO!!!
    #             if data is None:
    #                 raise ValueError
    #         except:
    #             return None

    #         adj_stats = AdjacencyStats(topic=topic, controller=self.controller)
    #         topic_filter = TOPIC_FILTER_LEFT_RIGHT

    #         # Let's find which paragraphs/sentences the selected 'topic' is included.
    #         for pcount, para in enumerate(data["paragraphs"], start=1):
    #             for scount, sent in enumerate(para["sentences"], start=1):
    #                 for wcount, w in enumerate(sent["text_w_info"]):
    #                     if w[LEMMA] == topic and (w[POS] == "NOUN" or w[POS] == "PRP"):
    #                         if (
    #                             topic_filter == TOPIC_FILTER_LEFT and not w[ISLEFT]
    #                         ):  ## NEW 3/2/21
    #                             pass
    #                         else:
    #                             adj_stats.addParagraphID(pcount)
    #                             adj_stats.addSentenceID(pcount, scount)
    #                             adj_stats.addTopicPosition(pcount, scount, wcount)

    #         return adj_stats

    #     if topics is None or topics == []:
    #         self.topic_location_dict = None
    #         return None

    #     self.topic_location_dict = {}
    #     for topic in topics:
    #         self.topic_location_dict[topic] = locateATopic(topic)

    def getHtmlSents(self, data):
        """
        This method returns a list that contains a set of lists. Each contains a set of sentences
        in HTML formatted for the Clarity panel.
        """

        def generate_html(sent_data):

            if isinstance(sent_data, str) and sent_data == "\n":
                return ""

            analysis = sent_data[2]
            np_positions = (
                [Position(np["start"], np["end"]) for np in analysis["NOUN_CHUNKS"]]
                if isinstance(analysis, dict)
                else []
            )
            is_be_verb = analysis["BE_VERB"] if isinstance(analysis, dict) else False

            def getNPTag(wpos: int, positions: list[Position]):
                for pos in positions:
                    if wpos == pos.start:
                        # if is_be_verb:
                        #     return '<b class="topic-text">'
                        # else:
                        return '<b class="topic-text">'

                    if wpos == pos.end:
                        return "</b>"
                return ""

            html_str = '<p class="non-topic-text">'

            if is_be_verb:
                verb_class = "be-verb"
            else:
                verb_class = "active-verb"

            tokens = analysis["TOKENS"] if isinstance(analysis, dict) else []

            for wpos, token in enumerate(tokens):
                w = token["text"]
                tag = getNPTag(wpos, np_positions)

                if tag.startswith("</b>") and html_str[-1] == " ":
                    # if tag is a closing tag, no space before it.
                    html_str = html_str[:-1]

                if (
                    w in right_quotes
                    or w in end_puncts
                    or w == "%"
                    or w in no_space_patterns
                ):
                    if html_str[-1] == " ":
                        # w shouldn't have a space before it.
                        html_str = html_str[:-1]

                html_str += tag

                if tag.startswith("</b>"):
                    if (
                        w not in right_quotes
                        and w not in end_puncts
                        and w != "%"
                        and w not in no_space_patterns
                    ):
                        html_str += " "

                if token["is_root"]:
                    html_str += f'<span class="{verb_class}">{w}</span>'
                else:
                    html_str += f"{w}"

                if w not in left_quotes and w not in hyphen_slash:
                    html_str += " "

            html_str += "</p>"

            return html_str

        res = []
        # first_word_pos = 0
        # first_sent = True
        sent_pos = 0
        para_count = 1
        html_strs = []

        for sent_data in data:

            if isinstance(sent_data[0], str) and sent_data[0] == "\n":
                if para_count != 1:
                    res.append(html_strs)
                para_count += 1
                html_strs = []

            # elif not isinstance(sent_data[0], str) and first_sent:
            #     sent_dict = sent_data[3]

            # w = sent_dict["text_w_info"][0]  # get the first word
            # first_word_pos = w[WORD_POS]

            s = generate_html(sent_data)

            if s != "<p></p>":
                html_strs.append(s)

            if (
                isinstance(sent_data[0], str) and sent_data[0] == "\n"
            ):  # paragraph break
                # first_sent = True
                sent_pos = 0
            else:
                # first_sent = False
                sent_pos += 1

        return res

    def generateCSVString(self, vis_data):
        """Generate a CSV string from the visualization data."""
        if vis_data["data"] == []:
            logging.error("No global topics")
            return ""

        data = vis_data["data"]
        num_paras = vis_data["num_paras"]
        # num_topics = vis_data["num_topics"]

        csv_str = ""

        # Print paragraph IDs
        line = ",".join(["Topics"] + [f"{i}" for i in range(1, num_paras + 1)] + ["\n"])
        csv_str += line

        # For each data for a specific topic,
        for topic_data in data:
            topic = topic_data["topic"]
            lemma = topic[LEMMA]
            is_topic_cluster = topic_data["is_topic_cluster"]
            # is_non_local = topic_data["is_non_local"]

            # if the paragraph data is not empty OR if the topic is a topic cluster
            if topic_data["paragraphs"] != [] or is_topic_cluster:

                # header section
                line = f"{lemma},"

                # Write a symbol for each paragraph.
                # L = 'topic' appears on the left side of the main verb at least once.
                # l = a topic cluster that is not a global topic.
                # R = 'topic' appears on the right side of the main verb.
                # r = a topic cluster that is not a global topic.
                # * = topic sentence.
                for para_data in topic_data["paragraphs"]:
                    if para_data is not None:
                        # para_pos = para_data["para_pos"]
                        is_left = para_data["is_left"]
                        is_topic_sent = para_data["is_topic_sent"]

                        if is_left:  # is 'topic' on the left side?
                            c = "L"
                            if is_topic_sent:  # is 'topic' appear in a topic sentence?
                                line += c + "*"
                            else:
                                line += c
                        else:
                            c = "R"

                            if is_topic_sent:
                                line += f"{c}*"
                            else:
                                line += c

                        line += ","

                    else:
                        line += ","

                line += "\n"

                csv_str += line

        return csv_str

    # def getSentenceIDs(self, sentences, fuzzy=True):

    #     def is_overlapping_fuzzy(text, _sentences):
    #         threshold = 80
    #         for s in _sentences:
    #             if utils.fuzzy_cmpstr(
    #                 s, text, threshold
    #             ):  # approximate string comparison
    #                 return True
    #         return False

    #     def is_overlapping(text, _sentences):

    #         clean_text = text.replace("\u2019", "'").replace("\u2018", "'")
    #         clean_text = (
    #             clean_text.replace("\u201c", "'").replace("\u201d", "'").lower()
    #         )

    #         for s in _sentences:
    #             clean_s = s.replace("\u2019", "'").replace("\u2018", "'")
    #             clean_s = clean_s.replace("\u201c", "'").replace("\u201d", "'").lower()
    #             if clean_s in clean_text:
    #                 return True
    #             elif (
    #                 len(clean_text.split()) / len(clean_s.split()) > 0.8
    #                 and clean_text in clean_s
    #             ):
    #                 return True

    #         return False

    #     if self.sections:
    #         data = self.data

    #         sent_list = []
    #         pcount = 1
    #         for para in data["paragraphs"]:  # for each paragraph

    #             # we will skip headings
    #             if para.get("style", "") in [
    #                 "Heading 1",
    #                 "Heading 2",
    #                 "Heading 3",
    #                 "Heading 4",
    #                 "Title",
    #             ]:
    #                 pcount += 1
    #                 continue

    #             scount = 1
    #             for sent in para["sentences"]:  # for each sentence

    #                 if fuzzy:
    #                     if is_overlapping_fuzzy(sent["text"], sentences):
    #                         sent_list.append((pcount, scount, -1))
    #                     else:
    #                         if is_overlapping(sent["text"], sentences):
    #                             sent_list.append((pcount, scount, -1))
    #                 else:
    #                     if is_overlapping(sent["text"], sentences):
    #                         sent_list.append((pcount, scount, -1))

    #                 scount += 1
    #             pcount += 1

    #         if sent_list:
    #             return sent_list
    #         else:
    #             return []
    #     else:
    #         logging.error("    self.sections is None!!!!...")
