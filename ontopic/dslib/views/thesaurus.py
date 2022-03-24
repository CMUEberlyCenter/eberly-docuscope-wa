import os, sys
import platform
from time import time
from datetime import datetime, date
import math
import json

import threading    

from nltk.corpus import wordnet

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

import dslib.views as views
import dslib.models.dict as ds_dict
import dslib.utils as utils

from dslib.utils import resource_path, remove_punct_and_space
from dslib.views.dialogs import WarningDialog, AboutDialog, YesNoDialog, ConfirmationDialog, SaveWarningDialog, SaveWarningDialog2


from docx import Document
from docx.shared import RGBColor

import difflib
from word_forms.word_forms import get_word_forms

import pprint     
pp = pprint.PrettyPrinter(indent=4)

# ----------------------------------------
# ThesaurusFrame
# ----------------------------------------
THESAURUS_SEARCH_IN_LATNAMES = 1
THESAURUS_SEARCH_IN_PATTERNS = 2

def get_intersecting_lats(lst):
    lst = [set(lats) for lats in lst]
    return list(lst[0].intersection(*lst))

def get_union_lats(lst):
    lst = [set(lats) for lats in lst]
    return list(lst[0].union(*lst))

def get_word_form_variations(word):
    res = set()
    forms = get_word_forms(word)
    for key, value in forms.items():
        if len(value) > 0:
            res |= value
    return list(res)

def dist(w1, w2):
    s1 = wordnet.synsets(w1)[0]
    s2 = wordnet.synsets(w2)[0]
    return s1.wup_similarity(s2)

def list_synonyms(word):
    res = list()
    
    for syn in wordnet.synsets(word):
        for l in syn.lemmas():
            if dist(word, l.name()) > 0.75:
                res.append(l.name())
    res = list(set(res))    
    return res

