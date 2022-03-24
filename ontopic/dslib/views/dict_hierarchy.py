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

import pprint     
pp = pprint.PrettyPrinter(indent=4)

THESAURUS_SEARCH_IN_LATNAMES = 1
THESAURUS_SEARCH_IN_PATTERNS = 2

# ----------------------------------------
# DictHierarchyViewer
# ----------------------------------------
class DictHierarchyViewer(QFrame):

    def __init__(self, dict, app_win=None, parent=None):

        super(DictHierarchyViewer, self).__init__(parent)

        self.app_win    = app_win
        self.dictionary = dict
        self.controller = None

        self.setMinimumWidth(1000)
        self.setMinimumHeight(800)
        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        main_hbox = QHBoxLayout()

        result_vbox = QVBoxLayout()
        self.tree = QTreeWidget()
        self.tree.itemClicked.connect(self.itemSelected)
        self.tree.setHeaderHidden(True)
        result_vbox.addWidget(self.tree)

        main_hbox.addLayout(result_vbox)

        self.lat_patterns = QTextEdit()

        d = self.lat_patterns.document()
        s = "p {margin: 0px;} h3 {margin: 0px; margin-top: 6px;}"
        d.setDefaultStyleSheet(s)
        main_hbox.addWidget(self.lat_patterns)

        self.setLayout(main_hbox)

    def setController(self, controller):
        self.controller = controller

    def updateHierarchy(self, root_node):
        def add_children(parent_item, siblings):
            for node in siblings:

                if node.name.startswith("Orphan") or node.name.startswith("Syntactic"):
                    continue

                item = QTreeWidgetItem(parent_item, [node.name])

                if node.children:
                    # if there are children, add them.
                    add_children(item, node.children)
                    item.setData(0, Qt.UserRole, None)
                else:
                    # if not, it's a leaf node. Let the node remember the cluster and dimension.
                    item.setData(0, Qt.UserRole, (node.clust, node.dim))

        self.tree.clear()
        for node in root_node.children[0].children:        # top level cat
            super_clust_name = node.name
            item = QTreeWidgetItem(self.tree, [super_clust_name])  # create a top level item
            add_children(item, node.children)

    def findCategories(self):
        pass

    def itemSelected(self, item, column):

        data = item.data(0, Qt.UserRole)

        if data is not None:
            html_patterns = ""
            clust_name = data[0]
            dim_name   = data[1]
            lat_names = self.dictionary.getLATNames(clust_name, dim_name)

            for lat_name in lat_names:
                revised_patterns, original_patterns = self.dictionary.getPatterns(lat_name)

                if revised_patterns is not None:
                    patterns = revised_patterns
                else:
                    patterns = original_patterns

                lst = ["<p>{}</p>\n".format(p) for p in patterns.splitlines()]
                html_patterns += "<h3>{}</h3>\n".format(lat_name) + '\n'.join(lst)

            self.lat_patterns.setHtml(html_patterns)
        else:
            self.lat_patterns.setPlainText("")




                
