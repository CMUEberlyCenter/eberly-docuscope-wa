#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
rules.py

"""
import json

from datetime import date
from datetime import datetime

import os, sys
import platform

import string
import re
import copy
import shutil
import traceback

import pprint     
pp = pprint.PrettyPrinter(indent=4)

class DSSynset():
    """
    All the synonyms and 'lemma' use the '_' characters when they are stored in the synset object.
    """
    def __init__(self, lemma=None, synset_dict = None):

        if synset_dict is not None:
            # Replace the ' ' characters with the '_' character.
            lemma = synset_dict['lemma'].replace(' ', '_')
            synonyms = [s.replace(' ', '_') for s in synset_dict['synonyms']]
            self.lemma     = lemma
            self.synonyms  = synonyms

        elif lemma is not None:
            # Replace the ' ' characters with the '_' character.
            self.lemma     = lemma.replace(' ', '_')
            self.synonyms  = list()

        else:
            self.lemma     = ''
            self.synonyms  = list()

    def toDict(self):
        d = dict()
        # Replace the '_' characters with the ' ' character.
        d['lemma']    = self.lemma.replace('_', ' ')
        d['synonyms'] = [s.replace('_', ' ') for s in self.synonyms]
        return d

    def getLemma_(self):
        return self.lemma

    def getLemma(self):
        return self.lemma.replace('_', ' ')

    def getSynonyms(self):
        synonyms_lst = [s.replace('_', ' ') for s in self.synonyms]   # remove the '_' chars
        return synonyms_lst

    def setLemma(self, lemma):
        lemma = lemma.replace(' ', '_')
        self.lemma = lemma

    def setSynonyms(self, new_synonyms):
        new_synonyms = [s.replace(' ', '_') for s in new_synonyms] 
        removed_topics = list(set(self.synonyms) - set(new_synonyms))

        self.synonyms = new_synonyms

        removed_topics = [s.replace('_', ' ') for s in removed_topics]

        return removed_topics

    def addSynonym(self, new_synonym):
        new_synonym = new_synonym.replace(' ', '_')
        if new_synonym not in self.synonyms:
            self.synonyms.append(new_synonym)

    def deleteSynonym(self, synonym):
        synonym_to_delete = synonym.replace(' ', '_')

        # if synonym_to_delete in self.synonyms:
            # self.synonyms.remove(synonym_to_delete)
        for i in range(len(self.synonyms)):
            s = self.synonyms[i]
            if synonym_to_delete.lower() == s.lower():
                self.synonyms.remove(s)
                break