class ThesaurusFrame(QFrame):

    LATsFindCompleted   = pyqtSignal()
    focusOnPatternField = pyqtSignal()

    def __init__(self, app_win=None, parent=None):

        super(ThesaurusFrame, self).__init__(parent)

        self.app_win    = app_win
        self.dictionary = dict
        self.controller = None

        self.LATsFindCompleted.connect(self.LATsFindCompletedAction)
        self.focusOnPatternField.connect(self.focusOnPatternFieldAction)

        self.setMinimumWidth(1000)
        self.setMinimumHeight(800)
        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        vbox = QVBoxLayout()

        header_hbox = QHBoxLayout()

        title = QLabel("Thesaurus Search")
        header_hbox.addWidget(title)

        header_hbox.addStretch()

        label = QLabel("Search In: ")
        header_hbox.addWidget(label)

        self.options_button_group = QButtonGroup()

        self.latnames_radio_button = QRadioButton("LAT Names")
        self.latnames_radio_button.setChecked(True)
        header_hbox.addWidget(self.latnames_radio_button)
        self.options_button_group.addButton(self.latnames_radio_button, THESAURUS_SEARCH_IN_LATNAMES)

        self.patterns_radio_button = QRadioButton("LAT Patterns")
        self.patterns_radio_button.setChecked(False)
        header_hbox.addWidget(self.patterns_radio_button)
        self.options_button_group.addButton(self.patterns_radio_button, THESAURUS_SEARCH_IN_PATTERNS)

        vbox.addLayout(header_hbox)

        search_hbox = QHBoxLayout()

        self.pattern_field = QLineEdit()
        self.pattern_field.setPlaceholderText("Enter one or more words")
        self.pattern_field.returnPressed.connect(self.findCategories)
        search_hbox.addWidget(self.pattern_field)

        self.find_button = QPushButton("Find")
        self.find_button.clicked.connect(self.findCategories)
        self.find_button.setDefault(True) 
        search_hbox.addWidget(self.find_button)

        vbox.addLayout(search_hbox)

        main_hbox = QHBoxLayout()

        result_vbox = QVBoxLayout()
        self.search_results = QTreeWidget()
        self.search_results.itemClicked.connect(self.itemSelected)
        self.search_results.setHeaderHidden(True)
        result_vbox.addWidget(self.search_results)

        self.category_description = QPlainTextEdit()
        self.category_description.setMaximumHeight(260)
        result_vbox.addWidget(self.category_description)
        main_hbox.addLayout(result_vbox)

        self.lat_patterns = QPlainTextEdit()
        main_hbox.addWidget(self.lat_patterns)

        vbox.addLayout(main_hbox)

        self.setLayout(vbox)

    def focusOnPatternFieldAction(self):
        self.pattern_field.setFocus()        

    def setController(self, controller):
        self.controller = controller

    def itemSelected(self, item, column):

        data = item.data(0, Qt.UserRole)
        categories = data.split()

        num_items = len(categories)
        if num_items == 3:
            patterns = self.dictionary.getPatternsFromTagger(categories[2])
            self.lat_patterns.setPlainText('\n'.join(patterns))
            self.category_description.setPlainText("")

        elif num_items == 2: # dim
            dim = self.dictionary.getDimension(categories[1])
            if dim is not None:
                dscr = dim.get('help', 'n/a')
                self.category_description.setPlainText(dscr)
                self.lat_patterns.setPlainText("")
        elif num_items == 1: # clust
            clust = self.dictionary.getCluster(categories[0])
            if clust is not None:
                dscr = clust.get('help', 'n/a')
                self.category_description.setPlainText(dscr)
                self.lat_patterns.setPlainText("")
                
    def cancel(self):
        self.hide()

    def setDictionary(self, dict):
        self.dictionary = dict
        self.focusOnPatternField.emit()

    def findCategories(self):
        
        self.lat_patterns.setPlainText("")

        # if self.lat_dim_names_radio_button.isChecked() or \
           # self.latnames_radio_button.isChecked():
        if self.latnames_radio_button.isChecked():
            self.findCategoriesByLATNames()
        elif self.patterns_radio_button.isChecked():
            self.findCategoriesByPatterns()


    def findCategoriesByLATNames(self):
        self.search_results.clear()        

        user_input = self.pattern_field.text().strip()
        patterns = user_input.split()
        if patterns == []:
            WarningDialog("Warning", "No search terms are entered.")
        else:
            synonyms = []
            for p in patterns:            
                synonyms.extend(list_synonyms(p))

            all_patterns = []                
            for p in synonyms:
                all_patterns.extend(get_word_form_variations(p))

            all_matched_lats = []
            for p in all_patterns:
                pattern = "({}(?=[A-Z_])|{}$)".format(p.capitalize(), p.capitalize())
                matched_dims, matched_lats = self.dictionary.findCategories(pattern, False, True)
                all_matched_lats.append(matched_lats)

            if all_matched_lats:
                lats = get_union_lats(all_matched_lats)

                self.tones = self.makeHierarchy(lats)

                if self.tones is not None:
                    self.updateResults()
            else:
                WarningDialog("No Results", "\"{}\" did not generate any matches.".format(user_input))

        self.focusOnPatternField.emit()

    def findCategoriesByPatterns(self):
        self.search_results.clear()

        user_input = self.pattern_field.text().strip()
        patterns = user_input.split()

        if patterns == []:
            WarningDialog("Warning", "No search terms are entered.")
        else:
            self.progdialog = QProgressDialog("Searching... It may take a few minutes.", 
                                              None, 0, 0, self)
            self.progdialog.setModal(True)
            self.progdialog.setMinimumWidth(400)      
            self.progdialog.show()

            threading.Timer(0.2, self.runFindLATs, [patterns]).start()

        self.focusOnPatternField.emit()

    def makeHierarchy(self, matched_lats):

        tones = dict()

        for lat_path in matched_lats:
            clust_name = lat_path[0]
            dim_name   = lat_path[1]
            lat_name   = lat_path[2]

            if clust_name not in tones:     # clust_name hasn't breen added.
                c = dict()                    
                c['name'] = clust_name
                c['dimensions'] = list()

                d = dict()
                d['name'] = dim_name
                d['lats'] = list()
                c['dimensions'].append(d)

                lat = dict()
                lat['name'] = lat_name
                d['lats'].append(lat)

                tones[clust_name] = c

            if clust_name in tones:       # clust_names has been added already
                c = tones[clust_name]

                # check if dim_name has arleady been added
                existing_dim = None
                for d in c['dimensions']:
                    if d['name'] == dim_name:
                        existing_dim = d
                        break

                # dim_name has been added
                if existing_dim is not None:

                    # check if lat_name has been added
                    existing_lat = None                        
                    for lat in existing_dim['lats']:
                        if lat['name'] == lat_name:
                            existing_lat = d
                            break

                    if existing_lat is None:    # add lat_name if it hasn't been added yet.
                        lat = dict()
                        lat['name'] = lat_name
                        existing_dim['lats'].append(lat)

                else: 
                    # dim_name hasn't been added yet
                    d = dict()
                    d['name'] = dim_name
                    d['lats'] = list()                        
                    c['dimensions'].append(d)

                    lat = dict()
                    lat['name'] = lat_name
                    d['lats'].append(lat)
        return tones

    def updateResults(self):
        self.search_results.clear()
        for c in self.tones.values():
            citem = QTreeWidgetItem(self.search_results, [c['name']]) 
            citem.setData(0, Qt.UserRole, c['name'])

            for d in c['dimensions']:
                ditem = QTreeWidgetItem(citem, [d['name']])
                ditem.setData(0, Qt.UserRole, "{} {}".format(c['name'], d['name']))

                for lat in d['lats']:
                    latitem = QTreeWidgetItem(ditem, [lat['name'].replace("_LAT", "")])
                    latitem.setData(0, Qt.UserRole, "{} {} {}".format(c['name'], d['name'], lat['name']))

    @pyqtSlot()
    def LATsFindCompletedAction(self):
        if self.progdialog != None:
            self.progdialog.reset()

        if self.tones is not None:
            self.updateResults()

        self.focusOnPatternField.emit()

    def runFindLATs(self, search_patterns):
        all_matched_lats = []
        self.tones = None        
        for p in search_patterns:        
            pattern = p.lower().strip()
            self.matches = self.dictionary.findLATs(pattern, exact_match=False)
            if self.matches:
                matched_lats = [match[0] for match in self.matches]
                matched_lats = list(set(matched_lats))
                all_matched_lats.append(matched_lats)

        lats = get_intersecting_lats(all_matched_lats)
        self.tones = self.makeHierarchy(lats)

        self.LATsFindCompleted.emit()
