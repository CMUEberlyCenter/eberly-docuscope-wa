#!/usr/bin/env pyhtmlhon
# -*- coding: utf-8 -*-

"""
"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-21 Suguru Ishizaki, Carnegie Mellon University"

# import logging
# logger = logging.getLogger(__name__)

from time import time
import json
import re
import regex
import string
import os
import sys
from collections import Counter 

import bs4
from bs4 import BeautifulSoup as bs  

import dslib.utils as utils
import dslib.views as views
from dslib.utils import resource_path

from docx import Document
from docx.shared import RGBColor
from docx.enum.text import WD_COLOR_INDEX
from docx.enum.text import WD_UNDERLINE
from docx.shared import Pt

from spacy.lang.en.stop_words import STOP_WORDS
stop_words = list(STOP_WORDS)
stop_words += ['therefore', 'however', 'thus', 'hence', '\'s', 'mr.', 'mrs.', 'ms.', 'dr.', 'prof.']
pronouns = ['it',  'i',    'we',   'you',   'he',  'she',  'they',
            'its'  'my',   'our',  'your',  'his', 'her',  'their',
                   'me',   'us',            'him',         'them',
                   'mine', 'ours', 'yours',        'hers', 'theirs']

for p in pronouns:
    if p in stop_words:
        stop_words.remove(p)


# used by toDocxText() and toDocxPara()
no_space_patterns = ["\u2019ve", "n\u2019t", ".\u201D", ".\u2019",
                     "\u2019s", "\u2019t", "\u2019m", "\u2019ll", "\u2019re", "\u2019d", 
                     "\'ve" ,"n\'t", ".\"", ".\'",
                     "\'s", "\'t", "\'m", "\'ll", "\'re", "\'d",
                     "%"] # , ":", ";", "?", "!", ".", ","]

                    # note: use a single quote for apostorophes

left_quotes  = ['\u201C', '\u2018', '(', '[', '$', '\"', '\''] 
right_quotes = ['\u201D', '\u2019', ')', ']']

dashes       = ['\u2014', '\u2013', '\u2015']  # em dash, en dash, horizontal bar
hyphen_slash = ['-', '/',]  # hyphen, slash,

ellipsis     = '\u2026'

end_puncts   = ['.', ',', ';', ':', '?', '!']

be_verbs = ['be', 'been', 'am', 'is', 'are', 'was', 'were', '\'m', '\'re', '\'s', "\u2019s", "\u2019m", "\u2019re"]

import spacy                                   # SpaCy NLP library
# from spacy.attrs import ORTH, LEMMA, POS

# POS dependency labels (see: https://spacy.io/api/annotation)

NLP_MODEL_DEFAULT = 0
NLP_MODEL_LARGE   = 1

TOPIC_FILTER_LEFT       = 0     # LEFT
TOPIC_FILTER_LEFT_RIGHT = 1     # LEFT + RIGHT
TOPIC_FILTER_ALL        = 2     # ALL

TOPIC_SORT_APPEARANCE   = 0
TOPIC_SORT_LEFT_COUNT   = 1

import pprint                                  # pretty prnting for debugging
pp = pprint.PrettyPrinter(indent=4)            # create a pretty printing object used for debugging.

TEXT_COLOR      = RGBColor( 64,  64,  64)
TEXT_VERB_COLOR = RGBColor(  0, 188, 242)
TEXT_NP_VCOLOR  = RGBColor(125,   0, 125)

#
# Constants for sentence['text_w_info']. Each word is represented using a tuple with
# the following elements. 
# TODO: Create a class to represent this. The indexes have grown too long.
#
POS      = 0          # Part of Speech
WORD     = 1          # Original Word
LEMMA    = 2          # Lemmatized word
ISLEFT   = 3          # True if the word is on the left side of the main verb
SUBJ     = 3          # True if the word is on the left side of the main verb (SUBJ = ISLEFT) same thing!!
DEP      = 4          # Dependency Type (e.g., 'pobj', 'nsubj', etc.)
STEM     = 5          # Stem of the word
LINKS    = 6          # If it is a verb, it is the total # of links from the verb. Otherwise, None.
QUOTE    = 7          # QUOTED or not
WORD_POS = 8          # Indexes between 8 and 13 have been changed on July 17.
DS_DATA  = 9          # DocuScope Data (i.e., models.DSWord)
PARA_POS = 10 #  9          
SENT_POS = 11 # 10
NEW      = 12 # 11
GIVEN    = 13 # 12
IS_SKIP  = 14 # 13
IS_TOPIC = 15 # 14


IGNORE_ADVCL_FIRST_WORDS = ['after', 'before', 'until', 'soon', 'once', 'now',
                            'during', 'while', 'when', 'whenever',
                            'if', 'whether', 'provided', 'in', 'unless', 'even',
                            'because', 'as', 'since', 'so', 'isasmuch',
                            'where', 'although', 'though',
                            'thanks', 'based', 'to', 'based']

import dslib.models.stat as ds_stat

nlp = None

##
# https://spacy.io/api/top-level#spacy.info
##
def setLanguageModel(lang, model=NLP_MODEL_DEFAULT):
    print("setLanguageModel ()")

    global nlp

    try:
        if lang == 'en':
            if model == NLP_MODEL_DEFAULT:
                print("Loading Spacy default model ...")
                nlp = spacy.load(resource_path('data/default_model'))
                #result=nlp("I am applying for the Graduate Assistant position at Crane & Jenkins University.");
                #print("\n\n")
                #print(result)
            else:
                print("Loading Spacy large model ...")
                nlp = spacy.load(resource_path('data/large_model'))
    except Exception as e:
        print(e)
    else:
        print("Spacy language model loaded successfully")
        print (spacy.info())
##
#
##
def isModelLoaded():
    if nlp is not None:
        return True
    else:
        return False

##
#
##
def removeQuotedSlashes(s):
    if s.find('“') > 0 and s.find('”') > 0:
        pattern = r'\s\/\s'
        res = regex.sub(pattern, ' ', s)
        return res
    elif s.count('\"') == 2:
        pattern = r'\s\/\s'
        res = regex.sub(pattern, ' ', s)
        return res
    else:
        return s

##
#
##
def adjustSpaces(text):
    """
    This function takes a string, often directly read from a file, and cleans up the string for parsing.
    """

    text = text.strip()                         # trim

    text = utils.remove_hrefs(text)

    # Just in case a period is found in front of a word (e.g, ".And")  This handles
    # a case where 4 dot ellipses is used (3 dot ellipses followed by a period
    # followed by no space.) 
    text = re.sub(u'\.([a-zA-Z]+)(?!\.)', r'. \1', text)

    # If there is a comma followed by a character (i.e., missing a sapce), add a space.
    text = re.sub(',(=?[a-zA-Z])',  r', \1', text)

    # replace the space character(s) in multiword patterns with underscor character "_"
    for mw_topic in DSDocument.multiword_topics: 
        connected_mw_topic = mw_topic.replace(' ', '_')
        text = text.replace(mw_topic, connected_mw_topic)
        text = text.replace(mw_topic.lower(), connected_mw_topic.lower())
        text = text.replace(mw_topic.title(), connected_mw_topic.title())
        text = text.replace(mw_topic.capitalize(), connected_mw_topic.capitalize())

    text = text.replace(u'\u200b', '')             # remove the zero width space
    text = text.replace(u'\t', u' ')               # sorry. we don't do tabs. replace it with a space.
    text = text.replace(u'\xa0', u' ')             # replace non-breaking spaces with a regular space.
    text = text.replace(u'\u2013', u' \u2014 ')    # replace en-dashes with em-dashes.
                                                   # not the best way to deal with en-dashes, though.

    text = text.replace(u' cannot ', u' can not ')   # replace cannot with can not.
    text = text.replace(u' cannot, ', u' can not, ') # replace cannot with can not.
    
    text = text.replace(u'\u2014', u' \u2014 ')    # always add a space before/after an em-dash
    text = text.replace(u'--', u' \u2014 ')        # replace double dashes with an em-dash.

    text = text.replace(u'/ ', u' ')               # a slash followed by a space is replaced by a space

    text = text.replace(u' )', u')')               # remove a space followed by a close parentesis
    text = text.replace(u'( ', u'(')               # remove a space followed by a close parentesis

    text = text.replace(u'. . .', u' \u2026')      # convert the MLA style ellipsis to an ellipsis character
    text = text.replace(u'...', u' \u2026')        # convert 3 dots to an ellipsis character

    text = text.replace(u'??', u'?').replace(u'??', u'?')    # double/triple punctuations are not allowed
    text = text.replace(u'!!', u'!').replace(u'!!', u'!')    # double/triple punctuations are not allowed
    text = text.replace(u',,', u',').replace(u',,', u',')    # double/triple punctuations are not allowed

    text = utils.inchesToDoubleQuotes(text)          # convert inch characters (") to curly double-quotes.
    text = removeQuotedSlashes(text)    

    text = text.replace(u'  ', u' ').replace(u'  ', u' ').replace(u'  ', u' ') # remove extra spaces

    return text

def is_skip(elem, left_count, topic_filter):

    # if theme_only == True:                 
    if topic_filter == TOPIC_FILTER_LEFT:

        # if the left only mode is on
        if elem[IS_TOPIC] == False:
            # skip, if it is not a topic word
            return True # skip  

        elif left_count < 1 and elem[ISLEFT] == False:
            # skip if it's a right-side word and left_count < 1 (==0)
            return True # skip

        else:
            return False            # otherwise, it's not a skip word.
    else:
        return False

class DSWord():
    def __init__(self, w, lw, end, lat, pos):

        # strip double quoted numbers 
        x = re.search('(?<=\")[0-9,.]+(?=\")', w)
        if x:
            self.word  = x.group()   # original word
        else:
            self.word = w

        x = re.search('(?<=\")[0-9,.]+(?=\")', lw)
        if x:
            self.lword = x.group()   # lower-case word
        else:
            self.lword = lw

        self.end   = end
        self.lat   = lat
        self.pos   = pos

    def getWord(self):
        return self.word

    def getLower(self):
        return self.lword

    def getEnd(self):
        return self.end

    def getLAT(self):
        return self.lat

    def getPos(self):
        return self.pos

class AdjacencyStats():
    """
    The AdjacencyStats object is used to reprsent the stats for 
    for each paragraph (or any unit).
    """

    def __init__(self, topic="", controller=None):
        self.topic           = topic
        self.controller      = controller
        self.topic_paras     = list()
        self.topic_sents     = list()
        self.topic_positions = list()

        self.clust_counter   = Counter()
        self.dim_counter     = Counter()
        self.lat_counter     = Counter()

        self.para_stats      = dict()
        self.sent_stats      = dict()

    def getTopic(self):
        return self.topic

    def addParagraphID(self, p_id):
        if p_id not in self.topic_paras:
            self.topic_paras.append(p_id)

    def addSentenceID(self, p_id, s_id):
        if (p_id, s_id) not in self.topic_sents:
            self.topic_sents.append((p_id, s_id))

    def addTopicPosition(self, p_id, s_id, t_pos):
        if (p_id, s_id, t_pos) not in self.topic_positions:
            self.topic_positions.append((p_id, s_id, t_pos))

    def addLAT(self, lat, p_id, s_id):

        if lat == 'UNRECOGNIZED' or lat == '':
            return

        dim, clust = self.controller.getDimensionAndCluster(lat)  

        if clust is None or dim is None:
            return

        self.clust_counter[clust] += 1
        self.dim_counter[dim]     += 1
        self.lat_counter[lat]     += 1

        stat = self.para_stats.get(p_id, None)
        if stat is None:
            stat = ds_stat.DSStat()
            self.para_stats[p_id] = stat

        stat.addCategory(clust, dim, lat)

        # Keep track of the sentence level statistics
        sent_stat = self.sent_stats.get((p_id, s_id), None)
        if sent_stat is None:
            sent_stat = ds_stat.DSStat()
            self.sent_stats[(p_id, s_id)] = sent_stat
        sent_stat.addCategory(clust, dim, lat)

    def setText(self, text, p_id):
        stats = self.para_stats.get(p_id, None)
        if stats is not None:
            stats.setText(text)

    def getParaClusterCount(self, clust, p_id):
        stats = self.para_stats.get(p_id, None)
        if stats is None:
            return None
        else:
            res = stats.getClusterCount(clust)
            if res == None:
                return 0
            else:
                return res

    def getParaClusterFreq(self, clust, p_id, method=ds_stat.DSStat.DOC):
        stats = self.para_stats.get(p_id, None)
        if stats is None:
            return None
        else:
            res = stats.getClusterFreq(clust, method=method)
            if res == None:
                return 0
            else:
                return res

    def getParaDimensionCount(self, dimension, p_id):
        stats = self.para_stats.get(p_id, None)
        if stats is None:
            return None
        else:
            res = stats.getDimensionCount(dimension)
            if res == None:
                return 0
            else:
                return res

    def getParaDimensionFreq(self, dimension, p_id, method=ds_stat.DSStat.DOC):
        stats = self.para_stats.get(p_id, None)

        if stats is None:
            return None
        else:
            res = stats.getDimensionFreq(dimension, method=method)
            if res == None:
                return 0
            else:
                return res

    def getParaStats(self):
        return self.para_stats

    def getSentStats(self):
        return self.sent_stats

    def getStats(self, p_id):

        if p_id == -1:
            return self.clust_counter, self.dim_counter, self.lat_counter
        else:
            clust_counter = Counter()
            for clust in self.clust_counter.keys():
                clust_c = self.getParaClusterCount(clust, p_id)
                if clust_c is not None:
                    clust_counter[clust] = clust_c

            dim_counter = Counter()
            for dim in self.dim_counter.keys():
                dim_c = self.getParaClusterCount(dim, p_id)
                if dim_c is not None:
                    dim_counter[clust] = dim_c

            lat_counter = Counter()
            for lat in self.lat_counter.keys():
                lat_c = self.getParaClusterCount(lat, p_id)
                if lat_c is not None:
                    lat_counter[lat] = lat_c

            return clust_counter, dim_counter, lat_counter

    # def getParaSentIDs(self):
        # return self.topic_paras, self.topic_sents

    def getTopicPositions(self):
        return self.topic_positions

    def getParaSentIDs(self, clust_filter=None):
        if clust_filter is None:
            return self.topic_paras, self.topic_sents
        else:
            new_topic_paras = list()
            new_topic_sents = list()
            for key in self.topic_sents:   # key = tuple like (para_id, sent_id)

                stat = self.sent_stats.get(key, None)
                if stat is not None:
                    cluster_count = stat.getClusterCount(clust_filter)
                    if cluster_count is not None and cluster_count > 0:
                        new_topic_sents.append(key)
                        new_topic_paras.append(key[0])

            new_topic_paras = list(set(new_topic_paras))

            return new_topic_paras, new_topic_sents

    def isTopicSent(self, sent_id, para_id):
        if (para_id, sent_id) in self.topic_sents:
            return True
        else:
            return False

    def isTopicPara(self, para_id):
        if para_id in self.topic_paras:
            return True
        else:
            return False            

    def print(self):
        print("AdjacencyStats:")
        print("topic =", self.topic)
        pp.pprint(self.clust_counter)
        pp.pprint(self.dim_counter)
        pp.pprint(self.lat_counter)
        print(self.topic_paras)
        print(self.topic_sents)
        print("-------------------------------")


SUBJECTS = ["nsubj", "nsubjpass", "csubj", "csubjpass", "agent", "expl"]

class DSDocument():
    """
    This class is used to holds the textual data.
    """

    ##########################################
    # Class variables/methods
    ##########################################

    noun_subject_options     = ["nsubj", "nsubjpass", "csubj", "csubjpass", "expl", "agent"]

    multiword_topics         = []
    deleted_multiword_topics = []

    user_defined_synonyms    = None   # it's a dictionary

    user_defined_topics      = []

    @classmethod
    def setNounSubjectOptions(cls, options):
        DSDocument.noun_subject_options = options

    @classmethod
    def setUserDefinedSynonyms(cls, synsets):
        # convert a list of synonyms into a dictionary for faster look up
        if synsets == [] or synsets == None:
            DSDocument.user_defined_synonyms = None
            return

        DSDocument.user_defined_synonyms = dict()
        DSDocument.user_defined_synonym_names = list()
        undefined_count = 0

        for synset in synsets:
            lemma = synset.getLemma_()
            synonyms = synset.getSynonyms()

            for synonym in synonyms:
                s = synonym.replace(' ', '_')

                DSDocument.user_defined_synonyms[s] = lemma
                DSDocument.user_defined_synonyms[s.lower()] = lemma
                DSDocument.user_defined_synonyms[s.capitalize()] = lemma
                DSDocument.user_defined_synonyms[s.title()] = lemma

            if synonyms == []:
                key = "undefined_{}"
                DSDocument.user_defined_synonyms[key] = lemma   # undefined synonym
                undefined_count+=1

            DSDocument.user_defined_synonym_names.append(lemma)

    @classmethod
    def isUserDefinedSynonym(cls, lemma):
        if DSDocument.user_defined_synonyms is not None and lemma in DSDocument.user_defined_synonym_names:
            return True
        else:
            return False

    @classmethod
    def isUserDefinedSynonymDefined(cls, lemma):
        if DSDocument.user_defined_synonyms is not None and lemma in DSDocument.user_defined_synonym_names:
            for synonym, name in DSDocument.user_defined_synonyms.items():
                if name == lemma:
                    if synonym.startswith('undefined_'):
                        return False
                    else:
                        return True
            return False                        
        else:
            return False            

    @classmethod
    def setMultiwordTopics(cls, topics):
        if topics is None:
            DSDocument.multiword_topics = []
            DSDocument.deleted_multiword_topics = []            
        else:
            topics.sort(reverse=True, key=lambda x: len(x.split()))
            DSDocument.deleted_multiword_topics = list(set(DSDocument.multiword_topics) - set(topics))
            DSDocument.multiword_topics = topics

    @classmethod
    def setUserDefinedTopics(cls, topics):
        DSDocument.user_defined_topics = [t.lower().replace(' ', '_') for t in topics]

    @classmethod
    def isUserDefinedTopic(cls, lemma):
        if lemma in DSDocument.user_defined_topics:
            return True
        else:
            return False

    @classmethod
    def addUserDefinedTopic(cls, topic):
        if topic is not None and topic != '':
            lc_topic = topic.lower()
            if lc_topic not in DSDocument.user_defined_topics:
                DSDocument.user_defined_topics.append(lc_topic)

    @classmethod
    def deleteUserDefinedTopic(cls, topic_to_delete):
        if topic_to_delete in DSDocument.user_defined_topics.remove:
            DSDocument.user_defined_topics.remove(topic_to_delete)

    @classmethod
    def clearUserDefinedTopics(cls):
        DSDocument.user_defined_topics = []

    @classmethod
    def getUserDefinedTopics(cls):
        return DSDocument.user_defined_topics

    @classmethod
    def getUserDefinedSynonyms(cls):
        return DSDocument.user_defined_synonyms


    ##########################################
    # Instance methods
    ##########################################

    def __init__(self):

        self.controller = None
        self.dictionary = None

        # Data & Stats
        self.stats    = None         # Stats (dictionary)
        self.sections = None         # Document Data
        self.current_section = 0

        self.filename = None
        self.header_labels = []

        # Visualizer options                                
        self.noun = True                   
        self.verb = False
        self.adj  = False     
        self.adv  = False
        self.prp  = False

        self.max_paras        = 100
        self.skip_paras       = 0
        
        self.is_collapsed         = True

        self.total_words          = 0

        self.vis_mode             = views.VISMODE_ORGANIZATION    # for now, this is the only vis mode.
        self.para_accum_mode      = True
        self.sent_accum_mode      = True

        self.selectedTopic        = (None, None)
        self.selectedTopicCluster = []
        self.keyTopics            = []

        self.keyParaTopics        = []
        self.keySentTopics        = []

        self.selectedSent         = -1
        self.selectedWord         = None
        self.showKeyTopics        = False
        self.showKeySentTopics    = False
        
        self.selected_sent_info   = None

        self.bQuote = False        # temp variable

        self.progress_callback = None

        # variables used by the methods for the online version of write & audit
        self.local_topics_dict = None
        self.global_header           = []
        self.local_header            = []
        self.global_topics           = []
        self.local_topics            = []        

    def setController(self, c):
        self.controller = c

    def setDictionary(self, d):
        self.dictionary = d

    def setProgressCallback(self, cb_func):
        self.progress_callback = cb_func

    def clearData(self):
        self.sections = None

    def setFilters(self, vis_mode, max_paras, skip_paras):
        """
        Update the visualizer options.
        """
        self.verb             = False
        self.noun             = True
        self.adj              = False     
        self.adv              = False
        # self.prp              = False # pronouns

        self.vis_mode         = vis_mode

        self.para_accum_mode  = True
        self.sent_accum_mode  = True

        self.max_paras        = max_paras
        self.skip_paras       = skip_paras


    ########################################
    #
    # Setting Methods
    #
    ########################################

    def setHeaderLabels(self, val):
        self.header_labels = val

    def getHeaderLabels(self, val):
        return self.header_labels

    def setSection(self, val):
        self.current_section = val

    # def setTopicFilter(self, option):
    #     self.topic_filter = option

    # def getTopicFilter(self):
    #     return self.topic_filter

    # def setThemeOnly(self, val):
    #     self.theme_only = val

    # def getThemeOnly(self):
    #     return self.theme_only

    # def setVerbHighlight(self, val):
        # self.show_root = val

    def setPronounsVisible(self, val):
        self.prp = val

    # def setSentViewFilters(self, nps, emphasis):
    #     self.sent_show_nps = nps
    #     self.sent_show_emphasis = emphasis

    def setUserTopics(self, user_topics):
        res = []
        doc = nlp(user_topics)
        for t in doc:
            res.append(t.lemma_)
        self.userTopics = res

    def setKeySentTopics(self, keytopics):
        self.keySentTopics = keytopics

    # def setKeyTopicsFirstSent(self, keytopics):
        # self.keyTopicsFirstSent = keytopics

    def setKeyParaTopics(self, keytopics):
        self.keyParaTopics = keytopics
        self.keyTopics     = keytopics

    def setSelectedTopic(self, topic):
        if topic is not None:
            self.selectedTopic = topic
        else:
            self.selectedTopic = (None,None)

    def setSelectedTopicCluster(self, topic_cluster):
        if topic_cluster is not None:
            self.selectedTopicCluster = topic_cluster
        else:
            self.selectedTopicCluster = []

    def setTextWrap(self, val):
        self.text_wrap_mode = val

    def setSelectedSentence(self, sent_id):
        if sent_id < 0:
            self.selectedSent = None
        else:
            self.selectedSent = sent_id
            
    def setSelectedWord(self, selected_word):
        self.selectedWord = selected_word    # word is a tuple = elem
        
    # def setSynonymThreshold(self, val):
        # self.synonym_threshold = val

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
    def userTopicsDefined(self):
        if len(self.userTopics) > 0:
            return True
        else:
            return False
        
    def isUserTopic(self, topic):
        if len(topic) == 0:
            return True
        if topic in self.userTopics:
            return True
        else:
            return False

    def isSelectedTopic(self, lemma):
        for w in self.selectedTopic[1:]:
            if w == lemma:
                return True
        return False

    def isPronounsVisible(self):

        return self.prp

    def isPOSVisible(self, pos):
        """
        Given a POS tag, returns a WordNet POS tag (one of 4 tags), or None.
        """
        if pos.startswith("NOUN") or pos.startswith("PROPN"):
            # res = self.noun
            return self.noun
        elif pos.startswith("VERB"):
            # res = self.verb
            return self.verb
        elif pos.startswith("ADJ"):
            # res = self.adj
            return self.adj
        elif pos.startswith("ADV"):
            # res = self.adv    
            return self.adv
        elif pos.startswith("PRP"):
            # res = self.prp      # pronoun, personal
            return self.prp
        elif pos.startswith("PRON"):
            res = True

        return False

    ########################################
    #
    # Get Methods
    #
    ########################################

    def getCurrentSection(self):
        if self.sections is not None and self.current_section < len(self.sections):
            return self.sections[self.current_section]
        else:
            return None            

    def getSections(self):
        if self.sections is not None:
            return self.sections
        else:
            return []

    def getSectionAt(self, i):
        if self.sections is not None and i < len(self.sections):
            return self.sections[i]
        else:
            return None

    def getCurrentTagDicts(self):
        section = self.getCurrentSection()
        if section is not None:
            return section.get('tag_dicts', None)
        else:
            return None

    def getWordCount(self):
        section = self.getCurrentSection()
        if section is not None:
            return section.get('num_tokens', None)
        else:
            return None

    def getParagraphs(self):
        data = self.sections[self.current_section]['data']
        return data['paragraphs']
        
    def getRealParaCount(self):
        data = self.sections[self.current_section]['data']
        return data['real_para_count']

    def getParaCount(self):
        data = self.sections[self.current_section]['data']
        return len(data['paragraphs'])

    def getSentCount(self):
        data = self.sections[self.current_section]['data']
        sent_count = 0
        for p in data['paragraphs']:
            sent_count += len(p['sentences'])
        return sent_count 

    def getSentCounts(self):
        res = list()
        data = self.sections[self.current_section]['data']
        num_paras = len(data['paragraphs'])
        for i in range(num_paras):
            p = data['paragraphs'][i]
            num_sents = len(p['sentences'])
            res.append(num_sents)
        return res

    def getParaMenuItems(self, num_words=5):
        """
        Create a list of menu labels for the paragraphs in the text. 
        The first 'num_words' words from each paragraph are used for the label.
        """
        res = list()
        pcount = 1
        data = self.sections[self.current_section]['data']
        for p in data['paragraphs']:        # for each paragraph
            res.append("\u00B6{} {} ...".format(pcount, ' '.join(p['text'].split()[0:num_words])))
            pcount += 1
        return res


    def getNumParagraphs(self):
        data = self.sections[self.current_section]['data']
        return len(data['paragraphs'])

    def getNumSections(self):
        if self.sections:
            return len(self.sections)
        else:
            return 0

    def getKeyTopics(self):
        return self.keyTopics

    # def getKeyTopicsFirstSent(self):
    #     return self.keyTopicsFirstSent

    def getKeyParaTopics(self):
        return self.keyParaTopics

    def setHighlightQuotes(self, val):
        self.show_quotes = val

    def getNumQuotedWords(self):
        return self.num_quoted_words

    def getTotalWords(self):
        return self.total_words

    def getFilename(self):
        if self.filename is not None:
            return self.filename
        else:
            return 'Undefined'
        
    def getSelectedSentInfo(self):
        return self.selected_sent_info

    def findSentences(self, ruleset):

        if self.sections is None:
            return "Error in toHtml()"
        else:
            try:
                data = self.sections[self.current_section]['data']
                if data is None:
                    raise valueError;
            except:
                print(self.sections[self.current_section])                
                return

        res = []
        pcount = 1
        for para in data['paragraphs']:    

            scount = 1
            for sent in para['sentences']: 
                b_topic = False
                b_experience = False

                # get the list of lemmas (i.e., topics)
                lemmas   = sent['lemmas']

                # get the list of clusters (i.e., experiences)
                clusters = list()
                for w in sent['text_w_info']:
                    dsw   = w[DS_DATA]      # docuscope word
                    if dsw is not None:
                        lat   = dsw.getLAT()
                        dim, clust = self.dictionary.getDimensionAndCluster(lat)
                        if clust is not None and clust not in clusters:
                            clusters.append(clust)
                    else:
                        print("ERROR: dsw is none.")
                        continue
                res = dict
                for rule in ruleset.getRules():

                    b_match = rule.isMatching(lemmas, clusters)
                    
                    if res.get(rule, False) and sent not in res[rule]:
                        res[rule].append(sent)

                scount += 1

            pcount += 1

        """
        Note. We are returning a dictionary, where keys are rules, and the values are sentences.
        """
        return res

    ########################################
    #
    # Processing Methods
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
            res = list()
            doc = nlp(heading)

            # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 
            #     4.DEP, 5.STEM, 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA
            # Note: the nouns in headings/titels are always considered 'pre-verb' ISLEFT + TRUE
            is_left = False
            if DSDocument.user_defined_synonyms is not None:
                for token in doc:

                    if token.pos_ == 'NOUN' or token.pos_ == 'PROPN':     # if the token is a noun
                        is_left = True                            
                        t = token.text
                        lemma = DSDocument.user_defined_synonyms.get(t, None)   

                        if lemma is None:
                            lemma = token.lemma_

                    elif token.tag_ == 'PRP' or token.tag_ == 'PRP$':   # if the token is a pronoun
                        is_left = True
                        t = token.text
                        lemma = DSDocument.user_defined_synonyms.get(t, None)
      
                        if lemma is None:
                           lemma = token.lemma_

                    else:
                        t = token.text.lower()
                        lemma = getPronounLemma(t)
                        if lemma is None:
                            lemma = token.lemma_

                    if token.text in end_puncts:
                        pos = 'PUNCT'
                    elif token.pos_ == 'PROPN':                            # Proper Nouns
                        pos = 'NOUN'
                    elif token.tag_ == 'PRP' or token.tag_ == 'PRP$':      # Pronouns / Pronoun Possessive
                        pos = 'PRP'
                    elif token.is_punct:                                   # Punctuations
                        pos = 'PUNCT'
                    elif token.pos_ == 'PRON' and token.tag_ == 'NN':
                        pos = 'NOUN'
                    else:                                                  # Everything else
                        pos = token.pos_

                    res.append((pos, token.text, lemma, is_left, 
                               token.dep_, '', None, False, word_pos, None))
                    word_pos += 1
            else:
                for token in doc:
                    # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 
                    #     4.DEP, 5.STEM, 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA
                    # Note: the nouns are always considered 'pre-verb' ISLEFT + TRUE
                    is_left = False
                    if token.pos_ in ['NOUN', 'PROPN', 'PRON']:
                        is_left = True
                    res.append((token.pos_, token.text, token.lemma_, is_left, 
                               token.dep_, '', None, False, word_pos, None))
                    word_pos += 1

            temp = []
            for n in doc.noun_chunks:
                n = str(n)
                n = n.translate(n.maketrans('', '', string.punctuation))     # removes punctuation            
                temp.append(n)

            noun_phrases = tuple(temp)
        
            return res, noun_phrases


        def getPronounLemma(t):
            lemma = None
            if t in ['he', 'his', 'him', 'himself']:
                lemma = 'he'
            elif t in ['she', 'her', 'hers', 'herself']:
                lemma = 'she'
            elif t in ['i', 'my', 'me', 'mine', 'myself']:
                lemma = 'I'
            elif t in ['you', 'your', 'yours', 'yourself', 'yourselves']:
                lemma = 'you'
            elif t in ['we', 'our', 'us', 'ours', 'ourselves']:
                lemma = 'we'
            elif t in ['they', 'their', 'them', 'theirs', 'themselves']:
                lemma = 'they'
            elif t in ['it', 'its', 'itself']:
                lemma = 'it'

            return lemma

        #incl_nsubj = self.controller.postMainVerbTopics() # true or false
        incl_nsubj = None

        res = list()
        is_left = True
        if type(sent) != str:
            doc = sent
            root = None

            for token in doc:
                lemma = ""

                if DSDocument.user_defined_synonyms is not None:
                    if token.pos_ == 'NOUN' or token.pos_ == 'PROPN':     # if the token is a noun

                        t = token.text.lower()                                 # original spelling
                        lemma = DSDocument.user_defined_synonyms.get(t, None)  #

                        if lemma is None:
                            t = token.lemma_.lower()                           # SpaCy's lemma
                            lemma = DSDocument.user_defined_synonyms.get(t, None)

                        if lemma is None:
                            lemma = token.lemma_

                    elif token.tag_ == 'PRP' or token.tag_ == 'PRP$':
                        t = token.text.lower()
                        lemma = DSDocument.user_defined_synonyms.get(t, None)   # e.g., He
      
                        if lemma is None:
                            lemma = getPronounLemma(t)  # e.g., his
                            if lemma is None:
                                lemma = token.lemma_
                        else:
                            token.pos_ = 'NOUN'
                            token.tag_ = 'NN'       # if it is a synonym, treat them like a noun

                    else:
                        t = token.text.lower()
                        lemma = DSDocument.user_defined_synonyms.get(t, None)   # non-noun phrases included in a topic cluster

                        if lemma is None:
                            lemma = getPronounLemma(t)
                            if lemma is None:
                                lemma = token.lemma_
                        else:
                            token.pos_ = 'NOUN'
                            token.tag_ = 'NN'
                              
                elif token.tag_ == 'PRP' or token.tag_ == 'PRP$':
                    t = token.text.lower()
                    lemma = getPronounLemma(t)
                    if lemma is None:
                        lemma = token.lemma_
                else:
                    t = token.text.lower()
                    lemma = getPronounLemma(t)
                    if lemma is None:
                        lemma = token.lemma_

                # temporary fix about 'data'
                if lemma == "datum":
                    lemma = "data"

                if token.text in end_puncts:
                    pos = 'PUNCT'
                elif token.pos_ == 'PROPN':                            # Proper Nouns
                    pos = 'NOUN'
                elif token.tag_ == 'PRP' or token.tag_ == 'PRP$':      # Pronouns / Pronoun Possessive
                    pos = 'PRP'
                elif token.is_punct:                                   # Punctuations
                    pos = 'PUNCT'
                elif token.pos_ == 'PRON' and token.tag_ == 'NN':
                    pos = 'NOUN'

                else:                                                  # Everything else
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

                res.append((pos, token.text, lemma, left, token.dep_, '', 
                            None, False, word_pos, None))

                if token.dep_ == "ROOT":
                    is_left = False

                word_pos += 1

            temp = []
            for n in doc.noun_chunks:
                n = str(n)
                n = n.translate(n.maketrans('', '', string.punctuation))     # removes punctuation            
                temp.append(n)
            noun_phrases = tuple(temp)

        else:
            res, noun_phrases = processHeading(sent)

        return res, noun_phrases, word_pos

    def analyzeSent(self, sent_data, sent):
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

            return res   # end of traverse

        def isNP(d, i):
            if d is not None:
                for np in d:
                    if np[0] <= i and i < np[1]:
                        return True
            return False      

        res = {}         # create a dictionary

        res['NOUNS']     = 0   # total # of nouns
        res['HNOUNS']    = 0   # total # of head nouns
        res['L_HNOUNS']  = 0   # head nouns on the left
        res['R_HNOUNS']  = 0   # head nouns on the right

        res['L_NOUNS']   = []  # nouns on the left
        res['R_NOUNS']   = []  # nouns on the right

        res['MV_LINKS']  = 0   # total # of links fron the root verb
        res['MV_L_LINKS']= 0   # total # of left links from the root veb
        res['MV_R_LINKS']= 0   # total # of right links from the root verb
        
        res['V_LINKS']   = 0   # total # of links from all the non-root verbs
        res['V_L_LINKS'] = 0   # total # of left links from all the non-root verbs
        res['V_R_LINKS'] = 0   # total # of right links fromn all the non-root verbs

        res['NR_VERBS']  = 0   # total # of non-root verbs
        res['NPS']       = []
        res['NUM_NPS']   = 0   # total # of NPs
        res['L_NPS']     = 0
        res['R_NPS']     = 0
        res['BE_VERB']  = False

        word_count = 1
        root_pos = -1
        for data in sent_data:
            if data[POS] == 'NOUN' or data[POS] == 'PRP':
                res['NOUNS'] += 1

                if data[ISLEFT] == True:
                    res['L_NOUNS'].append(data)
                else:
                    res['R_NOUNS'].append(data)

            if data[DEP] in SUBJECTS:  # we may want to change SUBJECTS to DSDocument.noun_subject_options:
                res['HNOUNS'] += 1

                if data[ISLEFT] == True:
                    res['L_HNOUNS'] += 1                
                else:
                    res['R_HNOUNS'] += 1
                        
            if data[DEP] == 'ROOT':
                links = data[LINKS]
                if links is not None:
                    res['MV_LINKS']   = links['CCOUNT']
                    res['MV_L_LINKS'] = links['LCOUNT']
                    res['MV_R_LINKS'] = links['RCOUNT']

                if data[WORD] in be_verbs:
                    res['BE_VERB'] = True

                root_pos = word_count

            elif data[POS] == 'VERB':
                links = data[LINKS]
                if links is not None:
                    res['V_LINKS'] += links['CCOUNT']
                    res['V_L_LINKS'] += links['LCOUNT']
                    res['V_R_LINKS'] += links['RCOUNT']                 
                    res['NR_VERBS']  += 1
                
            word_count+=1

        if type(sent) == str:
            doc = nlp(sent)
        else:
            doc = sent              # Sent is already an Spacy object

        for token in doc:
            if token.dep_ == 'ROOT':
                root_pos = token.i
                break

        left_nps = list()
        for np in doc.noun_chunks:
            if (np.end-1) < root_pos: # LEFT
                res['L_NPS'] += 1
                left_nps.append(np)
            elif (np.end-1) > root_pos: # RIGHT   
                res['R_NPS'] += 1
            res['NPS'].append(np.text)
        res['NUM_NPS'] = len(res['NPS'])

        # res['NOUN_CHUNKS'] = list(doc.noun_chunks) 
        # 2022 May 9. Use a python dictionary instead of SpaCy's Span object. So that we can convert 
        # the 'sent_analysis' property to JSON easily later.
        res['NOUN_CHUNKS'] = [ {'text': np.text, 'start': np.start, 'end': np.end} for np in doc.noun_chunks]        

        advcl_root = None
        for token in doc:
            if token.dep_ == 'ROOT':     # we are only intersted in the advcl before the main verb
                break
            elif token.dep_ == 'advcl':
                advcl_root = token
                break

        bIgnore = False
        if advcl_root is not None:
            left_span  = []
            right_span = []
            count = 0
            start = 0
            for w in advcl_root.lefts:
                if count==0:
                    start = w.i
                    if w.text.lower() in IGNORE_ADVCL_FIRST_WORDS or start != 0:
                        bIgnore = True
                        break

                left_span += traverse(w, True)
                count+=1
            if bIgnore == False:
                for w in advcl_root.rights:
                    right_span += traverse(w, False)

                tmp = left_span + [advcl_root.text] + right_span
                end = start + len(tmp)

                mod_cl = ' '.join(tmp)
                # Let's count how many NPs are in the modifier clause
                last_np = 0
                for np in left_nps:
                    if np.end <= end:
                        last_np = np.end
                    else:
                        break

                res['MOD_CL'] = (start, end, mod_cl, last_np)
            else:
                res['MOD_CL'] = None

        else:
            res['MOD_CL'] = None

        return res

    def processDoc(self, section_data):
        print ("processDoc ()")

        if (isModelLoaded () == False):
           print ("Warning: language model not loaded yet, loading ...")
           setLanguageModel ("en",NLP_MODEL_DEFAULT)

        if (isModelLoaded () == False):
           print ("Error: unable to load language model!")
           return (list())

        print("Language model appears to be loaded, processing text ...")   

        """
        This function iterates through all the paragraphs in the given docx document.
        and find all the unique lemmas in each sentence, and in each paragraph.
        """

        doc = section_data['doc']

        self.num_quoted_words = 0 

        word_pos = section_data['start']

        def listLemmas(sent):
            global stop_words

            lemmas = list()
            temp = list()

            for w in sent:
                if w[POS] is not None and w[LEMMA] not in stop_words:
                    if (w[POS], w[LEMMA]) not in temp:
                        # temp.append( (w[POS], w[LEMMA]) )   # 'NOUN' + 'man'
                        temp.append( (w[WORD], w[POS], w[LEMMA]) )   # 'they' + 'NOUN' + 'man'
                        lemmas.append(w)
            return lemmas

        def listStems(sent):
            stems = list()
            temp = list()
            for w in sent:
                if w[POS] is not None and w[POS] != 'PUNCT' and w[POS] != 'SYM' and w[LEMMA] not in stop_words:
                    if w[STEM] not in temp:
                        temp.append(w[STEM])
                        stems.append(w)
            return stems
        
        def accumulateParaLemmas(paragraphs):
            accum = list()
            for para in paragraphs:
                accum += para['lemmas']
            return accum

        self.bQuote = False
        num_paras = len(doc.paragraphs)
        count_para  = 0

        data = dict()
        data['paragraphs'] = list()
        data['text'] = ""
        data['real_para_count'] = num_paras

        skip_paras = self.skip_paras

        for para in doc.paragraphs:                             # for each paragraph in the file.
            count_para += 1

            if count_para <= skip_paras:
                continue
            elif count_para > (skip_paras + self.max_paras):
                break

            if self.progress_callback:
                self.progress_callback(new_val=round(100 * count_para/num_paras))

            p = para.text

            if p == "":                       # skip if it is an empty line.
                continue

            if para.style.name not in ['Normal', 'Heading 1', 'Heading 2', 'Heading 3', 'Title']:
                style = 'Normal'
            else:
                style = para.style.name

            para_dict = dict()                                     # initalizes a dict for the paragraph
            para_dict['text']               = p                    # assign the paragraph obj to para_dict['text']
            para_dict['sentences']          = list()               # and initialize other fields with an empty list.            
            
            para_dict['lemmas']             = list()
            para_dict['accum_lemmas']       = list()
            para_dict['given_lemmas']       = list()
            para_dict['new_lemmas']         = list()
            para_dict['given_accum_lemmas'] = list()
            para_dict['new_accum_lemmas']   = list()
            
            para_dict['stems']              = list()
            para_dict['accum_stems']        = list()
            para_dict['given_stems']        = list()
            para_dict['new_stems']          = list()
            para_dict['given_accum_stems']  = list()
            para_dict['new_accum_stems']    = list()
            
            para_dict['style']              = style                 # set the paragraph style (from the docx file).

            if style in ['Heading 1', 'Heading 2', 'Heading 3', 'Title']:
                slist = [para.text]
            else:
                parsed_para = nlp(p)                                # split the paragraph into sentencees.
                slist = [sent for sent in parsed_para.sents]

            for s in slist:                                         # for each sentence in the paragraph 'p'
                sent_dict = dict()

                if type(s) == str:
                    sent_dict['text'] = s.strip()
                    sent_dict['text_w_info'], NPs, word_pos = self.processSent(s.strip(), start=word_pos+1)
                else:
                    sent_dict['text'] = s.string.strip()
                    sent_dict['text_w_info'], NPs, word_pos = self.processSent(s, start=word_pos+1) 


                sent_dict['sent_analysis'] = self.analyzeSent(sent_dict['text_w_info'], s) # analyze sentences

                sent_dict['lemmas'] = listLemmas(sent_dict['text_w_info'])    # list lemmas in the paragraph
                sent_dict['accum_lemmas'] = []
                sent_dict['given_lemmas'] = []                  # initializes the 'given_lemmas' field.
                sent_dict['new_lemmas'] = []                    # initializes the 'new_lemmas' field.
                sent_dict['given_accum_lemmas'] = []            # initializes the 'given_lemmas' field.
                sent_dict['new_accum_lemmas'] = []              # initializes the 'new_lemmas' field.

                sent_dict['stems']  = listStems(sent_dict['text_w_info'])   # list stems in the paragraph
                sent_dict['accum_stems'] = []
                sent_dict['given_stems'] = []                  # initializes the 'given_lemmas' field.
                sent_dict['new_stems'] = []                    # initializes the 'new_lemmas' field.
                sent_dict['given_accum_stems'] = []            # initializes the 'given_lemmas' field.
                sent_dict['new_accum_stems'] = []              # initializes the 'new_lemmas' field.
                
                para_dict['sentences'].append(sent_dict)        # add sent_dict to para_dict.

                # update the paragraph's 'lemmans' field by adding new lemmas from the new sentence 's'
                for sl in sent_dict['lemmas']:                  # for each lemma in the new sentence,
                    match = False
                    for pl in para_dict['lemmas']:              # check against each lemma in its paragraph.
                        if sl[POS] == pl[POS] and sl[LEMMA] == pl[LEMMA]:  # if there is a match
                            match = True                                   # mark 'match' as True, and beak
                            break
                    if match != True:
                        para_dict['lemmas'].append(sl)

                # update the paragraph's 'stems' field by adding new stems from the new sentence 'ss'
                for ss in sent_dict['stems']:                  # for each lemma in the new sentence,
                    match = False
                    for ps in para_dict['stems']:              # check against each stem in its paragraph.
                        if ps[STEM] == ss[STEM]:               # if there is a match
                            match = True                       # mark 'match' as True, and beak
                            break
                    if match != True:
                        para_dict['stems'].append(ss)

                sent_dict['accum_lemmas'] = list(para_dict['lemmas'])
                sent_dict['accum_stems']  = list(para_dict['stems'])
            
            data['paragraphs'].append(para_dict)                # add para_dict to doc_dict
            
            # here, we need to create para_dict['accmum_lemmas'] by going through all the previous
            # paragraphs and accumulating lemmas.            
            
            para_dict['accum_lemmas'] = accumulateParaLemmas(data['paragraphs'])
            # para_dict['accum_stems']  = accumulateParaStems(data['paragraphs'])

        section_data['data']    = data
        section_data['end_pos'] = word_pos

        self.recalculateGivenWords(data=data)

    def recalculateGivenWords(self, data=None, section=-1):

        """
        (re)Calculate given words at the sentence and the paragraph level.
        """
        if data is None:
            if section < 0:
                # print("Error in recalculateGivenWords()")
                return
            else:
                data = self.sections[section]['data']

        if self.progress_callback:
            self.progress_callback(max_val=55, msg="Finding lexical overlaps between paragraphs...")

        self.findGivenWordsPara(data)               # find given words between paragraphs

        if self.progress_callback:
            self.progress_callback(max_val=90, msg="Finding lexical overlaps between sentences...")

        self.findGivenWordsSent(data)               # find given words between sentences in each paragraph


    def isGiven(self, l1, l2, pos1, pos2, pronoun=False):  
              

        if pos1 == pos2:                                 
            # these 2 lemmas share the same POS tag.
            if pronoun == False and pos1.startswith('PRON'):
                # we'll ignore this since they are pronouns and the pronoun display is OFF.
                return False 
            elif l1 == l2:  # lemma 1 == lemma 2 and POS1 == POS1
                return True
            else:
                return False

        elif pronoun == True and pos1.startswith('PRON'):
            # The pronoun display is ON, and pos1 is a pronoun.
            # Pronouns are ALWAYS given.
            return True            

        else:
            return False

    def findGivenWordsSent(self, data):
        """
        This method iterates through the sentences in each paragraph 
        of the document, and find all the given and 'new' lemmas. Notice 
        that this function only finds given words/lemmas between sentences
        within a given paragraph. (i.e., No given words are discovered 
        between the last sentence of a paragraph and the first sentence
        of the next paragraph.)
        """
        num_paras = len(data['paragraphs'])
        count_para = 0          
        for para in data['paragraphs']:                    # for each paragraph  
            count_para += 1 

            if self.progress_callback:
                self.progress_callback(new_val=round(100 * count_para/num_paras))

            prev_s = None                                       
            for sent in para['sentences']:                      # for each sentence in the paragraph
                sent['given_accum_lemmas'] = list()
                sent['new_accum_lemmas']   = list()

                if prev_s is not None:                          # start with the 2nd sentence.
                    for gl in sent['lemmas']:                   # for each given lemmas in the sentence

                        for cl in prev_s['accum_lemmas']:        
                            # for each given accum_lemmas in the prev sentence
                            # if a lemma ('gl') is in the previous paragraph AND their POSs maatch
                            if self.isPOSVisible(gl[POS]) and self.isGiven(gl[LEMMA], cl[LEMMA], gl[POS], cl[POS], pronoun=True):
                                # and if 'gl' is not already in the sentence's given lemma's list
                                if gl[LEMMA] not in [x[LEMMA] for x in sent['given_accum_lemmas']]:
                                    sent['given_accum_lemmas'].append(gl)            # add 'gl' to the list

                        # commented out 9/16/2021
                        for temp_sent in para['sentences']:
                            # for each sentence in the paragraph
                            if temp_sent == sent:  # break if temp_sent is the currente sent.
                                break
                            for cl in temp_sent['accum_lemmas']:  # for each accum_lemma in the sentence
                                # if a lemma ('gl') is in the sentence AND their POSs maatch
                                if self.isPOSVisible(gl[POS]) and self.isGiven(gl[LEMMA], cl[LEMMA], gl[POS], cl[POS], pronoun=True):
                                    # if 'cl' is not already in the sentence's new lemmas list
                                    if gl[POS] != 'PRON' and cl[LEMMA] not in [x[LEMMA] for x in temp_sent['new_accum_lemmas']]:
                                        temp_sent['new_accum_lemmas'].append(cl)     # add 'cl' to the list 

                        # if 'lemma' a user defined topic, force it to be 'given'
                        if gl[LEMMA].lower() in DSDocument.user_defined_topics:
                            if gl[LEMMA].lower() not in sent['given_accum_lemmas']:
                                sent['given_accum_lemmas'].append(gl)

                    prev_s = sent       

                else:
                    prev_s = sent
                    for gl in sent['lemmas']:
                        if gl[LEMMA].lower() in DSDocument.user_defined_topics:
                            if gl[LEMMA].lower() not in sent['given_accum_lemmas']:
                                sent['given_accum_lemmas'].append(gl)

    def findGivenWordsPara(self, data):
        """
        This method iterates through the paragraphs in the data (Document),
        and find all the given and 'new' lemmas. (connection lemmmas are those words that
        appear in the following paragraph.
        """
        num_paras = len(data['paragraphs'])
        count_para = 0        
        prev_p = None
        for para in data['paragraphs']:                         # for each paragraph  
            count_para += 1        

            if self.progress_callback:
                self.progress_callback(new_val=round(100 * count_para/num_paras))
            
            para['given_accum_lemmas'] = list()
            para['new_accum_lemmas']   = list()
            foo = list()
            if prev_p is not None:                             # start with the 2nd paragraph.
                for gl in para['lemmas']:                      # for each lemma in the paragraph
                    for cl in prev_p['accum_lemmas']:          # for each given lemmas in the prev. paragraph
                        # if a lemma ('gl') is in the previous paragraphs AND their POSs maatch
                        if self.isPOSVisible(gl[POS]) and self.isGiven(gl[LEMMA], cl[LEMMA], gl[POS], cl[POS]):
                            para['given_accum_lemmas'].append(gl)         # add 'gl' to the list

                    for temp_para in data['paragraphs']: 
                        if temp_para == para:
                            break                   
                        for cl in temp_para['accum_lemmas']:     # for each paragraph's accum_lemmas 
                            # if a lemma ('gl') is in the previous paragraph AND their POSs maatch
                            if self.isPOSVisible(gl[POS]) and self.isGiven(gl[LEMMA], cl[LEMMA], gl[POS], cl[POS]):
                                # if 'cl' is not already in the previous paragraph's new lemmas list
                                if cl[LEMMA] not in [x[LEMMA] for x in temp_para['new_accum_lemmas']]:
                                    temp_para['new_accum_lemmas'].append(cl)         # add 'cl' to the list

                    # if 'lemma' is a user defined topic, force it to be 'given'
                    if DSDocument.isUserDefinedTopic(gl[LEMMA].lower()) or \
                       DSDocument.isUserDefinedSynonym(gl[LEMMA]):
                        if gl[LEMMA].lower() not in para['given_accum_lemmas']:
                            para['given_accum_lemmas'].append(gl)

                # remove the duplicates. It may be a bit faster to do it here than checking duplicates in the loop above...
                para['given_accum_lemmas'] = list(set(para['given_accum_lemmas']))  

                prev_p = para

            else:
                prev_p = para           
                for gl in para['lemmas']: 
                    if DSDocument.isUserDefinedTopic(gl[LEMMA].lower()) or \
                       DSDocument.isUserDefinedSynonym(gl[LEMMA]):
                        if gl[LEMMA].lower() not in para['given_accum_lemmas']:
                            para['given_accum_lemmas'].append(gl)


    ########################################
    #
    # Loading Methods
    #
    ########################################
    def loadFromTxt(self, aText):
        print ("loadFromTxt ()")
        #print (aText)

        self.current_section = 0

        text = aText
        paragraphs = text.splitlines()

        doc = Document()

        for para in paragraphs:
            if para:
                para = adjustSpaces(para)
                doc.add_paragraph(para)

        section_data = dict()
        section_data['doc']     = doc
        section_data['data']    = dict()
        section_data['heading'] = "n/a"
        section_data['start']   = 0
        section_data['pos']     = 0

        self.sections = [section_data]

        self.processDoc(section_data)

        section_data['start'] = 0

        self.processDoc(section_data)

    def loadFromTxtFile(self, src_dir, file):
        """
        Load a text from a plain text file. If the file contains headings using
        the "Heading 1" style, the document is split into multiple sections.
        It then process the document by calling the processDoc method.
        It calls back the application object to update the headings.
        """

        if self.progress_callback:
            self.progress_callback(new_val=10, msg="Opening file...")

        self.current_section = 0

        with open(os.path.join(src_dir,file), errors="ignore") as fin:
            text = fin.read()
            paragraphs = text.splitlines()

        doc = Document()
        for para in paragraphs:
            if para:
                para = adjustSpaces(para)
                doc.add_paragraph(para)

        if self.progress_callback:
            self.progress_callback(new_val=10)

        section_data = dict()
        section_data['doc']     = doc
        section_data['data']    = dict()
        section_data['heading'] = "n/a"
        section_data['start']   = 0
        section_data['pos']     = 0
        self.sections = [section_data]

        self.filename = file

        self.processDoc(section_data)
        section_data['start'] = 0
        self.processDoc(section_data)
 
        # self.controller.setSections(["(No Sections)"])

    def loadFromMSWordFile(self, src_dir, file):
        """
        Load a text from a MS Word file. If the file contains headings using
        the "Heading 1" style, the document is split into multiple sections.
        It then process the document by calling the processDoc method.
        It calls back the application object to update the headings.
        """
        self.current_section = 0

        if self.progress_callback:
            self.progress_callback(max_val=10, msg="Opening file...")         

        self.sections = list()
        doc = Document(os.path.join(src_dir,file))     # create a Document object from a file.
        if self.progress_callback:
            self.progress_callback(new_val=12)
            
        para_count = 0
        sect_count = 0
        headings = list()
        p = None
        for para in doc.paragraphs:

            ptext = para.text.strip()

            if ptext == '':
                continue

            ptext = adjustSpaces(ptext)

            if para.style.name in ['Normal', 'Heading 1', 'Heading 2', 'Title']:
                style = para.style.name
                         
            elif para.style.name.startswith('List'):
                # if we find a (any) list, we'll add it to the previous paragraph.
                if p is not None:
                    p.add_run(" " + ptext)
                else: 
                    # if a list item is used first, or right after a heading.
                    p = section_data['doc'].add_paragraph(ptext, style='Normal')

                style = 'Normal'
                continue
            else:
                style = 'Normal'

            if para.style.name == 'Heading 1' or para.style.name == 'Title':

                # start a new section if we find 'Heading 1'
                section_data = dict()
                section_data['doc'] = Document()
                section_data['heading'] = ptext
                section_data['pos'] = sect_count
                self.sections.append(section_data)
                headings.append(ptext)
                sect_count += 1
                p = None

            elif para_count == 0 and sect_count == 0:
                # if the first paragraph is not a heading. We need to crreate a doc w/o a heading
                section_data = dict()
                section_data['doc'] = Document()
                section_data['heading'] = ptext
                section_data['pos'] = sect_count
                self.sections.append(section_data)
                headings.append("")                
                sect_count += 1
                p = None


            p = section_data['doc'].add_paragraph(ptext, style=style)

            para_count += 1

        offset = 0
        for section_data in self.sections:
            section_data['start'] = offset
            self.processDoc(section_data)
            offset = section_data['end_pos'] + 1

        # if there are more than 1 sections, AND the first section does not have a heading,
        # use '(No Sections Header/Title)'
        if sect_count > 1 and headings[0] == "":
            headings[0] = "(No Sections Header/Title)"
            text = self.sections[0]['heading']
            self.controller.showWarningDialog("Warning", "The first section does not include a title or heading. " +
                                                           "Consider assigning the Title or Heading style to the following line " +
                                                           "in Microsoft Word. \n\n\"{}\"".format(text))
        self.filename = file
        return headings

    def loadFromListOfParagraphs(self, doc, section):

        self.current_section = section

        if self.filename is not None:
            file = self.filename
        else:
            file = "Undefined.docx"
            self.sections = list()

        if self.progress_callback:
            self.progress_callback(new_val=10)

        para_count = 0
        # sect_count = 0
        headings = list()
        new_sections = list()
        for para in doc.paragraphs:
            ptext = para.text

            for mw_topic in DSDocument.multiword_topics + DSDocument.deleted_multiword_topics: 
                            
                connected_mw_topic = mw_topic.replace(' ', '_')
                ptext = ptext.replace(connected_mw_topic, mw_topic)
                ptext = ptext.replace(connected_mw_topic.lower(), mw_topic.lower())
                ptext = ptext.replace(connected_mw_topic.title(), mw_topic.title())
                ptext = ptext.replace(connected_mw_topic.capitalize(), mw_topic.capitalize())

            ptext = adjustSpaces(ptext)

            if para_count == 0:

                if para.style.name == 'Heading 1' or para.style.name == 'Title':
                    section_data = dict()
                    section_data['doc'] = Document()
                    section_data['heading'] = ptext
                    section_data['pos'] = section
                    new_sections.append(section_data)
                    headings.append(ptext)

                else:
                    section_data = dict()
                    section_data['doc'] = Document()
                    section_data['heading'] = ptext
                    section_data['pos'] = section
                    headings.append("(No Heading)")
                    new_sections.append(section_data)

            if para.style.name in ['Normal', 'Heading 1', 'Heading 2', 'Title']:
                style = para.style.name
            else:
                style = 'Normal'

            section_data['doc'].add_paragraph(ptext, style=style)
            para_count += 1

        if self.sections:
            if len(self.sections) <= section:   # if len (sections) = 0 > 0
                return

            offset = self.sections[section]['start']  # get the offset of the current section
            section_data['start'] = offset

            self.processDoc(section_data)

            self.sections.pop(self.current_section)
            self.sections[self.current_section:self.current_section] = new_sections

        else:  # We get here only if the user copy & pasted text into the editor
            self.sections = new_sections
            offset = 0
            for section_data in self.sections:
                section_data['start'] = offset
                self.processDoc(section_data)
                offset = section_data['end_pos'] + 1

        return headings
        # self.controller.updateSections(self.current_section, headings)  # 2021.12.19


    ########################################
    #
    # Methods for creating HTML/XML strings from the text data
    # Doesn't rely on DocuScope tagging, does rely on PythonDocX
    #
    ########################################

    def toHtml_OTOnly(self, topics=[], para_pos=-1):

        data = self.sections[self.current_section]['data']

        if data is None:
            return ""

        total_paras = len(data['paragraphs'])
        html_str = ""
        pcount  = 1

        for para in data['paragraphs']: # for each paragraph

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                continue

            total_sents = len(para['sentences'])

            para_style = para['style']
            if para_style == 'Title':
                font_size = views.editor_title_font_size
            elif para_style == 'Heading 1':
                font_size = views.editor_h1_font_size
            else:
                font_size = views.editor_normal_font_size

            html_str += '<p class=\'p{}\' style=\'font-size: {}pt;\'>'.format(pcount, font_size)
            # html_str += '<p class=\'p{}\'>'.format(pcount)

            scount = 1

            for sent in para['sentences']: # for each sentence

                total_words = len(sent['text_w_info'])
                is_combo = False
                word_count = 0
                html_str += '<sent class=\'p{} s{}\'>'.format(pcount, scount)

                while word_count < total_words:

                    w = sent['text_w_info'][word_count]

                    if w[LEMMA] in topics:
                        # we need to remove periods.
                        html_word = "<t class=\'{} p{} s{}\'>{}</t>".format(w[LEMMA].replace('.',''), pcount, scount, w[WORD])
                    else:
                        html_word = w[WORD] 

                    is_space = True
                    is_combo = False
                    temp_word_count = 0

                    if word_count < total_words-1:
                        next_w = sent['text_w_info'][word_count+1]

                        if w[WORD] in right_quotes and html_str[-1] == ' ':
                            # if w[WORD] is a right side quotes, and the current html_word string ends
                            # with a space, remove the space.
                            html_str = html_str[:-1]

                        # if next_w[WORD] == '\u2026' or w[WORD] == '\u2026':   
                        #     # an ellipsis character is treated like a word.                        
                        #     pass

                        if w[WORD] in left_quotes or w[WORD] in hyphen_slash:
                            # if w[WORD] in left_quotes or w[WORD] in dashes:
                            # w is a left side punct or a dash (not em-dash or en-dash)
                            is_space = False

                        elif next_w[WORD] not in left_quotes:
                            # next_w a punct, which is not on one of the left quotes
                            temp_word_count = 0
                            if next_w[WORD] in no_space_patterns:
                                combo_word = html_word + next_w[WORD]
                                is_space = True
                                is_combo = True
                                word_count += 1  # skip the next word

                            elif next_w[WORD] in hyphen_slash: # hyphenation
                                combo_word = html_word + next_w[WORD]
                                temp_word_count = word_count + 2

                                while True:
                                    # get the next pair

                                    temp_w = sent['text_w_info'][temp_word_count]
                                    if temp_w[LEMMA] in topics:
                                        html_temp_word = "<t class=\'{} p{} s{}\'>{}</t>".format(temp_w[LEMMA].replace('.',''), 
                                                                                                 pcount, scount, temp_w[WORD])
                                    else:
                                        html_temp_word = temp_w[WORD]  

                                    temp_next_w = sent['text_w_info'][temp_word_count+1]

                                    if temp_next_w[WORD] in hyphen_slash:
                                        combo_word += html_temp_word
                                        combo_word += temp_next_w[WORD]
                                        temp_word_count += 2
                                    else:
                                        combo_word += html_temp_word
                                        break

                                word_count = temp_word_count # skip all the words in the hyphenated word
                                is_space = True
                                is_combo = True

                            elif next_w[POS] == 'PUNCT':
                                is_space = False

                        if is_space:       # followed by a space
                            next_char = ' '          
                        else:              # followed by a punctuation
                            next_char = ''   
                    else:                  # last word/char in 'sent'
                        next_char = ' '       # end of 'sent'                           

                    if is_combo:
                        html_str += combo_word
                    else:
                        html_str += html_word

                    html_str += next_char
                    word_count += 1
                # 
                scount += 1
                html_str += '</sent>\n'

            # sent
            pcount += 1
            html_str += '</p>\n\n'

        return html_str

    def toHtml(self, topics=[], para_pos=-1):

        if self.controller.isDocTagged() == False:
            # We don't suppor the OnTopic only option now.
            # return self.toHtml_OTOnly(para_pos, topics)  
            return "Error in toHtml()"            

        if self.sections is None:
            return "Error in toHtml()"
        else:
            try:
                data = self.sections[self.current_section]['data']
                if data is None:
                    raise valueError;
            except:
                print(self.sections[self.current_section])                
                return

        bTagOpen = False
        bParaCrossingPattern = False

        dsw   = None
        clust = ''
        dim   = ''
        lat   = ''
        end   = ''
        pos   = ''
        next_char = ''

        html_str = ""
        pcount = 1

        for para in data['paragraphs']:    # for each paragraph

            para_style = para['style']
            if para_style == 'Title':
                font_size = views.editor_title_font_size
            elif para_style == 'Heading 1':
                font_size = views.editor_h1_font_size
            else:
                font_size = views.editor_normal_font_size

            html_str += '<p class=\'p{}\' style=\'font-size: {}pt;\'>'.format(pcount, font_size)

            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                bParaCrossingPattern = False
                bTagOpen = False
                continue

            for sent in para['sentences']: # for each sentence
                total_words = len(sent['text_w_info'])
                is_combo = False
                word_count = 0

                # For some reason (usualy it is a NLP parser problem), if a sentence is starting 
                # with a punctionation that's supposed to be part of the previous sentence, remove
                # a space from html_str.
                first_w = sent['text_w_info'][0]
                if word_count == 0:
                    if first_w[LEMMA] in no_space_patterns:
                        html_str = html_str.rstrip()
                        next_char = ''

                    elif first_w[WORD] in end_puncts:
                        html_str = html_str.rstrip()
                        next_char = ''

                html_str += '<sent class=\'p{} s{}\'>'.format(pcount, scount)  # Sentence

                while word_count < total_words:
                    w = sent['text_w_info'][word_count]     # for each word.

                    word  = w[WORD]         # ontopic word
                    lemma = w[LEMMA]        # lemma/topic

                    if lemma in topics and (w[POS] == 'NOUN' or w[POS] == 'PRP'):
                        html_word = '<t class=\'{} p{} s{}\'>{}</t>'.format(lemma.replace('.',''), pcount, scount, word)
                    else:
                        html_word = word

                    dsw   = w[DS_DATA]      # docuscope word
                    if dsw is not None:
                        end   = dsw.getEnd()
                        lat   = dsw.getLAT()
                        pos   = dsw.getPos()
                        dim, clust = self.controller.getDimensionAndCluster(lat)
                    else:
                        if bTagOpen:
                            bTagOpen = False
                            html_str += '</ds>' + ' '
                        else:
                            html_str += ' '
                        html_str += html_word
                        word_count += 1
                        continue

                    if pos != '':
                        pos = int(float(pos))
                    else:
                        pos = -1

                    if dsw is not None:
                        # Let's put an open tags around DS patterns.
                        if pos == 0:                     # The first word of a DS TAG

                            if bTagOpen == True:         # if a tag is open, close it.
                                html_str += '</ds>'
                                html_str += next_char    # add a space (or nothing)
                                bTagOpen = False
                            else:
                                html_str += next_char

                            if bTagOpen == False:        # if a tag is not open, start a new one.

                                if word_count == (total_words-1) and \
                                    word == '.' and pos == 0 and lat != '':
                                    # If the period at the end of a pragraph or a sentence
                                    # is part of a pattern, make it as such.
                                    bParaCrossingPattern = True
                                else:
                                    if word in end_puncts or word in right_quotes:
                                        html_str = html_str.rstrip()

                                    if lat == '' or lat == 'UNRECOGNIZED':
                                        html_str += '<ds class=\'na\'>'
                                    else:
                                        html_str += '<ds class=\'{} {} {}\'>'.format(clust, dim, lat)
                                    bTagOpen = True

                        elif bParaCrossingPattern:

                            html_str += next_char
                            if lat == '' or lat == 'UNRECOGNIZED':
                                html_str += '<ds class=\'na\'>'
                            else:
                                html_str += '<ds class=\'{} {} {}\'>'.format(clust, dim, lat)

                            bTagOpen = True                

                            bParaCrossingPattern = False
                        else:
                            html_str += next_char

                    is_space = True
                    is_combo = False
                    temp_word_count = 0

                    # --------------------------------------------------------
                    # Now, we will deal with OnTOpic Tags.
                    # --------------------------------------------------------

                    if word_count < total_words-1:
                        # Let's deal with hyphenations and words followed by a no-space units.
                        next_w = sent['text_w_info'][word_count+1]
                        next_next_w = None
                        
                        if word_count+1 < total_words-1:
                            next_next_w = sent['text_w_info'][word_count+2]

                        if word in right_quotes and html_str[-1] == ' ':
                            # if w[WORD] is a right side quotes, and the current html_str string ends
                            # with a space, remove the space.
                            html_str = html_str[:-1]

                        if word in left_quotes or word in hyphen_slash:
                            # w is a left side punct or a dash (not em-dash or en-dash)
                            is_space = False

                        elif word == '.' and next_w[WORD].isdigit():
                            # if word is a period and the next word is a digit + %, it's a decimal point.
                            is_space = False

                        elif word == '.' and len(next_w[WORD]) == 1 and next_w[WORD].isalpha():
                            # if word is a period and the next word is single alphabet, it's a decimal point
                            # or multi-level figure numbers.
                            is_space = False

                        elif word == 'can' and next_w[WORD] == 'not' and next_next_w is not None and next_next_w[WORD] != 'only':
                            # we always spell 'can not' without a space, except when it is followd by 'only'.
                            is_space = False

                        elif next_w[WORD] not in left_quotes:

                            # next_w is a punct, which is not on one of the left quotes
                            temp_word_count = 0
                            if next_w[WORD] in no_space_patterns:

                                combo_word = html_word + next_w[WORD]
                                temp_word_count = word_count + 2

                                if temp_word_count < total_words:    # is the folloiwng word punct?
                                    temp_w = sent['text_w_info'][temp_word_count]

                                    if temp_w[WORD] in no_space_patterns or temp_w[WORD] in right_quotes:
                                        combo_word = combo_word + temp_w[WORD]
                                        word_count = temp_word_count
                                        is_space = True
                                        is_combo = True

                                    elif temp_w[POS] == 'PUNCT' and temp_w[WORD] not in dashes and temp_w[WORD] != ellipsis:
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
                                combo_word = html_word + next_w[WORD] # word + '-' or '/'
                                temp_word_count = word_count + 2

                                if temp_word_count >= total_words:
                                    pass

                                temp_next_w = None
                                while True:

                                    if temp_word_count >= (total_words):
                                        break

                                    # get the next pair
                                    temp_w = sent['text_w_info'][temp_word_count]
                                    if temp_w[LEMMA] in topics and (temp_w[POS] == 'NOUN' or temp_w[POS] == 'PRP'):
                                        html_temp_word = "<t class=\'{} p{} s{}\'>{}</t>".format(temp_w[LEMMA].replace('.',''), 
                                                                                  pcount, scount, 
                                                                                  temp_w[WORD])
                                    else:
                                        html_temp_word = temp_w[WORD]

                                    if temp_word_count+1 < (total_words):
                                        temp_next_w = sent['text_w_info'][temp_word_count+1]

                                        if temp_next_w[WORD] in hyphen_slash:
                                            combo_word += html_temp_word
                                            combo_word += temp_next_w[WORD]  # word + '-' or '/'
                                            temp_word_count += 2
                                        else:
                                            combo_word += html_temp_word
                                            break
                                    else:
                                        combo_word += html_temp_word
                                        break

                                if temp_next_w is not None:

                                    if temp_next_w[WORD] in no_space_patterns or \
                                       temp_next_w[WORD] in right_quotes:
                                        is_space = False

                                    elif temp_next_w[WORD] in end_puncts and temp_next_w[WORD] not in dashes \
                                                                         and temp_next_w[WORD] != ellipsis:
                                        is_space = False                                        

                                    else:
                                        is_space = True
                                else:
                                    is_space = True

                                word_count = temp_word_count # skip all the words in the hyphenated word
                                is_combo = True

                            elif next_w[WORD] in right_quotes:
                                is_space = False 
             
                            elif next_w[POS] == 'PUNCT' and next_w[WORD] not in dashes and next_w[WORD] != ellipsis:
                                is_space = False

                            else:
                                is_space = True

                        if is_space:        
                            next_char = ' '          
                        else:    
                            next_char = ''   

                    else:  # last word/char in 'sent'
                        if word in ['\u201C', '\u2018']:
                            # If the last word is an opening/left single/double quote, no space should be added.
                            # This case should only happen if the NLP parser's result is incorrect.
                            next_char = ''

                        elif word in right_quotes:
                            if html_str[-1] == ' ':
                                html_str = html_str.rstrip()
                            next_char = ' '
                        else:
                            next_char = ' '       # end of 'sent' 


                    if is_combo:
                        html_str += combo_word
                    else:
                        html_str += html_word

                    word_count += 1

                if bTagOpen == True:
                    html_str += '</ds>'
                    bTagOpen = False

                #  word
                html_str += '</sent>'
                html_str += next_char
                scount += 1

            # sent
            pcount += 1
            html_str += '</p>\n\n'   # Close the paragraph tag

        return html_str

    def saveAsDocx(self, filepath):
        """
        This method saves the currently analyzed document as a MS docx file.  
        """
        docx = self.toPlainDoc()
        docx.save(filepath)

    def toPlainDoc(self):
        """
        Convert the current document into a Word document w/ no highlights.
        """
        res_docx = Document()                        # create a new Word Document
        for section in self.sections:
            data = section['data']
            paragraphs = data['paragraphs']              # paragraphs is a list of paragraph dictionaries.
            num_paragraphs = len(paragraphs)             # count the total # of paragraphs

            for i in range(num_paragraphs):              # for each paragraph in the current document.
                p = res_docx.add_paragraph('')           # add a paragraph object
                #run_list = list()                       # it's a temporary list to hold a run that won't be highlighted.
                #sent_count = 0                          # reset the sentence counter for each paragraph 'p'.

                style = paragraphs[i]['style']         
                if style not in ['Normal', 'Heading 1', 'Heading 2', 'Heasing 3', 'Title']:
                    style = 'Normal'

                text = paragraphs[i]['text']

                # replace underscores with spaces if there are multi-word topics
                for mw_topic in DSDocument.multiword_topics: 
                    connected_mw_topic = mw_topic.replace(' ', '_')
                    text = text.replace(connected_mw_topic, mw_topic)
                    text = text.replace(connected_mw_topic.lower(), mw_topic.lower())
                    text = text.replace(connected_mw_topic.title(), mw_topic.title())
                    text = text.replace(connected_mw_topic.capitalize(), mw_topic.capitalize())

                if style.startswith('Heading') or style == 'Title':
                    r = p.add_run(text)
                    r.font.color.rgb = RGBColor(0,0,0)
                    if style == 'Title':
                        r.font.size = Pt(24)
                    else:
                        r.font.size = Pt(18)             
                    r.underline = False
                    r.bold = False
                else:
                    r = p.add_run(text)

        return res_docx

    ##
    # Mainly the content for the coherence panel, bottom (per sentence) portion
    ##
    def getLocalTopicalProgData(self, selected_paragraphs):
        print ("getLocalTopicalProgData ()")
        #print (selected_paragraphs)

        selected_paragraphs.sort()

        all_lemmas = list()
        temp = list()

        curr_section = self.sections[self.current_section]

        data = curr_section.get('data', None)

        if data is None:
            return []

        selected_para_list = list()
        for pos in selected_paragraphs:
            selected_para_list.append(data['paragraphs'][pos-1])

        for p in selected_para_list:
            for s in p['sentences']:                 # for each sentence
                for l in s['new_accum_lemmas']:      # for each new lemma
                    t = (l[POS], l[LEMMA])           # tuple = (POS, LEMMA)
                    if t not in temp:                # if the lemma 'l' is not already in the list,
                        all_lemmas.append((l[POS], l[LEMMA], l[8]))  # append a tuple (POS, LEMMA, first word_pos)
                        temp.append(t)

                for l in s['given_accum_lemmas']:    # for each given lemma
                    t = (l[POS], l[LEMMA])           # tuple = (POS, LEMMA)
                    if t not in temp:                # if the lemma 'l' is not already in the list,
                        all_lemmas.append((l[POS], l[LEMMA], l[8]))   # append a tuple (POS, LEMMA, first_word_pos)
                        temp.append(t)

        # Adding local given/new lemmas from adjacent paragraphs.
        if len(selected_paragraphs) > 1:        # applicable if 2 or more paragrpahs are selected.
            temp_count = 0
            p_all_lemmas = list() # all the global given & new lemmas.
            p_temp = temp
            for p in selected_para_list:
                for l in p['new_accum_lemmas']:
                    t = (l[POS], l[LEMMA])
                    if t not in p_temp:
                        p_all_lemmas.append((l[POS], l[LEMMA], l[8]))
                        p_temp.append(t)

                for l in p['given_accum_lemmas']:
                    t = (l[POS], l[LEMMA])
                    if t not in p_temp:
                        p_all_lemmas.append((l[POS], l[LEMMA], l[8]))
                        p_temp.append(t)

                temp_count += 1

            # Exclude the lemmas that do not appear in more than 2 paragraphs
            for l in p_all_lemmas:
                count = 0
                for p in selected_para_list:
                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in p['lemmas']]:
                        count += 1
                if count >= 2:
                    all_lemmas.append(l)

        all_lemmas.sort(key=lambda tup: tup[2])  # sort by the order of appearance.

        res = list()
        res.append(all_lemmas)
        p_count = 1

        bSkipPunct = False
        data = self.sections[self.current_section]['data']

        new_lemmas   = []
        given_lemmas = []
        prev_given_lemmas = []
        prev_para = None
        for p in selected_para_list:
            s_count = 1
            # we'll need to find a sentence with a single punctuation character.
            for s in p['sentences']:             
                if len(s['text']) == 1 and \
                       (s['text'] in dashes or \
                        s['text'] in hyphen_slash or \
                        s['text'] in left_quotes or \
                        s['text'] in right_quotes or \
                        s['text'] == ellipsis):
                    bSkipPunct = True
                else:
                    bSkipPunct = False

                # The following changes support the local cohesion visualization with 2 ore more paragraphs
                # remove any lemmas that have appeared in the previous paragraphs from new_lemmas list
                # new_lemmas   = list(set(s['new_accum_lemmas']) - set(prev_given_lemmas)) # OLD

                # add the given_accum_lemmas from the last sentence of the previous paragraphs
                # and remove duplicates

                s_lemmas = [t[:4] for t in s['lemmas']]
                s_new_accum_lemmas   = [t[:4] for t in s['new_accum_lemmas']]
                s_given_accum_lemmas = [t[:4] for t in s['given_accum_lemmas']]

                new_lemmas = list(set(s_lemmas) & (set(s_new_accum_lemmas) - set(prev_given_lemmas)))

                if prev_para is not None:
                    prev_para_given_accum_lemmas = [t[:4] for t in prev_para['given_accum_lemmas'] ]
                    prev_para_new_accum_lemmas   = [t[:4] for t in prev_para['new_accum_lemmas'] ]

                    given_lemmas = list(set(s_lemmas) &
                                        set(s_given_accum_lemmas + prev_given_lemmas + \
                                                                   prev_para_given_accum_lemmas + \
                                                                   prev_para_new_accum_lemmas))
                else:
                    given_lemmas = list(set(s_lemmas) & 
                                        set(s_given_accum_lemmas + prev_given_lemmas))

                new_lemmas = list(set(s['lemmas']) & (set(s['new_accum_lemmas']) - set(prev_given_lemmas)))

                sres = list() # get an empty list
                for l in all_lemmas:
                    is_new   = False
                    is_given = False

                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in new_lemmas]:
                        is_new = True

                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in given_lemmas]:
                        is_given = True

                    is_match = False                    
                    if is_new or is_given:
                        is_left = False
                        left_t = None
                        for sl in s['lemmas']: 

                            if sl[LEMMA] == l[1]:

                                # LOCAL
                                # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 4.DEP, 5.STEM,  
                                # 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA, 
                                # 10.PARA_POS, 11.SENT_POS, 12.NEW, 13.GIVEN, 14.IS_SKIP, 15.IS_TOPIC

                                if sl[ISLEFT]:
                                    is_left = True
                                    left_t = sl + tuple([p_count, s_count, is_new, is_given, bSkipPunct, True])
                                elif is_left == False:
                                    t = sl + tuple([p_count, s_count, is_new, is_given, bSkipPunct, False])

                                is_match = True
                                break   # 2021.11.21

                        if is_match:
                            if is_left and left_t is not None:
                                sres.append(left_t) 
                            else:
                                sres.append(t)

                    if is_match == False:
                        sres.append(tuple([None, bSkipPunct]))

                # for each lemmas in 'all_lemmas'
                
                res.append(sres) 
                s_count += 1

                prev_given_lemmas = given_lemmas
                prev_para = p

            res.append([-1]*(len(all_lemmas)+2))            
            p_count += 1

        res = res[:-1]
        return res

    ##
    # Mainly the content for the coherence panel, top portion
    ##
    def getGlobalTopicalProgData(self, sort_by=views.TOPIC_SORT_APPEARANCE):
        print ("getGlobalTopicalProgData ()")

        # first we should make a list of given lemmas as they appear in the text
        all_lemmas = list()

        temp = list()

        if self.sections is None:
            return

        #print (self.current_section)
        #print (self.sections)        

        data      = self.sections[self.current_section]['data']
        #para_data = self.sections[self.current_section]['para_data']

        if data is None:
            return

        for p in data['paragraphs']:                 # for each paragraph
                for l in p['new_accum_lemmas']:      # for each new lemma
                    t = (l[POS], l[LEMMA])           # tuple = (POS, LEMMA)
                    if t not in temp:                # if the lemma 'l' is not already in the list,
                        all_lemmas.append((l[POS], l[LEMMA],l[8]))  # append a tuple (POS, LEMMA, word_pos)  
                        temp.append(t)
                for l in p['given_accum_lemmas']:    # for each new lemma
                    t = (l[POS], l[LEMMA])           # tuple = (POS, LEMMA)
                    if t not in temp:                # if the lemma 'l' is not already in the list,
                        all_lemmas.append((l[POS], l[LEMMA],l[8]))  # append a tuple (POS, LEMMA, word_pos)
                        temp.append(t)

        # Count how many times each topic appears on the left side of a sentence.
        sent_topic_counter = Counter()
        para_topic_set = set()
        p_count = 1
        for p in data['paragraphs']:        # for each paragraph
            s_count = 1
            for s in p['sentences']:             # for each sentence
                for l in all_lemmas:             # for each topic candidate
                    is_new   = False
                    is_given = False

                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in p['new_accum_lemmas']]:
                        is_new = True
                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in p['given_accum_lemmas']]:
                        is_given = True

                    if is_new or is_given:            # if 'l' is given or new
                        for sl in s['lemmas']:
                            if sl[LEMMA] == l[1] and sl[POS] == l[0]:
                                if sl[ISLEFT]:
                                    sent_topic_counter[sl[LEMMA]] += 1
                                    para_topic_set.add( (p_count, sl[LEMMA]) )
            p_count += 1

        para_topic_counter = Counter()
        for t in para_topic_set:
            para_topic_counter[t[1]] += 1

        all_lemmas = list()
        temp = list()
        for p in data['paragraphs']:                 # for each paragraph
                for l in p['new_accum_lemmas']:      # for each new lemma
                    t = (l[POS], l[LEMMA])           # tuple = (POS, LEMMA)
                    if t not in temp:                # if the lemma 'l' is not already in the list,
                        s_topic_count = sent_topic_counter[l[LEMMA]]
                        p_topic_count = para_topic_counter[l[LEMMA]]
                        all_lemmas.append((l[POS], l[LEMMA],l[8], s_topic_count, p_topic_count))  # append a tuple (POS, LEMMA, word_pos)  
                        temp.append(t)
                for l in p['given_accum_lemmas']:    # for each new lemma
                    t = (l[POS], l[LEMMA])           # tuple = (POS, LEMMA)
                    if t not in temp:                # if the lemma 'l' is not already in the list,
                        s_topic_count = sent_topic_counter[l[LEMMA]]
                        p_topic_count = para_topic_counter[l[LEMMA]]
                        all_lemmas.append((l[POS], l[LEMMA],l[8], s_topic_count, p_topic_count))  # append a tuple (POS, LEMMA, word_pos)
                        temp.append(t)

        ###### 
        all_lemmas.sort(key=lambda tup: tup[2])      # sort by the order of appearance.
        if sort_by == views.TOPIC_SORT_LEFT_COUNT:
            all_lemmas.sort(key=lambda tup: tup[3], reverse=True)      # sort by the total left count

        res = list()
        res.append(all_lemmas)
        collapsed_res = list()
        res.append([-1]*(len(all_lemmas)+2))

        # data = self.sections[self.current_section]['data']
        p_count = 1
        pres = [None] * (len(data['paragraphs'])+2)
        pres[0] = all_lemmas
        pres[1] = ([-1]*(len(all_lemmas)+2))

        bSkipPunct = False

        # NOTE: Create a dictionary that keeps track of given/new counts
        # given_new_counts = dict()

        for p in data['paragraphs']:        # for each paragraph
            s_count = 1

            for s in p['sentences']:             # for each sentence
                # if s['text'] is a single character, and one of these punct chracters
                # we'll make the row as bSkipPunct == True.
                if len(s['text']) == 1 and \
                       (s['text'] in dashes or \
                        s['text'] in hyphen_slash or \
                        s['text'] in left_quotes or \
                        s['text'] in right_quotes or \
                        s['text'] == ellipsis):
                    bSkipPunct = True
                else:
                    bSkipPunct = False

                sres = list()                    # get an empty list
                for l in all_lemmas:             # for each topic candidate
                    is_new   = False
                    is_given = False

                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in p['new_accum_lemmas']]:
                        is_new = True
                    if (l[0], l[1]) in [(t[POS], t[LEMMA]) for t in p['given_accum_lemmas']]:
                        is_given = True

                    is_match = False                    
                    if is_new or is_given:            # if 'l' is given or new
                        is_left = False
                        left_t = None
                        for sl in s['lemmas']:
                            # and the lemma is also in the sentence. 
                            if sl[LEMMA] == l[1] and sl[POS] == l[0]:

                                # Global
                                # t = 0.POS, 1.WORD, 2.LEMMA, 3.ISLEFT, 4.DEP, 5.STEM, 
                                # 6.LINKS, 7.QUOTE, 8.WORD_POS, 9.DS_DATA, 10.PARA_POS, 11.SENT_POS
                                # 12.NEW, 13.GIVEN, 14.IS_SKIP, 15.IS_TOPIC

                                if sl[ISLEFT]:
                                    is_left = True
                                    left_t = sl + tuple([p_count, s_count, is_new, is_given, bSkipPunct, is_left])
                                elif is_left == False:
                                    t = sl + tuple([p_count, s_count, is_new, is_given, bSkipPunct, is_left])

                                is_match = True
                                break   # 2021.11.21

                        if is_match:
                            if is_left and left_t is not None:
                                pres[p_count+1] = left_t
                                sres.append(left_t) 
                            else:
                                pres[p_count+1] = t
                                sres.append(t)

                    if is_match == False:
                        sres.append(tuple([None, bSkipPunct]))

                    # end of 'for l in all_lemmas:'

                # append a sentencce
                collapsed_res.append(pres)
                res.append(sres)              

                s_count += 1
                # end of 'for s in p['sentences']:'
                            
            res.append([-1]*(len(all_lemmas)+2))
            p_count += 1

            # end of 'for p in data['paragraphs']:''

        # print("para_data: ----------------")  # for debugging...
        # for pd in para_data:
            # pd.printData()

        #return {'data': res, 'para_data': para_data}

        return {'data': res, 'para_data': []}

    ##
    # Main OnTopic style data
    ##
    def getSentStructureData(self):
        p_count = 1
        res = list()
        res.append("\n") # paragraph break
        bSkipPunct = False

        if self.sections is None: 
            return res

        if len(self.sections) <= self.current_section:
            return
            
        data = self.sections[self.current_section]['data']
        for p in data['paragraphs']:        # for each paragraph
            s_count = 1
            for s in p['sentences']:             # for each sentence
                if len(s['text']) == 1 and \
                       (s['text'] in dashes or \
                        s['text'] in hyphen_slash or \
                        s['text'] in left_quotes or \
                        s['text'] in right_quotes or \
                        s['text'] == ellipsis):
                    bSkipPunct = True
                else:
                    bSkipPunct = False

                # res.append(tuple([p_count, s_count, s['sent_analysis'], s['text'], bSkipPunct]))
                res.append(tuple([p_count, s_count, s['sent_analysis'], s, bSkipPunct]))
                s_count += 1

            res.append("\n")                     # paragraph break
            p_count += 1

        return res

    ########################################
    #
    # Debugging tools
    #
    ########################################
    def saveJSON(self, filepath):
        filename = "{}.json".format(filepath)
        fout = open(filename, "w")
        fout.write(json.dumps(self.sections, indent=4))
        fout.close()

    def exportToCSV(self, filepath):
        """
        e.g., ["Dog", 'dog']
        POS      = 0          # Part of Speech
        WORD     = 1          # Original Word
        LEMMA    = 2          # Lemmatized word
        ISLEFT   = 3          # True if the word is on the left side of the main verb
        SUBJ     = 3          # True if the word is on the left side of the main verb (SUBJ = ISLEFT) same thing!!
        DEP      = 4          # Dependency Type (e.g., 'pobj', 'nsubj', etc.)
        STEM     = 5          # Stem of the word
        LINKS    = 6          # If it is a verb, it is the total # of links from the verb. Otherwise, None.
        QUOTE    = 7          # QUOTED or not
        WORD_POS = 8          # Indexes between 8 and 13 have been changed on July 17.
        DS_DATA  = 9          # DocuScope Data (i.e., models.DSWord)

        """

        output = []
        if self.sections:
            data = self.sections[self.current_section]['data']
            for para in data['paragraphs']:    # for each paragraph
                for sent in para['sentences']: # for each sentence
                    for w in sent['text_w_info']: 
                        line = list(w[:DS_DATA])
                        dsw = w[DS_DATA]
                        if dsw is not None:
                            line = line + [dsw.getEnd(), dsw.getLAT(), dsw.getPos()]
                            output.append(line)

            with open(filepath, 'w') as fout:
                for line in output:
                    fout.write("{}\n".format(str(line)[1:-1]))

    def getSentencesWithDimension(self, cluster_name, dimension_name):

        if cluster_name is None or dimension_name is None:
            return []

        if self.sections:
            data = self.sections[self.current_section]['data']

            sent_list = list()
            pcount = 1
            for para in data['paragraphs']:    # for each paragraph

                scount = 1
                for sent in para['sentences']: # for each sentence

                    wcount = 1
                    for w in sent['text_w_info']: 

                        dsw = w[DS_DATA]
                        if dsw is not None:
                            lat = dsw.getLAT()
                            dim, clust = self.dictionary.getDimensionAndCluster(lat)

                            if clust == cluster_name and \
                               dim == dimension_name and \
                               (pcount, scount) not in sent_list:

                                sent_list.append((pcount, scount, wcount))

                        wcount += 1
                        
                    scount += 1

                pcount += 1

            if sent_list:
                return sent_list
            else:
                return []

    def getSentencesWithCluster(self, cluster_name):

        if cluster_name is None:
            return []

        if self.sections:
            data = self.sections[self.current_section]['data']

            sent_list = list()
            pcount = 1
            for para in data['paragraphs']:    # for each paragraph

                scount = 1
                for sent in para['sentences']: # for each sentence

                    wcount = 1
                    for w in sent['text_w_info']: 

                        dsw = w[DS_DATA]
                        if dsw is not None:
                            lat = dsw.getLAT()

                            dim, clust = self.dictionary.getDimensionAndCluster(lat)
                            if clust == cluster_name and (pcount, scount) not in sent_list:
                                sent_list.append((pcount, scount, wcount))

                        wcount += 1
                        
                    scount += 1

                pcount += 1

            if sent_list:
                return sent_list
            else:
                return []

    def getSentencesWithImpression(self, impression):

        if impression is None:
            return []

        if self.sections:
            data = self.sections[self.current_section]['data']

            sent_list = list()
            pcount = 1
            for para in data['paragraphs']:    # for each paragraph

                scount = 1
                for sent in para['sentences']: # for each sentence

                    wcount = 1
                    for w in sent['text_w_info']: 
                        lemma = w[LEMMA]
                        if lemma == impression:
                            sent_list.append((pcount, scount, wcount))
                        wcount += 1
                        
                    scount += 1

                pcount += 1

            if sent_list:
                return sent_list
            else:
                return []

    ### UNUSED NOW ####
    def getAdjacentDSCategories(self, topic):

        def isTopicInSent(sent, topic):
            for w in sent['text_w_info']:
                if w[lemma] == topic:
                    return True
            return False

        if self.sections:
            data = self.sections[self.current_section]['data']

            patterns = []

            for para in data['paragraphs']:    # for each paragraph
                for sent in para['sentences']: # for each sentence

                    lats_sentence  = []
                    lats_paragraph = []
                    lats_adjacent  = []

                    if isTopicInSent(sent):
                        # if 'topic' is in this sentence, add all the docuscope categories
                        # in this sentence to the result.
                        for w in sent['text_w_info']: 
                            dsw = w[DS_DATA]
                            end = dsw.getEnd()
                            lat = getLAT()
                            pos = getPos()

                        line = line + [dsw.getEnd(), dsw.getLAT(), dsw.getPos()]

            return adj_categories

        return None

    def calculateAdjacencyStats(self, topic=None, para_pos=-1):
        """
        para_pos starts with 0, but pcount starts with 1. :-) FIXIT.
        """
        if self.sections is None:
            return "Error in calculateAdjacencyStats()"
        else:
            try:
                data = self.sections[self.current_section]['data']
                if data is None:
                    raise valueError;
            except:
                return

        adj_stats = AdjacencyStats(topic=topic, controller=self.controller)

        topic_filter = self.controller.getTopicFilter()

        # Let's find which paragraphs/sentences the selected 'topic' is included.
        pcount = 1
        for para in data['paragraphs']:
            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                continue

            for sent in para['sentences']:

                wcount = 1
                for w in sent['text_w_info']: 

                    if w[LEMMA] == topic and (w[POS] == 'NOUN' or w[POS] == 'PRP'):
                        if topic_filter == views.TOPIC_FILTER_LEFT and w[ISLEFT] == False:  ## NEW 3/2/21
                            pass
                        else:
                            adj_stats.addParagraphID(pcount)
                            adj_stats.addSentenceID(pcount, scount)
                            adj_stats.addTopicPosition(pcount, scount, wcount)

                    wcount += 1

                scount+=1

            pcount+=1
        
        bTagOpen = False
        bParaCrossingPattern = False

        dsw   = None
        lat   = ''
        end   = ''
        pos   = ''
        clust_list = list()
        dim_list   = list()
        lat_list   = list()
        pcount = 1

        for para in data['paragraphs']:    # for each paragraph
            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                continue

            if adj_stats.isTopicPara(pcount) == False:
                # skip the paragraphs that do not include the topic word.
                pcount += 1
                continue

            for sent in para['sentences']:

                if adj_stats.isTopicSent(scount, pcount) == False:
                    # skip the sentences that do not include the topic word.
                    bParaCrossingPattern = False
                    scount += 1
                    continue

                total_words = len(sent['text_w_info'])
                word_count = 0

                for w in sent['text_w_info']: 
                    dsw   = w[DS_DATA]      # docuscope word

                    if dsw is not None:
                        lat   = dsw.getLAT()

                        if lat is not None:
                            # pos = int(round(float(pos)))
                            pos   = dsw.getPos()
                            if pos == 0:                # The first word of a DS TAG
                                if bTagOpen == True:    # if a tag is open, close it.
                                    # New tag
                                    # adj_stats.addLAT(lat) no no... we are closing the tag here.
                                    bTagOpen = False

                                if bTagOpen == False:        
                                    if word_count == (total_words-1) and w[WORD] == '.' and pos == 0 and lat != '':
                                        # new tag starting with a period at the end of a sentence.
                                        bParaCrossingPattern = True

                                    else:
                                        # New tag
                                        adj_stats.addLAT(lat, pcount, scount)
                                        bTagOpen = True

                            elif bParaCrossingPattern == True:
                                bTagOpen = True             
                                # New tag
                                adj_stats.addLAT(lat, pcount, scount)
                                bParaCrossingPattern = False

                    word_count += 1

                scount += 1
            # sent
            # adj_stats.setText(para['text'], pcount)

            pcount += 1

        # adj_stats.print()
        return adj_stats

    def calculateAggregatedAdjacencyStats(self, topics=None, para_pos=-1):
        """
        para_pos starts with 0, but pcount starts with 1. :-) FIXIT.
        """

        if self.sections is None:
            return "Error in calculateAggregatedAdjacencyStats()"
        else:
            try:
                data = self.sections[self.current_section]['data']
                if data is None:
                    raise valueError;
            except:
                return

        topic_filter = self.controller.getTopicFilter()
        adj_stats = AdjacencyStats(controller=self.controller)

        # Let's find which paragraphs/sentences the selected 'topic' is included.
        pcount = 1
        for para in data['paragraphs']:
            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                continue

            for sent in para['sentences']:
                for w in sent['text_w_info']: 
                    if w[LEMMA] in topics:
                        if topic_filter == views.TOPIC_FILTER_LEFT and w[ISLEFT] == False:  # NEW 3/2/21
                            pass
                        adj_stats.addParagraphID(pcount)
                        adj_stats.addSentenceID(pcount, scount)
                scount+=1
            pcount+=1

        bTagOpen = False
        bParaCrossingPattern = False

        dsw   = None
        lat   = ''
        end   = ''
        pos   = ''
        clust_list = list()
        dim_list   = list()
        lat_list   = list()
        pcount = 1

        for para in data['paragraphs']:    # for each paragraph
            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                continue

            if adj_stats.isTopicPara(pcount) == False:
                # skip the paragraphs that do not include the topic word.
                pcount += 1
                continue

            for sent in para['sentences']:

                if adj_stats.isTopicSent(scount, pcount) == False:
                    # skip the sentences that do not include the topic word.
                    bParaCrossingPattern = False
                    scount += 1
                    continue

                total_words = len(sent['text_w_info'])
                word_count = 0

                for w in sent['text_w_info']: 
                    dsw   = w[DS_DATA]      # docuscope word

                    if dsw is not None:
                        lat   = dsw.getLAT()
                        pos   = dsw.getPos()
                        pos = int(round(float(pos)))

                        if lat is not None:
                            if pos == 0:                # The first word of a DS TAG
                                if bTagOpen == True:    # if a tag is open, close it.
                                    # New tag
                                    # adj_stats.addLAT(lat) no no... we are closing the tag here.
                                    bTagOpen = False

                                if bTagOpen == False:        
                                    if word_count == (total_words-1) and w[WORD] == '.' and pos == 0 and lat != '':
                                        # new tag starting with a period at the end of a sentence.
                                        bParaCrossingPattern = True

                                    else:
                                        # New tag
                                        adj_stats.addLAT(lat, pcount, scount)
                                        bTagOpen = True

                            elif bParaCrossingPattern == True:
                                bTagOpen = True             
                                # New tag
                                adj_stats.addLAT(lat, pcount, scount)
                                bParaCrossingPattern = False

                            elif word_count == 0 and pos ==1:
                                # A pattern started in the previous sentence (e.g,. ". He"), but
                                # the previous sentenc is not a topic sentence.
                                adj_stats.addLAT(lat, pcount, scount)
                                bTagOpen = True

                    word_count += 1

                scount += 1
            # sent

            adj_stats.setText(para['text'], pcount)

            pcount += 1

        return adj_stats


    def calculateParaStats(self, para_pos=-1):
        """
        This function is used to get the stats spefific to the given paragraph.
        It is used by the controller to update the dictionary tree.        
        """

        if self.sections is None:
            return "Error in calculateAdjacencyStats()"
        else:
            try:
                data = self.sections[self.current_section]['data']
                if data is None:
                    raise valueError;
            except:
                return

        adj_stats = AdjacencyStats(topic=None, controller=self.controller)

        # Let's find which paragraphs/sentences the selected 'topic' is included.
        pcount = 1
        for para in data['paragraphs']:
            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1

                continue

            for sent in para['sentences']:
                for w in sent['text_w_info']: 
                    adj_stats.addParagraphID(pcount)
                    adj_stats.addSentenceID(pcount, scount)
                scount+=1
            pcount+=1

        bTagOpen = False
        bParaCrossingPattern = False

        dsw   = None
        lat   = ''
        end   = ''
        pos   = ''
        clust_list = list()
        dim_list   = list()
        lat_list   = list()
        pcount = 1

        for para in data['paragraphs']:    # for each paragraph
            scount = 1

            if para_pos != -1 and (para_pos+1) != pcount:
                pcount += 1
                continue

            for sent in para['sentences']:

                total_words = len(sent['text_w_info'])
                word_count = 0

                for w in sent['text_w_info']: 
                    dsw   = w[DS_DATA]      # docuscope word

                    if dsw is not None:
                        lat   = dsw.getLAT()
                        pos   = dsw.getPos()
                        pos = int(round(float(pos)))

                        if lat is not None:
                            if pos == 0:                # The first word of a DS TAG
                                if bTagOpen == True:    # if a tag is open, close it.
                                    # New tag
                                    # adj_stats.addLAT(lat) no no... we are closing the tag here.
                                    bTagOpen = False

                                if bTagOpen == False:        
                                    if word_count == (total_words-1) and w[WORD] == '.' and pos == 0 and lat != '':
                                        # new tag starting with a period at the end of a sentence.
                                        bParaCrossingPattern = True

                                    else:
                                        # New tag
                                        adj_stats.addLAT(lat, pcount, scount)
                                        bTagOpen = True

                            elif bParaCrossingPattern == True:
                                bTagOpen = True             
                                # New tag
                                adj_stats.addLAT(lat, pcount, scount)
                                bParaCrossingPattern = False

                    word_count += 1

                scount += 1
            # sent
            pcount += 1

        return adj_stats

    ########################################
    #
    # DocuScope Data Processing 
    #
    ########################################

    def setDSCategories(self, section_id=None):
        list_of_errors = list()
        if self.sections is not None:
            if section_id is not None:
                errors = self.setDSCategoriesOne(section_id)
                if errors['positions']:                
                    list_of_errors = [errors]
                self.calculateDSTemporalStats(section_id)
            else:
                for section_id in range(len(self.sections)):
                    errors = self.setDSCategoriesOne(section_id)
                    if errors['positions']:
                        list_of_errors.append(errors)
                    self.calculateDSTemporalStats(section_id)

        return list_of_errors

    # per section
    def setDSCategoriesOne(self, section_id):

        errors = dict()
        errors['positions'] = list()

        def makeError(section_id, pcount, scount, patterns):

            pkey = 'sect{}_p{}'.format(section_id, pcount)
            if pkey not in errors:
                errors[pkey] = para['text']

            skey = 'sect{}_p{}s{}'.format(section_id, pcount, scount)
            if skey not in errors:
                errors[skey] = sent['text']

                d = dict()
                d['sect_pos'] = section_id
                d['ppos'] = pcount
                d['spos'] = scount
                d['patterns'] = (dsw.getWord(), otw[WORD])
                errors['positions'].append(d)

        section_data = self.sections[section_id]
        ot_data = section_data['data'] 
        ds_data = self.generateOTCompatibleData(section_id)

        ds_count = 0
        if ot_data is not None:
            is_ot_data = True
            pcount = 0

            for para in ot_data['paragraphs']:    # for each paragraph
                scount = 0
                for sent in para['sentences']:     # for each sentence
                    for ot_count in range(len(sent['text_w_info'])):

                        if ds_count >= len(ds_data):
                            break

                        dsw = ds_data[ds_count]                  # docuscope data
                        otw = sent['text_w_info'][ot_count]      # ontopic data

                        if dsw.getWord() == otw[WORD]: # match
                            sent['text_w_info'][ot_count] = otw[:-1] + (dsw,)

                        elif (ds_count+1) < len(ds_data): # no match (misalignement)

                            dsw_word = dsw.getWord()
                            next_dsw = ds_data[ds_count+1]
                            next_dsw_word = next_dsw.getWord()
                            otw_word = otw[WORD]

                            if next_dsw_word == '.':
                                # We have a case where a period is used in abbreviations etc. 
                                # (not at the end of a sentence.)
                                sent['text_w_info'][ot_count] = otw[:-1] + (dsw,)
                                ds_count += 1

                            elif otw_word == '\'s' and dsw_word == '\'' and next_dsw_word == 's':
                                # Apostorophe + s.
                                sent['text_w_info'][ot_count] = otw[:-1] + (dsw,)
                                ds_count += 1

                            elif otw_word.startswith(dsw_word):
                                pos = len(dsw_word)
                                temp_word = dsw_word
                                while pos < len(otw_word):   
                                    next_dsw = ds_data[ds_count+1]
                                    next_dsw_word = next_dsw.getWord()
                                    temp_word += next_dsw_word
                                    ds_count+=1
                                    pos += len(next_dsw_word)

                                if temp_word == otw_word:
                                    sent['text_w_info'][ot_count] = otw[:-1] + (dsw,)

                                else:
                                    # we couldn't find a way to resolve the error. It can be
                                    # caused by generateOTCompatibleData() or OT parser messed up the
                                    # order of words.
                                    makeError(section_id, pcount, scount, (dsw.getWord(), otw[WORD]))

                            else:
                                makeError(section_id, pcount, scount, (dsw.getWord(), otw[WORD]))

                        ds_count += 1
                    scount += 1
                pcount += 1

        return errors

    def generateOTCompatibleData(self, section_id, debug=False):

        def endswith_no_space_pattern(w):
            for p in no_space_patterns:
                if w.endswith(p):
                    return len(w) - len(p)
            return 0

        def slashed_word(w):

            l = w.split('/')

            if len(l) == 1:
                return False

            temp = list()
            for i in range(len(l)):
                temp.append(l[i])
                if i < len(l)-1:
                    temp.append('/')

            res = list()
            for i in range(len(temp)):
                if temp[i] != '':
                    res.append(temp[i])

            return res

        def hyphenated_word(w):
            l = w.split('-')

            if len(l) == 1:
                return False

            temp = list()
            for i in range(len(l)):
                temp.append(l[i])
                if i < len(l)-1:
                    temp.append('-')

            res = list()
            for i in range(len(temp)):
                if temp[i] != '':
                    res.append(temp[i])

            return res

        if self.sections is None or self.current_section >= len(self.sections):
            return

        token_data = self.sections[section_id].get('token_data','')

        output = list()
        word_count = 0
        for line in token_data.split('\n'):   # each line is a word
            if line:
                # replace commas with '\u0000'
                line = re.sub('\",\"(?=,)', '\u0000', line)
                token_info = line.split(',')

                # get a list of numbers with thousand separator(s)
                # num_list = re.findall("\"[0-9,.]+\"(?=,)", line) 
                num_list = re.findall("\"[\sA-Za-z=0-9,.]+\"(?=,)", line)   # revised Apr 20, 2021
                if num_list:
                    token_info = num_list + token_info[-3:]
            else:
                continue

            if len(token_info) != 5:
                continue

            word_count += 1

            word  = token_info[0]    # original word
            lword = token_info[1]    # lowercase word
            end   = token_info[2]    # end reason
            lat   = token_info[3]    # category
            pos   = token_info[4]    # 

            if pos != '':
                pos = int(token_info[4])
            else:
                pos = -1

            if word in right_quotes:   # New (May 4, 2020)
                end = 'c'

            words = None

            # if word ends with a no_space_pattern:
            split_at = endswith_no_space_pattern(word)
            if split_at > 0:
                w1 = word[:split_at]
                w2 = word[split_at:]

                res = hyphenated_word(w1)
                if res != False:
                    res.append(w2)
                    words = res
                else:
                    words = [w1, w2]
            else:
                res = hyphenated_word(word)
                if res != False:
                    words = res
                else:
                    res = slashed_word(word)
                    if res != False:
                        words = res

            if words is not None:
                # 'word' is split now so len(words) should be > 1.
                num_words = len(words)  # 2
                if num_words > 1:
                    # just in case, check if num_words is > 1.
                    for i in range(num_words):  # 0, 1
                        # add each word to 'output'
                        w = words[i]                    # get the i-th word.   # i=0, 1
                        if i < num_words-1:             # num_words-1 = 0
                            line = [w, w.lower(), 'c', lat, pos+i]
                        else:
                            # use 'end' at the end.
                            line = [w, w.lower(), end, lat, pos+i] 
                        output.append(line)
                else:
                    line = [word, lword, end, lat, pos]
                    output.append(line)
            else:
                if word == '\u0000':
                    word  = ','
                    lword = ','

                line = [word, lword, end, lat, pos]
                output.append(line)

        res = list()
        for line in output:
            # [word, lword, end, lat, pos]
            res.append(DSWord(line[0], line[1], line[2], line[3], line[4]))

        # # Debugging
        if debug:
            error_table = ""
            ot_words = list()
            for section in self.sections:
                data = section['data']
                for p in data['paragraphs']:
                    for s in p['sentences']:
                        for w in s['text_w_info']:
                             ot_words.append(w[WORD])

            csv_file = "debugging_{}.csv".format(section_id)
            for i in range(len(output)):
                line = output[i]
                if i >= len(ot_words):
                    break
                w = ot_words[i]
                error_table += "{},{},{},{},{},{}\n".format(line[0], line[1], line[2], line[3], line[4], w)
            # with open(csv_file, 'w') as fout:
                # fout.write(error_table)
            return error_table
        else:
            return res

    def processTokenData(self, section_id=None, section=None):
        """
        This function uses the token dataset (via csv file) created by DocuScope for a section,
        and generate a set of tags (with positions etc.). Tags data are used to identify
        the category of DS patterns in the editor.
        """

        if section is None and section_id is not None:
            section = self.sections[section_id]
            token_data = section.get('token_data', '')
        elif section is not None:
            token_data = section.get('token_data', '')

        bTagOpen = False
        bParaCrossingPattern = False

        end_str = ''

        pcount = 0

        pattern = ""
        tags = dict()
        tags[0] = list()

        word = ''
        pat_start = 0
        pat_end   = 0
        pattern_t = None

        lines = token_data.split('\n')

        for i in range(len(lines)):
            line = lines[i]

            if line:
                # replace commas with '\u0000'
                line = re.sub('\",\"(?=,)', '\u0000', line)
                token_info = line.split(',')

                # Get a list of numbers with thousand separator(s), followed by a comma separator
                # This also captures patterns like N=2,000 etc.
                # num_list = re.findall("\"[0-9,.]+\"(?=,)", line)  # old
                num_list = re.findall("\"[\sA-Za-z=0-9,.]+\"(?=,)", line)   # revised Apr 20, 2021               
                if num_list:
                    token_info = num_list + token_info[-3:]

            else:
                continue

            prev_word = word
            word = token_info[0]    # original word
            end  = token_info[2]    # end reason
            lat  = token_info[3]    # category
            pos  = token_info[4]

            # print("token_info =", token_info)
            # print("word =", word)
            # print("pos  =", pos)

            quoted_num = re.search('\"[0-9,.]+\"', word)
            if quoted_num is not None:
                word = word[1:-1]

            if word in right_quotes and prev_word == ellipsis:          # an ellipsis followed by a right quote
                end_str = end_str[:-1]

            elif word in end_puncts and prev_word in right_quotes:      # a right quote followed by an end punct.
                end_str = end_str[:-1]

            elif word in end_puncts and prev_word == ellipsis:          # an ellipsis followed by an end punct
                end_str = end_str[:-1]

            elif word == ellipsis and end_str and end_str[-1] != ' ':   # no space before an ellipsis. add a space.
                end_str += ' '

            elif word in hyphen_slash and end_str and end_str[-1] == ' ':  # a space before a hyphen/slash, there
                end_str = end_str[:-1]                                     # must be a space after a hyphen/slash

            elif word == 'not' and prev_word == 'can' and i+1 < len(lines):
                # a special case. We need to remove the space between "can" and "not", 
                # unless it is followed by 'only'.
                next_line = lines[i+1]                    # get the next line
                next_token_info = next_line.split(',')    # we don't worry about it being a number.
                next_word = next_token_info[0]            # next token
                if next_word != 'only':                   # if the next word is not "only",
                    end_str = end_str[:-1]                # remove the space after "can"

            elif word == "%" and end_str and end_str[-1] == ' ':
                end_str = end_str[:-1]

            dim, clust = self.dictionary.getDimensionAndCluster(lat)

            if pos != '':
                pos = int(token_info[4])
            else:
                pos = -1

            if pos == 0:
                if bTagOpen == True:         # if a tag is open, close it.
                    bTagOpen = False

                    pat_end = pat_start + len(pattern)
                    tags[pcount].append( ((pat_start, pat_end), pattern, (prev_clust, prev_dim, prev_lat)) )

                    if len(end_str) <= 1:
                        pat_start = pat_end + len(end_str)
                    else:
                        pat_start = pat_end

                    pattern = ''

                if bTagOpen == False:        # if a tag is not open, start a new one.
                    if end == 'n' and word == '.' and pos == 0 and lat != '':
                        # If the period at the end of a pragraph is part of a pattern.
                        bParaCrossingPattern = True
                    else:
                        if lat == '' or lat == 'UNRECOGNIZED':
                            lat = 'na'
                        else:
                            pass
                        bTagOpen = True

            elif bParaCrossingPattern:
                if len(end_str) <= 1:                
                    pattern += end_str

                bTagOpen = True                
                bParaCrossingPattern = False
            else:
                if len(end_str) <= 1:                
                    pattern += end_str                

            if word == '\"\"\"\"':
                pattern += '\"'             
            elif word == '\'\'\'\'':
                pattern += '\"'          
            elif word == '\\':
                pattern += '\\'
            elif word == '\u0000':
                pattern += ','
            else:
                pattern += word

            end_str = ''
            if end in ['n', 'nn', 'nnn', 'nnnn', 'nnnnn']:
                pcount+=1
                end_str += ''
                tags[pcount] = list()
                pat_start = 0
                pattern = ''

            elif word == ellipsis:
                end_str += ' '

            elif word in left_quotes or word in hyphen_slash:
                end_str += ''

            elif end == 's':           # space
                end_str += ' '

            elif end == 'c':           # no space
                end_str += ''

            prev_clust = clust
            prev_dim   = dim
            prev_lat   = lat

        if bTagOpen == True:
            pat_end = pat_start + len(pattern)
            tags[pcount].append( ((pat_start, pat_end), pattern, (clust, dim, lat)) )

            if len(end_str) <= 1:
                pat_start = pat_end + len(end_str)
            else:
                pat_start = pat_end            
            # pat_start = pat_end + 1
            pattern = ''

        section['tags'] = tags

    def calculateDSTemporalStats(self, section_id):

        section_data = self.sections[section_id]
        token_data = section_data.get('token_data', None)

        if token_data is None or self.dictionary is None:
            return

        bTagOpen = False
        bParaCrossingPattern = False

        para_count = 1

        lats_by_para    = list()        # list of lists
        para_data    = ds_stat.DSStat()
        para = ""

        word_count = 0
        for line in token_data.split('\n'):

            line = re.sub('\",\"(?=,)', '\u0000', line)
            token_info = line.split(',')

            if len(token_info) != 5:
                continue

            word_count += 1

            try:
                word = token_info[0]    # original word
                end  = token_info[2]    # end reason
                lat  = token_info[3]    # category
                pos  = token_info[4]

                if pos != '':
                    pos = int(float(token_info[4]))
                else:
                    pos = -1

            except:
                pass

            if pos == 0:                    # first token
                if bTagOpen == True:        # if a tag is open, close it.
                    bTagOpen = False
                    para    += end_str

                if bTagOpen == False:       # if a tag is not open, start a new one.
                    if end == 'n' and word == '.' and pos == 0 and lat != '':
                        # If the period at the end of a pragraph is part of a pattern.
                        bParaCrossingPattern = True
                    else:
                        bTagOpen = True
                        dim, clust = self.dictionary.getDimensionAndCluster(lat)

                        if clust is not None:
                            para_data.addCluster(clust)
                            para_data.addDimension(dim)
                            para_data.addLAT(lat)

            elif bParaCrossingPattern:
                dim, clust = self.dictionary.getDimensionAndCluster(lat)
                if clust is not None:
                    para_data.addCluster(clust)
                    para_data.addDimension(dim)
                    para_data.addLAT(lat)

                bTagOpen = True                
                bParaCrossingPattern = False

            else:
                para    += end_str

            if word == '\"\"\"\"':
                para += '\"'

            elif word == '\'\'\'\'':
                para += '\"'

            elif word == '\u0000':
                para += ','

            else:
                para += word

            end_str = ''

            if end in ['n', 'nn', 'nnn', 'nnnn', 'nnnnn']:
                para_data.setText(para.strip())
                lats_by_para.append(para_data)
                para = ""
                para_data = ds_stat.DSStat()
                end_str += ''

                if para_count > (self.skip_paras + self.max_paras - 1):
                   break
                para_count += 1

            elif end == 's':           # no space
                end_str += ' '
            elif end == 'c':
                end_str += ''

        para    = para.strip()

        if para:
            para_data.setText(para.strip())
            lats_by_para.append(para_data)

        self.sections[section_id]['para_data'] = lats_by_para

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

    def generateLocalVisData(self, selected_paragraphs, max_topic_sents=1, min_topics=2):
        """
        This method returns a python dictionary that contains the data that are needed for
        the visualization of coherence across sentences within 1 or more pragraphs.
        selected_paragraphs:    A list of paragraph IDs.
        max_topic_sents:        The total number of sentences at the beginning of paragraphs that
                                should be considered a topic sentence.
        min_topics:             The minimum number of lexical overlaps between sentences.
        """

        self.local_topics = list()

        data = self.getLocalTopicalProgData(selected_paragraphs)
        if data is None:
            return ValueError('data is None.')

        topic_filter = TOPIC_FILTER_LEFT_RIGHT
        key_para_topics = self.getKeyParaTopics()
        key_sent_topics = []

        header = data[0]   # list of tuples (POS, LEMMA)
        self.local_header = header
        nrows  = len(data)
        ncols  = len(header)

        sent_buttons_data = [None] * (nrows-1)

        if ncols == 0:
            return ValueError('ncols is 0.')

        vis_data = dict()
        vis_data['num_topics'] = ncols
        vis_data['data'] = list()

        if selected_paragraphs:
            sent_filter     = self.filterLocalTopics(data, nrows, ncols)
            selected_paragraphs.sort()
            b_para_break = False
            true_left_count = 0
            l_count = 0
            for ci in range(ncols):

                topic = header[ci][1]
                topic_data = [None] * (nrows-1)
                b_skip     = False
                sent_pos   = 0
                sent_id    = 0

                if topic is not None:
                    true_left_count = sent_filter[topic]['left_count']

                    if topic_filter == TOPIC_FILTER_ALL:
                        count = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:
                        l_count = sent_filter[topic]['left_count']
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

                if count < min_topics:
                    continue

                is_global = False
                if topic in self.global_topics:
                    is_global = True

                if DSDocument.isUserDefinedSynonym(topic):
                    is_tc = True
                else:
                    is_tc = False

                self.local_topics.append((topic, is_global))

                topic_info = None
                para_count = 0
                para_id = selected_paragraphs[para_count]

                for ri in range(1,nrows):     # for each row
                    elem= data[ri][ci]      # get the elem 

                    if type(elem) == int and elem < 0:
                        b_para_break = True
                    elif type(elem) == tuple and elem[0] is not None and \
                                is_skip(elem, true_left_count, topic_filter) == False:
                        if elem[IS_SKIP] == False:
                            d = dict()
                            # d['topic'] = elem
                            d['sent_pos'] = sent_id
                            d['para_pos'] = para_id
                            d['is_left'] = elem[ISLEFT]

                            if sent_id < max_topic_sents:
                                d['is_topic_sent'] = True
                            else:
                                d['is_topic_sent'] = False

                            topic_data[sent_pos] = d
                            topic_info = elem

                    elif type(elem) == tuple and elem[0] is not None \
                                and is_skip(elem, true_left_count, topic_filter) == True:
                        b_skip = True

                    elif type(elem) == tuple and elem[0] is None:
                        b_skip = True

                    if b_para_break:
                        para_count += 1
                        para_id = selected_paragraphs[para_count]
                        sent_id = 0
                        b_para_break = False
                    else:
                        sent_pos += 1
                        sent_id  += 1

                vis_data['num_sents'] = sent_id
                vis_data['data'].append({'sentences':        topic_data, 
                                         'is_topic_cluster': is_tc,
                                         'is_global':        is_global,
                                         'topic':            list(topic_info[0:3])})

            # debug
            # with open("sample_local_coherence_data.json", 'w') as fout:
                # json.dump(vis_data, fout, indent=4)

            return vis_data

    def generateGlobalVisData(self, min_topics=2, max_topic_sents=1, sort_by=TOPIC_SORT_APPEARANCE):
        """
        This method returns a python dictionary that contains the data that are needed for
        the visualization of coherence across paragraphs.
        min_topics:             The minimum number of lexical overlaps between sentences.
        max_topic_sents:        The total number of sentences at the beginning of paragraphs that
                                should be considered a topic sentence.
        sort_by:                The sorting method option.
        """

        global_data = self.getGlobalTopicalProgData(sort_by=sort_by)
        self.updateLocalTopics()
        self.updateGlobalTopics(global_data)

        if global_data is None:
            return ValueError('global_data is None.')

        data = global_data['data']
        para_data = global_data['para_data']

        if data is None:
            return ValueError('data is None.')

        header = data[0]   # list of tuples (POS, LEMMA, POS, COUNT)

        nrows  = len(data)              # Initialize the number of rows and the number of columns.
        ncols  = len(header)

        self.global_topics = list()

        if ncols == 0:
            return ValueError('ncols is 0.')

        vis_data = dict()
        vis_data['num_topics'] = ncols
        vis_data['data'] = list()

        # Filters
        para_filter     = self.filterParaTopics(data, nrows, ncols)      #
        sent_filter     = self.filterTopics(data, nrows, ncols)          # 
        topic_filter    = TOPIC_FILTER_LEFT_RIGHT                   # 

        sent_count = 0
        b_break = False
        true_left_count = 0
        l_count = 0
        count = 0

        for ci in range(ncols):                             # for each topic entry,

            topic = header[ci][1]                           # find a topic from the header list.
            topic_data = [None] * (nrows-1)                 # initialize the topic data
            p_ri = 0                                        # initialize the row index w/in paragraph

            if topic is not None:                           # topic exists 
                if  self.isLocalTopic(topic) == False and \
                    DSDocument.isUserDefinedSynonym(topic) == False:         # topic cluster = user defined synonym
                    # if the topic is NOT a local topic AND it is NOT a topic cluster, 
                    # we should skip this topic.
                    continue

                # Count how manu times the topic appears on the left side of the main verb.
                if DSDocument.isUserDefinedSynonym(topic):                # topic is a topic cluster.
                    true_left_count = sent_filter[topic]['left_count']
                    count   = sent_filter[topic]['count']                    
                    l_count = sent_filter[topic]['left_count']
                    if count < 2:
                            count = 2
                else:                                                            # topic is not a topic sluster
                    true_left_count = sent_filter[topic]['left_count']
                    if topic_filter == TOPIC_FILTER_ALL:                  # rarely used.
                        count   = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:                                                        # default
                        l_count = sent_filter[topic]['left_count']
                        if l_count == 1:                                         # one left + one right case.
                            count = 2
                        else:
                            count = l_count

            if count < min_topics:                    # min_topics == 2 by default. Skip topics that do not apper in more than 2 paragraphs.
                continue

            self.global_topics.append(topic)                    # if we get here, the topic is a global topic.

            if DSDocument.isUserDefinedSynonym(topic):     # check if topic is a topic cluster.
                is_tc = True
            else:
                is_tc = False

            topic_info = None
            sent_count = 0

            # we will start with the index == 2 because the first index is the header row, 
            # and the second index is the pragraph break indicator.

            for ri in range(2,nrows):     # for each column (r & c are flipped!)

                elem= data[ri][ci]        # get the elem 

                if type(elem) == int and elem < 0:       # paragraph brek
                    b_break = True

                # Not the first column (not the paragraph ID/Number)
                elif type(elem) == tuple and elem[0] is not None and \
                            is_skip(elem, true_left_count, topic_filter) == False:

                    curr_elem = topic_data[p_ri]

                    # d['sent_id'] captures the sent id of the first occurence of the topic on the left side.
                    if curr_elem is not None and \
                       elem[ISLEFT] == True and \
                       curr_elem['topic'][ISLEFT] == False:
                        # 'elem' not the first instance for this paragraph
                        # the existing element 'curr_elem' is on the right side.
                        d = dict()
                        d['topic']   = list(elem)
                        d['first_left_sent_id'] = sent_count   
                        d['para_pos'] = p_ri
                        d['is_left'] = True
                        # d['is_topic_cluster'] = is_tc

                        if sent_count < max_topic_sents:
                            d['is_topic_sent'] = True
                        else:
                            d['is_topic_sent'] = False

                        topic_data[p_ri] = d

                    elif curr_elem is None:
                        d = dict()
                        d['topic'] = list(elem)
                        d['para_pos'] = p_ri

                        if elem[ISLEFT] == True:
                            d['first_left_sent_id'] = sent_count
                            d['is_left'] = True
                        else:
                            d['first_left_sent_id'] = -1
                            d['is_left'] = False

                        if sent_count < max_topic_sents:
                            d['is_topic_sent'] = True
                        else:
                            d['is_topic_sent'] = False

                        topic_data[p_ri] = d
                        topic_info = elem

                elif type(elem) == tuple and elem[0] is not None \
                            and is_skip(elem, true_left_count, topic_filter) == True:
                    pass

                elif type(elem) == tuple and elem[0] is None:                     # if empty slot 
                    pass

                if b_break:
                    p_ri += 1 
                    b_break = False
                    sent_count = 0
                else:
                    sent_count += 1

            topic_data = topic_data[0:p_ri]

            for i in range(len(topic_data)):          # delete the topic data.
                d = topic_data[i]
                if d is not None:
                    del d['topic']
            
            if self.isLocalTopic(topic) == False:               
                is_non_local = True
            else:
                is_non_local = False

            vis_data['data'].append({'paragraphs':       topic_data,
                                     'is_topic_cluster': is_tc,
                                     'is_non_local':     is_non_local,
                                     'topic':            list(topic_info[0:3])})

            vis_data['num_paras']  = (p_ri)

        # Add missing topic clusters, if any
        tcs = DSDocument.getUserDefinedSynonyms()        
        if tcs is not None:
            missing_tcs = list(set(tcs) - set(self.global_topics))
            for tc  in missing_tcs:
                topic_info = ['NOUN', '', tc]

                vis_data['data'].append({'paragraphs': [], 
                                         'is_topic_cluster': True,
                                         'is_non_local':     False,
                                         'topic': topic_info})

        # debug
        # with open("sample_global_coherence_data.json", 'w') as fout:
        #     json.dump(vis_data, fout, indent=4)

        return vis_data

    def filterTopics(self, data, nrows, ncols):
        res = dict()
        for c in range(1, ncols+1):  # for each topic

            l_start = -1 # left only
            l_end   = -1
            start = -1  # left or right
            end   = -1
            given_count = 0
            given_left_count  = 0
            given_right_count = 0
            para_count  = 0
            num_paras   = 0
            header = data[0][c-1][1]
            given_left_paras  = list()
            given_right_paras = list()
            first_new_paras   = list()

            for r in range(1, nrows):
                elem= data[r][c-1]

                if type(elem) == tuple and elem[0] is not None:
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

                elif type(elem) == int and elem < 0:
                    para_count += 1

            l_skip_lines = 0
            skip_lines = 0
            sent_count = 0
            for r in range(1, nrows):
                elem= data[r][c-1]

                if r > l_start and r < l_end:               
                    if type(elem) == str and elem == 'heading':
                        l_skip_lines += 1
                    elif type(elem) == str and elem == 'title':
                        l_skip_lines += 1                  
                    elif type(elem) == int and elem < 0:
                        l_skip_lines += 1

                if r > start and r < end:
                    if type(elem) == str and elem == 'heading':
                        skip_lines += 1
                    elif type(elem) == str and elem == 'title':
                        skip_lines += 1                  
                    elif type(elem) == int and elem < 0:
                        skip_lines += 1
                        
                if type(elem) != str and type(elem) != int:
                    sent_count += 1

            given_left_paras  = list(set(given_left_paras))
            given_right_paras = list(set(given_right_paras))

            is_topic = False
            if len(given_left_paras) > 1:
                is_topic = True
            elif len(given_left_paras) == 1:  
                # this topic only appears in one paragraph. Let's see if it appears in 
                # another pragraph on the right side...
                if len(set(given_right_paras)-set(given_left_paras)) > 0:
                    # This topic satisfies the min requirement to be a topic.
                    is_topic = True

            # left only
            l_span = (l_end - l_start + 1) - l_skip_lines
            if l_span < 0:
                l_span = 0
            norm_l_span = (l_span / sent_count) * 100
            norm_l_coverage = (given_left_count / sent_count) * 100

            # left or right
            span = (end - start + 1) - skip_lines
            if span < 0:
                span = 0
            norm_span = (span / sent_count) * 100
            norm_coverage = (given_count / sent_count) * 100
                        
            res[header] = {'type':            0,
                           'is_topic':        is_topic,
                           'left_span':       norm_l_span, 
                           'left_coverage':   norm_l_coverage,
                           'span':            norm_span,         # left+right
                           'coverage':        norm_coverage,     # left+right
                           'count':           given_count,
                           'left_count':      given_left_count,
                           'right_count':     given_right_count,
                           'sent_count':      sent_count,
                           'para_count':      None}

        return res

    def filterParaTopics(self, data, nrows, ncols):
        res = dict()
        for c in range(1, ncols+1):  # for each topic

            p_l_start = -1
            p_l_end   = -1
            p_start = -1
            p_end   = -1
            given_count = 0
            given_left_count = 0
            given_right_count = 0

            para_count = 0
            given_paras = list()
            given_left_paras  = list()
            given_right_paras = list()

            header = data[0][c-1][1]

            for r in range(1, nrows):

                elem= data[r][c-1]

                if type(elem) == tuple and elem[0] is not None:
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

                elif type(elem) == int and elem < 0:
                    para_count += 1

            para_count -= 1

            p_l_span = (p_l_end - p_l_start + 1)
            norm_l_span = (p_l_span / para_count) * 100

            p_span = (p_end - p_start + 1)
            norm_span = (p_span / para_count) * 100

            given_paras       = list(set(given_paras))
            given_left_paras  = list(set(given_left_paras))
            given_right_paras = list(set(given_right_paras))

            norm_l_coverage   = (len(given_left_paras) / para_count) * 100
            norm_coverage     = (len(given_paras) / para_count) * 100

            is_topic = False
            if len(given_left_paras) > 1:
                is_topic = True
            elif len(given_left_paras) == 1:  
                # this topic only appears in one paragraph. Let's see if it appears in 
                # another pragraph on the right side...
                if len(set(given_right_paras)-set(given_left_paras)) > 0:
                    # This topic satisfies the min requirement to be a topic.
                    is_topic = True

            res[header] = {'type':           4,
                           'is_topic':       is_topic,
                           'left_span':      norm_l_span,
                           'left_coverage':  norm_l_coverage, 
                           'span':           norm_span,
                           'coverage':       norm_coverage, 
                           'count':          len(given_paras),
                           'left_count':     len(given_left_paras),
                           'right_count':    len(given_right_paras),
                           'sent_count':     None,
                           'para_count':     para_count}

        return res

    def filterLocalTopics(self, data, nrows, ncols):

        res = dict()
        for c in range(1, ncols+1):  # for each topic

            start = -1
            end   = -1
            given_count = 0
            given_left_count = 0
            # para_count = 0
            first_new_count = 0
            header = data[0][c-1][1]

            for r in range(1, nrows):
                elem= data[r][c-1]

                if type(elem) == tuple and elem[0] is not None:
                    # if para_count == para_pos:
                    bSkip = False

                    if elem[IS_TOPIC] == False: # it's not a topic word
                        bSkip = True

                    if bSkip == False: # it's a topic word
                        if start < 0:
                            start = r
                        elif start >= 0:
                            end = r

                        given_left_count += 1

                        if elem[ISLEFT] == False:
                            first_new_count += 1

                    given_count += 1

            if (given_left_count - first_new_count) == 0:
                start = -1
                end = -1

            skip_lines = 0
            sent_count = 0
            # para_count = 0
            for r in range(1, nrows):
                elem= data[r][c-1]

                if r > start and r < end:               
                    if type(elem) == str and elem == 'heading':
                        skip_lines += 1
                    elif type(elem) == int and elem < 0:
                        skip_lines += 1
                        
                if type(elem) != str and type(elem) != int:
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

            res[header] = {'type':            1,
                           'span':            norm_span, 
                           'coverage':        norm_coverage, 
                           'count':           given_count, 
                           'left_count':      given_left_count,
                           'first_new_count': first_new_count,
                           'sent_count':      sent_count,
                           'para_count':      None,
                           'top':             False}

        top_left_count = 0
        for stats in res.values():  # find the top left count
            if stats['left_count'] > top_left_count:
                top_left_count = stats['left_count']

        for stats in res.values():  # update the 'top' status of each topic.
            if stats['left_count'] == top_left_count and \
                stats['left_count'] - stats['first_new_count'] != 0:
                stats['top'] = True
                    
        return res        

    def updateGlobalTopics(self, global_data, min_topics=2):

        data = global_data['data']

        header = data[0]   # list of tuples (POS, LEMMA, POS, SENT_COUNT, PARA_COUNT)
        self.global_header = header.copy()   # Let's make a copy so that we don't actually change the global data.

        nrows  = len(data)
        ncols  = len(header)

        self.global_topics = list()

        if ncols == 0:
            return []

        topic_filter    = TOPIC_FILTER_ALL
        sent_filter     = self.filterTopics(data, nrows, ncols)     

        true_left_count = 0
        l_count = 0

        for ci in range(ncols):    # for each colum (word) in a row

            topic = header[ci][1]
            p_ri = 0

            if topic is not None:
                if self.isLocalTopic(topic) == False and \
                   DSDocument.isUserDefinedSynonym(topic) == False:
                    continue

                if DSDocument.isUserDefinedSynonym(topic):
                    true_left_count = sent_filter[topic]['left_count']
                    count = sent_filter[topic]['count']                    
                    l_count = sent_filter[topic]['left_count']
                    if count < 2:
                        count = 2
                else:
                    true_left_count = sent_filter[topic]['left_count']

                    if topic_filter == TOPIC_FILTER_ALL:
                        count = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:
                        l_count = sent_filter[topic]['left_count']
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
                    self.global_header.append(('NOUN', tc, 10000000+count, -1, -1))
                    count += 1

        return self.global_topics

    def updateLocalTopics(self):

        def filter_local_topics(data, nrows, ncols):

            res = dict()
            for c in range(1, ncols+1):  # for each topic

                start = -1
                end   = -1
                given_count = 0
                given_left_count = 0
                # para_count = 0
                first_new_count = 0
                header = data[0][c-1][1]

                for r in range(1, nrows):
                    elem= data[r][c-1]

                    if type(elem) == tuple and elem[0] is not None:
                        # if para_count == para_pos:
                        bSkip = False

                        if elem[IS_TOPIC] == False: # it's not a topic word
                            bSkip = True

                        if bSkip == False: # it's a topic word
                            if start < 0:
                                start = r
                            elif start >= 0:
                                end = r

                            given_left_count += 1

                            if elem[ISLEFT] == False:
                                first_new_count += 1

                        given_count += 1

                if (given_left_count - first_new_count) == 0:
                    start = -1
                    end = -1

                skip_lines = 0
                sent_count = 0
                # para_count = 0
                for r in range(1, nrows):
                    elem= data[r][c-1]

                    # if type(elem) == int and elem < 0:
                        # para_count += 1
                    # elif para_count == para_pos:

                    if r > start and r < end:               
                        if type(elem) == str and elem == 'heading':
                            skip_lines += 1
                        elif type(elem) == int and elem < 0:
                            skip_lines += 1
                            
                    if type(elem) != str and type(elem) != int:
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

                res[header] = {'type':            1,
                               'span':            norm_span, 
                               'coverage':        norm_coverage, 
                               'count':           given_count, 
                               'left_count':      given_left_count,
                               'first_new_count': first_new_count,
                               'sent_count':      sent_count,
                               'para_count':      None,
                               'top':             False}

            top_left_count = 0
            for stats in res.values():  # find the top left count
                if stats['left_count'] > top_left_count:
                    top_left_count = stats['left_count']

            for stats in res.values():  # update the 'top' status of each topic.
                if stats['left_count'] == top_left_count and \
                    stats['left_count'] - stats['first_new_count'] != 0:
                    stats['top'] = True
                        
            return res

        def get_local_topics(local_data, min_topics=2):
            data = local_data

            topic_filter = TOPIC_FILTER_LEFT_RIGHT
            header = data[0]
            nrows  = len(data)
            ncols  = len(header)

            if ncols == 0:
                return []

            sent_filter = filter_local_topics(data, nrows, ncols)

            true_left_count = 0
            l_count = 0
            self.local_topics = list()

            for ci in range(ncols):

                topic = header[ci][1]
                sent_count = 0

                if topic is not None:
                    true_left_count = sent_filter[topic]['left_count']

                    if topic_filter == TOPIC_FILTER_ALL:
                        count = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:
                        l_count = sent_filter[topic]['left_count']
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
        all_local_topics = list()
        self.local_topics_dict = dict()

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
            for key, value in self.local_topics_dict.items():    # for each paragraph
                local_topics = [t[0] for t in value]             # make a list of lemma/topic strings
                if topic in local_topics:                        # if <topic> is in it, return True
                    return True
        return False     


    def testPrintGlobalVisData(self, vis_data):

        data       = vis_data['data']
        num_paras  = vis_data['num_paras']
        num_topics = vis_data['num_topics']

        # Print paragraph IDs
        line = " " * 30
        for i in range(num_paras):
            line += "{} ".format(i+1)

        print(line)

        # For each data for a specific topic,
        for topic_data in data:                                    
            topic = topic_data['topic']
            lemma = topic[LEMMA]
            is_topic_cluster = topic_data['is_topic_cluster']
            is_non_local = topic_data['is_non_local']

            # if the paragraph data is not empty OR if the topic is a topic cluster
            if topic_data['paragraphs'] != [] or is_topic_cluster:

                # header section
                line = lemma
                line += " " * (30 - len(lemma))

                # Write a symbol for each paragraph.
                # L = 'topic' appears on the left side of the main verb at least once.
                # l = a topic cluster that is not a global topic.
                # R = 'topic' appears on the right side of the main verb.
                # r = a topic cluster that is not a global topic.
                # * = topic sentence.
                for para_data in topic_data['paragraphs']:
                    if para_data is not None:
                        para_pos = para_data['para_pos']
                        is_left  = para_data['is_left']
                        is_topic_sent = para_data['is_topic_sent']

                        if is_left:                     # is 'topic' on the left side?
                            if is_non_local:            # is it a non-local global topic?
                                c = 'l'
                            else: 
                                c = 'L'

                            if is_topic_sent:           # is 'topic' appear in a topic sentence?
                                line += (c + "*")
                            else:                      
                                line += (c + " ")
                        else:
                            if is_non_local:
                                c = 'r'
                            else: 
                                c = 'R'

                            if is_topic_sent:
                                line += (c + "*")
                            else:
                                line += (c + " ")
                    else:
                        line += "  "

                print(line)

    def testPrintLocalVisData(self, vis_data):

        data       = vis_data['data']
        num_sents  = vis_data['num_sents']
        num_topics = vis_data['num_topics']

        # Print paragraph IDs
        line = " " * 30
        for i in range(num_sents):
            line += "{} ".format(i+1)

        print(line)

        # For each topic data,
        for topic_data in data:
            topic = topic_data['topic']
            is_topic_cluster = topic_data['is_topic_cluster']
            lemma = topic[LEMMA]
            is_global = topic_data['is_global']

            # If 'topic' appears in one or more sentences OR it is a topic cluster
            if topic_data['sentences'] != [] or is_topic_cluster:
                line = lemma
                line += " " * (30 - len(lemma))

                # Write a symbol for each sentence sentence.
                for sent_data in topic_data['sentences']:
                    if sent_data is not None:
                        sent_pos = sent_data['para_pos']
                        is_left = sent_data['is_left']
                        is_topic_sent = sent_data['is_topic_sent']

                        if is_left:
                            if is_global:
                                c = 'L'
                            else:
                                c = 'l'

                            if is_topic_sent:
                                line += (c + '*')
                            else:           
                                line += (c + ' ')
                        else:
                            if is_global:
                                c = 'R'
                            else:
                                c = 'r'

                            if is_topic_sent:
                                line += (c + '*')
                            else:
                                line += (c + ' ')
                    else:
                        line += "  "

                print(line)
