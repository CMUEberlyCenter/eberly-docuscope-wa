#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
synonyms_editor.py

"""

import os, sys
import platform

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

import string
import re
import copy
import shutil
import traceback
import json
import threading

import shlex, subprocess
import time

from operator import itemgetter

import dslib.views as views
import dslib.utils as utils
import dslib.models.synonym as synonym
import dslib.views.dialogs  as dialogs
import dslib.views.autofit_textedit as autofit_textedit
import dslib.views.audit as audit

import pprint
pp = pprint.PrettyPrinter(indent=4)

SYNSET_EDITOR = 0
MULTIWORD_TOPICS_EDITOR = 1

class MultiwordTopicsEditor(QFrame):

    def __init__(self, app_win=None, parent=None):

        super(MultiwordTopicsEditor, self).__init__(parent)

        self.app_win = app_win;
        self.controller = None

        self.filepath = ""
        self.b_edited = False
        self.visualization_valid = True

        self.ignore_edits = False

        self.synonym_topics = list()

        self.saved_multiword_str = ""

        self.initUI()

    def setController(self, c):
        self.controller = c

    def invalidateVisualization(self):
        self.visualization_valid = False
        self.controller.showTopicClusterWarning(MULTIWORD_TOPICS_EDITOR)

    def validateVisualization(self):
        self.visualization_valid = True
        self.controller.hideTopicClusterWarning(MULTIWORD_TOPICS_EDITOR)

    def isVisualizationValid(self):
        return self.visualization_valid

    def reset(self):
        self.multiword_topics_field.clear()
        self.filepath = ""
        self.b_edited = False
        self.visualization_valid = True
        self.ignore_edits = False

    def initUI(self):
        self.setStyleSheet("MultiwordTopicsEditor {border-top: 1px solid " + views.default_ui_border_color + ";" +
                                   "background-color: "     + views.default_ui_input_background_color + ";}" +

                          "QLabel {font-weight: bold; font-size:" + str(views.default_ui_font_size) + "pt;}" +

                      "QScrollBar { background-color:"  + views.scrollbar_bg_color + ";" +
                                             "margin: 0;" +
                                             "border: 1px solid " + views.scrollbar_border_color + ";" +
                                             "}" +

              "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                      "border-radius: 6px;" +   
                                             "border: 1px solid " + views.scrollbar_border_color + ";}" +

            "QScrollBar::handle:vertical {min-height: 20px;}" +
           "QScrollBar::handle:horizontal {min-width: 20px;}" +

                       "QScrollBar::add-line {height: 0; width: 0; background: none; border: none;}" + 
                       "QScrollBar::sub-line {height: 0; width: 0; background: none; border: none;}" + 

                             "QPlainTextEdit {border: 1px solid " + views.default_ui_border_color + "; " + 
                                          "font-size:" + str(views.default_ui_font_size) + "pt;} ")

        main_vbox = QVBoxLayout()

        header = QLabel("Multiword Topics")
        header.setStyleSheet("QLabel {font-weight: bold;}")
        main_vbox.addWidget(header)

        # the text box for holding the topics
        self.multiword_topics_field = QPlainTextEdit()
        self.multiword_topics_field.textChanged.connect(self.edited)

        main_vbox.addWidget(self.multiword_topics_field)

        self.setLayout(main_vbox)

    def isEdited(self):
        return self.b_edited

    def setEdited(self, val):
        self.b_edited = val
        if val == False:
            topics_str = self.multiword_topics_field.toPlainText()
            self.saved_multiword_str = topics_str

    def reopen(self):
        if self.filepath == "":
            return

        self.b_edited = False
        self.ignore_edits = True
        self.readFromFile(self.filepath)
        self.ignore_edits = False
        self.validateVisualization()

    def edited(self):
        if self.ignore_edits:
            return

        topics_str     = self.multiword_topics_field.toPlainText()

        if self.b_edited == False and self.saved_multiword_str != topics_str:
            self.b_edited = True
            self.invalidateVisualization()

        elif self.saved_multiword_str == topics_str:
            self.b_edited = False            
            self.validateVisualization()

    def getMultiwordTopics(self):
        topics_str = self.multiword_topics_field.toPlainText()
        topics = topics_str.splitlines()
        return topics

    def setMultiwordTopics(self, multiword_topics):
        self.ignore_edits = True
        multiword_topics.sort()
        multiword_topics_str = '\n'.join(multiword_topics)
        self.multiword_topics_field.setPlainText(multiword_topics_str)
        self.b_edited = False
        self.validateVisualization()
        self.saved_multiword_str = multiword_topics_str
        self.ignore_edits = False

    def addMultiwordTopics(self, added_topics):
        self.ignore_edits = True
        topics_str     = self.multiword_topics_field.toPlainText()
        curr_topics    = topics_str.splitlines()
        revised_topics = list(set(curr_topics + added_topics))
        revised_topics.sort()
        self.multiword_topics_field.setPlainText('\n'.join(revised_topics))
        self.saved_multiword_str = revised_topics
        self.ignore_edits = False

    def removeMultiwordTopics(self, deleted_topics):
        self.ignore_edits = True        
        topics_str     = self.multiword_topics_field.toPlainText()   
        curr_topics    = topics_str.splitlines()
        revised_topics = list(set(curr_topics) - set(deleted_topics))
        self.multiword_topics_field.setPlainText('\n'.join(revised_topics))
        self.saved_multiword_str = revised_topics        
        self.ignore_edits = False

##
## Helper Functions
##
def text_to_synonyms(s):
    """
    This function takes a list of words/phrases separated by newline characters,
    and returns a list of words/phrases.
    It removes extra spaces and punctuations, and if there are commas within a line,
    it splits words/phrases separated by commas.
    """
    def remove_punct(token):
        new_token = ""
        for c in token:
            # if c not in string.punctuation:
            if c not in string.punctuation or c == '-':
                new_token += c
        return new_token

    lst = s.splitlines()
    res = list()
    for line in [s.split(',') for s in lst if s not in string.punctuation]:
        for w in line:
            res.append(remove_punct(w))

    res = [t.strip() for t in res]  # remove the spaces, just in case
    res = list(set(res))            # remove duplicates, just in case
    res.sort()

    return res
    

def generate_collision_msg(collisions, new_tc, html=False):

    # We assume that there is only ONE collision at a time.

    collision_count = len(collisions)     # count the number of collision entries.
    temp = list()                         # count the number of actual synonyms that are found in other topics
    for c in collisions:
        temp += c[1]
    topic_count = len(temp)

    existing_tc = collisions[0][0]
    pattern = collisions[0][1][0]

    if html:
        msg  = "<p>"
        msg += "You just tried to add <b>&ldquo;{}&rdquo;</b> to the topic cluster <b>&ldquo;{}&rdquo;</b>. ".format(pattern, new_tc)
        msg += "But, it is already included in <b>&ldquo;{}&rdquo;</b>.".format(existing_tc)
        msg += "</p>"

    else:
        msg = "You tried to add \"{}\"to the topic cluster \"{}\". ".format(pattern, new_tc)
        msg += "But, it is already included in {}\n\n".format(existing_tc)

    return msg

class SynsetEditor(QFrame):

    undoSelection = pyqtSignal(QListWidgetItem)

    def __init__(self, app_win=None, parent=None):

        super(SynsetEditor, self).__init__(parent)

        self.app_win = app_win
        self.controller = None

        self.synsets_changed   = False

        self.just_selected_synset = None
        self.current_synset = None
        self.original_synonym_str = ''
        self.b_revised = False
        self.untitled_count = 0
        self.prev_state = None

        self.multiword_topics_editor = None
        self.instructions = None

        self.visualization_valid = True
        self.ignore_edits = False

        self.just_unselected_synset = None

        self.initUI()

        self.synsets  = list()

        self.setSynsetEdited(False)

        self.undoSelection.connect(self.undoSelectionAction)
        self.ignore_current_item_changes = False

#    def setController(self, c):
#        self.controller = c

    @pyqtSlot(QListWidgetItem)
    def undoSelectionAction(self, item):
        self.ignore_current_item_changes = True
        x = item.data(Qt.UserRole)
        self.list_view.setCurrentItem(item)
        self.ignore_current_item_changes = False

    def setIgnoreEdits(self, val):
        self.ignore_edits = val

    def setInstructionsVisible(self, is_visible):
        if is_visible:
            self.instructions.show()
        else:
            self.instructions.hide()

    def invalidateVisualization(self):
        self.visualization_valid = False

    def validateVisualization(self):
        self.visualization_valid = True

    def isVisualizationValid(self):
        return self.visualization_valid

    # ----------        
    # 'initUI' initializes all the UI elements for the app.
    # ----------        
    def initUI(self):               

        self.setMinimumWidth(360)

        icon_ht = 12
        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_warning_icon.png'))
        pic = pic.scaled(icon_ht, icon_ht, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.topic_cluster_warning_icon = QIcon(pic)

        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_defined_icon.png'))
        pic = pic.scaled(icon_ht, icon_ht, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.topic_cluster_defined_icon = QIcon(pic)

        self.setStyleSheet("SynsetEditor {border-top: 0px solid " + views.default_ui_border_color + ";" +
                                   "background-color: "     + views.default_ui_input_background_color + ";}" +
                                "QToolTip {font-size: " + str(views.default_ui_font_size) + "pt;}")

        self.wcProxyModel = None

        self.curr_topics_dialog = None

        main_vbox = QVBoxLayout() 
        main_vbox.setContentsMargins(0,0,0,0)
        main_vbox.setSpacing(0)

        # Synonyms

        self.instructions = autofit_textedit.AutoFitTextEdit()
        self.instructions.setStyleSheet("AutoFitTextEdit {background-color: " + views.default_ui_input_background_color + ";" +
                                                                   "margin: 6px; " +                
                                                                   "border: 0;" +
                                                                   "}")
        doc = self.instructions.document()
        doc.setDefaultStyleSheet(views.instructions_style)
        main_vbox.addWidget(self.instructions)

        if self.app_win.areInstructionsHidden() == False:
            self.instructions.hide()

        editor_vbox = QVBoxLayout()
        editor_vbox.setContentsMargins(6,6,6,6)

        self.ctrl_container = QWidget()
        ctrl_hbox = QHBoxLayout()
        self.ctrl_container.setLayout(ctrl_hbox)
        ctrl_hbox.setContentsMargins(0,6,0,0)

        heading = QLabel("Topic Clusters")
        heading.setStyleSheet("QLabel {font-weight: bold; font-size:" + str(views.default_ui_font_size) + "pt;}")
        ctrl_hbox.addWidget(heading)

        ctrl_hbox.addStretch()

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            new_icon_path = 'data/icons/new_icon.png'
            delete_icon_path = 'data/icons/delete_icon.png'
        else:
            new_icon_path = 'data/icons/new_dark_icon.png'
            delete_icon_path = 'data/icons/delete_dark_icon.png'

        self.new_button = QPushButton()
        self.new_button.setFixedSize(20,20)
        self.new_button.setToolTip("Add")
        pic = QPixmap(utils.resource_path(new_icon_path))
        pic = pic.scaled(icon_ht, icon_ht, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.new_button.setIcon(QIcon(pic))
        self.new_button.clicked.connect(self.addNewSynset)
        self.new_button.setAutoDefault(False)
        ctrl_hbox.addWidget(self.new_button)

        ctrl_hbox.addSpacing(2)

        self.delete_button = QPushButton()
        self.delete_button.setFixedSize(20,20)
        self.delete_button.setToolTip("Delete")
        pic = QPixmap(utils.resource_path(delete_icon_path))
        pic = pic.scaled(icon_ht, icon_ht, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.delete_button.setIcon(QIcon(pic))
        self.delete_button.clicked.connect(self.deleteSelectedSynset)
        self.delete_button.setAutoDefault(False)
        ctrl_hbox.addWidget(self.delete_button)

        editor_vbox.addWidget(self.ctrl_container)
        editor_vbox.addSpacing(3)

        # List of Synonyms
        self.list_view = QListWidget()
        self.list_view.currentItemChanged.connect(self.synsetChanged)
        self.list_view.itemSelectionChanged.connect(self.synsetSelectionChanged)

        self.list_view.setStyleSheet("QListWidget {background-color: " + views.default_ui_input_background_color + ";" +
                                                            "border: 1px solid" + views.default_ui_border_color + ";" + 
                                                             "color: " + views.default_ui_text_color + ";" + 
                                                         "font-size: " + str(views.default_ui_font_size) + "pt;" +
                                                   "selection-color: " + views.menu_selected_text_color + ";" + 
                                        "selection-background-color: " + views.menu_selected_color + ";}" + 

                      "QScrollBar { background-color: " + views.default_ui_input_background_color + ";" +
                                             "margin: 0;" +
                                             "border: 1px solid " + views.scrollbar_border_color + 
                                             "}" +
                      "QScrollBar:vertical { background-color: " + views.default_ui_input_background_color + ";}" +

              "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                      "border-radius: 6px;" +   
                                             "border: 1px solid " + views.scrollbar_border_color + ";}" +

            "QScrollBar::handle:vertical {min-height: 20px;}" +
           "QScrollBar::handle:horizontal {min-width: 20px;}" +
                       "QScrollBar::add-line {height: 0; width: 0; background: none;" +
                                             "border: none;}" +

                       "QScrollBar::sub-line {height: 0; width: 0; background: none;" +
                                             "border: none;}"
                                     )

        self.list_view.setMaximumHeight(180)
        self.list_view.setMovement(QListWidget.Snap)
        self.list_view.setDefaultDropAction(Qt.MoveAction)
        editor_vbox.addWidget(self.list_view)
        editor_vbox.addSpacing(8) 

        label = QLabel("Topics (words/phrases)")
        label.setStyleSheet("QLabel {font-size:" + str(views.default_ui_font_size) + "pt;}")
        editor_vbox.addWidget(label)

        self.synonyms_field = QPlainTextEdit()
        self.synonyms_field.textChanged.connect(self.synsetEdited)
        self.synonyms_field.setStyleSheet("QPlainTextEdit {border: 1px solid" + views.default_ui_border_color + ";" +
                                                       "font-size: " + str(views.default_ui_font_size) + "pt;}" +

                      "QScrollBar { background-color: " + views.default_ui_input_background_color + ";" +
                                             "margin: 0;" +
                                             "border: 1px solid " + views.scrollbar_border_color + 
                                             "}" +

              "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                      "border-radius: 6px;" +   
                                             "border: 1px solid " + views.scrollbar_border_color + ";}" +

            "QScrollBar::handle:vertical {min-height: 20px;}" +
           "QScrollBar::handle:horizontal {min-width: 20px;}" +

                       "QScrollBar::add-line {height: 0; width: 0; background: none;" +
                                             "border: none;}" +

                       "QScrollBar::sub-line {height: 0; width: 0; background: none;" +
                                             "border: none;}")        

        editor_vbox.addWidget(self.synonyms_field)
        editor_vbox.addSpacing(8)

        main_vbox.addLayout(editor_vbox)
        main_vbox.addStretch()
        self.setLayout(main_vbox)

    def hideAddDeleteButtons(self):
        self.ctrl_container.hide()

    def synsetSelectionChanged(self):

        if self.ignore_edits:
            return

        item = self.list_view.currentItem()

        if item is not None: 
            item.setSelected(True)
            synset = item.data(Qt.UserRole) 
            lemma = synset.getLemma_()

            self.controller.clickATopic(lemma)
            self.controller.clickARuleByTopic(lemma)

    def showWarning(self):
        self.controller.showTopicClusterWarning(SYNSET_EDITOR)

    def hideWarning(self):
        self.controller.hideTopicClusterWarning(SYNSET_EDITOR)

    def clearAllTopicClusters(self):
        dialogs.WarningDialog("Feature Unavailable", "Sorry. This feature is not available yet.")

    def deleteAllTopicClusters(self):
        dialogs.WarningDialog("Feature Unavailable", "Sorry. This feature is not available yet.")

    def showCurrentTopics(self):
        if self.curr_topics_dialog is not None:
            self.curr_topics_dialog.setTopics(self.controller.getCombinedTopics(exclude_synonyms=True))
            self.curr_topics_dialog.show()
            self.curr_topics_dialog.activateWindow()
            self.curr_topics_dialog.raise_()
        else:
            self.curr_topics_dialog = CurrentTopicsDialog(self.controller.getCombinedTopics(exclude_synonyms=True), parent=self.app_win)

    def setMultiwordTopicsEditor(self, editor):
        self.multiword_topics_editor = editor

    def saveAndUpdateVisualization(self):
        self.controller.forceUpdateVisualization()

    def setController(self, controller):
        self.controller = controller
        if self.app_win.areInstructionsHidden() == False and self.instructions is not None:
            if self.controller.isExpectationsPanel():
                html_instructions = self.app_win.getInstruction('topic_cluster_edu')
            else:
                html_instructions = self.app_win.getInstruction('topic_cluster_pro')            

            self.instructions.setHtml(html_instructions)

    def hideToolsPanel(self):
        self.controller.hideToolsPanel()

    def reset(self, display_only=False):

        self.synsets = list()
        self.list_view.clear()
        self.cleanUpSynsetFields()

        self.synsets_changed   = False
        self.just_selected_synset = None
        self.current_synset = None
        self.b_revised = False
        self.untitled_count = 0
        self.invalidateVisualization()

    def isSynsetEdited(self):
        self.b_revised = False        
        if self.prev_state is None:
            return False

        self.b_revised = False
        for s in self.synsets:
            lemma = s.getLemma()
            lst = s.getSynonyms()
            lst.sort()
            curr_str = '\n'.join(lst)

            if self.prev_state is not None and self.prev_state.get(lemma, "") != curr_str:
                self.b_revised = True
                break

        return self.b_revised

    def synsetChanged(self, current_item, previous_item):
        """
        This method is used when a topic cluster / synset is clicked (selected). The click may be done by
        the user, or it may be programmatically done.

        """
#        print("----------------------------------------")
#        print("synsetChanged()")

        ignore_edits_copy = self.ignore_edits
        self.ignore_edits = True

        ps = None
        cs = None

        if current_item is not None:
            cs = current_item.data(Qt.UserRole)  # cs = current synset

        if previous_item is not None:
            ps = previous_item.data(Qt.UserRole) # ps = previous synset

        ####################################
        
        # if ps is not None:
        #     print("    previous item =", ps.getLemma())
        # else:
        #     print("    previous item = None")

        # if cs is not None:
        #     print("    curretn item =", cs.getLemma())
        # else:
        #     print("    current item = None")

        if self.ignore_current_item_changes:
            self.ignore_edits = ignore_edits_copy
            return

        if previous_item == current_item: # return since the same item is clicked.
            previous_item = None
            self.just_selected_synset = None
            self.current_synset = None
            self.ignore_edits = ignore_edits_copy
            return

        if previous_item is not None and \
            self.just_unselected_synset != ps:
            # The previous item is not the same as the currently clicked item, and it is not
            # the same as the item that was most recently unselected (cleared),
            # update the content of the previous item first.
            res = self.updateSynset(item=previous_item)
            if res == False:   # conflict
                # Just in case, self.updateSynset should not return False now. It's been taken care of
                # by the conflict resolution dialog.
                current_item.setSelected(False)
                self.undoSelection.emit(previous_item)
                self.ignore_edits = ignore_edits_copy
                return

        if current_item is not None:
            self.just_selected_synset = cs
            self.cleanUpSynsetFields()
            self.current_synset = self.just_selected_synset
            self.updateSynsetFields(self.current_synset)

        else:
            self.just_selected_synset = None
            self.current_synset = None

        self.just_unselected_synset = None
        self.ignore_edits = ignore_edits_copy

    def updateCurrentSelection(self, item):
        """
        This method updates the synset associated with 'item', which is one of the topic clusters
        listed on the screen.
        """

        if item != None:

            new_lemma = item.text()                                 # The label is the lemma. It may have been edited.
            synset = item.data(Qt.UserRole)                         # retrieve the synset from item

            if new_lemma != synset.getLemma():                      # if new_lemma is different from the current lemma,
                synset.setLemma(new_lemma)                          # update the lemma of the synset (in case it's changed)
                self.controller.lockOrganizationPanel()             # lock the visualzaition panel
                self.showWarning()
                self.setSynsetEdited(True)

            synonyms_str = self.synonyms_field.toPlainText()        # get the synonyms form the text box
            synonyms_str = synonyms_str.replace("[", "").replace("]", "")            
            synonyms_lst = text_to_synonyms(synonyms_str)           # convert it to a list of synonyms

            collisions   = self.findSynonymCollisions(new_lemma, synonyms_lst)   # check for collisions

            if collisions:
                # If there are collisions, ask the user which topic cluster the duplicate patern should be included.
                # We'll need to add the last character to the mini editor!!
                self.controller.updateMiniSynsetEditors(synonyms_str, force_update=True)

                d= ResolveCollisionDialog(new_lemma, collisions)
                if d.retval == QMessageBox.Save:
                    existing_tc = collisions[0][0]
                    selected_tc = d.getSelection()
                    pattern = collisions[0][1][0]

                    if selected_tc == new_lemma:
                        # The user decided not to keep it in the existing topic cluster.
                        # So, let's romove the pattern from the exisitng topic cluster                        
                        existing_synset = self.getSynset(existing_tc)
                        existing_synset.deleteSynonym(pattern)

                    else:
                        # The user decided not to add the pattern to the target topic cluster.
                        # Let's remove the pattern from the target topic cluster (i.e., new_lamma).
                        if pattern in synonyms_lst:
                            synonyms_lst.remove(pattern)
                            display_str = self.controller.generateDisplayTopicClusterString(synonyms_lst, new_lemma)
                            self.synonyms_field.setPlainText(display_str)
                            self.controller.updateMiniSynsetEditors(display_str, force_update=True)

                elif d.retval == QMessageBox.Apply:
                    pattern = collisions[0][1][0]
                    if pattern in synonyms_lst:                    
                        synonyms_lst.remove(pattern)                        
                        revised_pattern = d.getRevisedPattern()
                        synonyms_lst.append(revised_pattern)
                        synonyms_lst.sort()
                        display_str = self.controller.generateDisplayTopicClusterString(synonyms_lst, new_lemma)
                        self.synonyms_field.setPlainText(display_str)
                        self.controller.updateMiniSynsetEditors(display_str, force_update=True)
                else:
                    pass
                    # The use clicked Cancel. This is an equivalent of clicking the Save button after
                    # selecting the currently open topic cluster (i.e., not the existing one).
                    # existing_tc = collisions[0][0]
                    # pattern = collisions[0][1][0]
                    # existing_synset = self.getSynset(existing_tc)
                    # existing_synset.deleteSynonym(pattern)

            else:
                # No collisions are found.
                # synset = item.data(Qt.UserRole)       # retrieve the synset from item
                # synset.setLemma(new_lemma)            # update the lemma of the synset (in case it's changed)
                ignore_edits_copy = self.ignore_edits

                # Since no collisions are found, we will simply add the synonyms_lst (from the text box), to the synset.
                # setSynonyms() returns a list of topics (synonyms) that were deleted.
                removed_synonyms = synset.setSynonyms(synonyms_lst)

                # create a list of multiword topics, and ask the mutliword topics editor
                # to add new multiword topics, IF they aren't inclded yet.
                self.multiword_topics_editor.removeMultiwordTopics(removed_synonyms)
                multiword_topics = [s.strip() for s in synonyms_lst if ' ' in s]
                self.multiword_topics_editor.addMultiwordTopics(multiword_topics)

            # Update the icon shown next to the topic cluster name.
            ignore_edits_copy = self.ignore_edits
            self.ignore_edits = True

            if synonyms_lst:
                item.setIcon(self.topic_cluster_defined_icon)
            elif synonyms_lst == []:
                item.setIcon(self.topic_cluster_warning_icon)

            self.ignore_edits = ignore_edits_copy

            if collisions:
                return False
            else:
                return True

    def addSynonym(self, lemma, synonym):
        """
        SynsetEditor.addSynonym
        This method is used to add a new 'synonym' to a synset/topic cluster associated with 'lemma'.
        It is only used when the user tries to add a synonym using the contextual menu from the editor.
        """

        changed = False
        ignore_edits_copy = self.ignore_edits

        # Let's find a synset that matches 'lemma'
        s = self.getSynset(lemma)

        if s is None:
            return

        # A matching synset 's' is found.
        # Check if synonym is already included in this topic cluster/synset.

        curr_synonyms = [pat.lower() for pat in s.getSynonyms()]
        if synonym in curr_synonyms:
            # It is already included. Show a warning dialog, and return.
            dialogs.WarningDialog("Duplicate entry.", "\"{}\" is already in {}.".format(synonym, lemma))
            return False

        # At least, there is no duplicate in the synset associated with 'lemma' (but ther emay be collisions).
        # So, let's move on.

        # First, we need to select the synset in the list (as if the user had clicked it.)
        items = self.list_view.findItems(lemma, Qt.MatchExactly)
        if items:
            item = items[0]
            self.list_view.setCurrentItem(item)
            item.setIcon(self.topic_cluster_defined_icon)

        # Second, we now enter the new synonym, as if the user typed it.
        # Everything else should be taken care of when the self.synonyms_field is updated.
        # i.e., SynsetEditor.synsetEdited() is triggered.
        self.just_selected_synset = s
        synonyms_lst = s.getSynonyms()
        synonyms_lst.append(synonym)
        synonyms_lst.sort()
        display_str = self.controller.generateDisplayTopicClusterString(synonyms_lst, lemma)
        self.synonyms_field.setPlainText(display_str)


    def addSynset(self, lemma, synonyms_lst, merge=False, update_list_item=True):
        """
        SynsetEditor.addSynset()
        This method adds a list of synonyms (synonyms_lst) to a synset, which is associated with 'lemma'. 
        We will do this by editing the synonyms field (as if the user edited the text in the field.). Then,
        all the necessary actions get triggered to update the appropriate synset.
        """

        is_new_synset = True
        lemma_ = lemma.replace(' ', '_')
        new_synonyms_lst = None

        synset = self.getSynset(lemma)
        # if the topic cluster (lemma) already exits, we are going to update the entire set of words/phrases togetehr.

        if synset is not None:
            # lemma already exists

            if merge:  # if merge is True, nothing gets removed.
                curr_synonyms_lst = synset.getSynonyms()
                new_synonyms_lst  = list(set(curr_synonyms_lst + synonyms_lst ))  
            else:      # replace
                new_synonyms_lst  = synonyms_lst


            items = self.list_view.findItems(lemma, Qt.MatchExactly)
            if items:

                # We should find an item if there is already a synset.
                # It is a big error if items is an empty list!!
                item = items[0]

                if update_list_item:
                    # We are in the interactive mode. So, let's uupdate the synonyms field, and have it trigger
                    # the rest of the actions for updating the synset.
                    self.list_view.setCurrentItem(item)
                    self.current_synset = synset

                    if new_synonyms_lst:
                        # If new_synonyms_lst is not empty, update the text box,
                        # and change the icon next to the list item.
                        item.setIcon(self.topic_cluster_defined_icon)
                        new_synonyms_lst.sort()
                        display_str = self.controller.generateDisplayTopicClusterString(new_synonyms_lst, lemma)
                        self.synonyms_field.setPlainText(display_str)
                    else:
                        item.setIcon(self.topic_cluster_warning_icon)
                        self.synonyms_field.setPlainText('')

                elif new_synonyms_lst:
                    # If we aren't updating the UI, we'll need to update the synset manually.
                    removed_synonyms = synset.setSynonyms(new_synonyms_lst)
                    self.multiword_topics_editor.removeMultiwordTopics(removed_synonyms)
                    item.setIcon(self.topic_cluster_defined_icon)

            # If there are noew multi-word patterns, update the multiword topics editor.
            if new_synonyms_lst is not None:
                multiword_topics = [s.strip() for s in new_synonyms_lst if ' ' in s]
            else:
                multiword_topics = [s.strip() for s in synonyms_lst if ' ' in s]

            self.multiword_topics_editor.addMultiwordTopics(multiword_topics)

        else:
            # if the added synset is new, create a new synset object
            # and append it to the list self.synsets.
            sd = {"lemma": lemma, "synonyms": synonyms_lst}

            new_synset= synonym.DSSynset(synset_dict=sd)
            self.synsets.append(new_synset)

            if update_list_item:
                self.just_selected_synset = new_synset
                self.current_synset = new_synset

            # we need to add a new list item for the synset.
            if synonyms_lst:
                item = QListWidgetItem(self.topic_cluster_defined_icon, lemma)
            elif synonyms_lst == []:
                item = QListWidgetItem(self.topic_cluster_warning_icon, lemma)

            item.setData(Qt.UserRole, new_synset)
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            self.list_view.addItem(item)

            if update_list_item:            
                self.list_view.setCurrentItem(item)

            # populate the synset field with the synonyms
            if update_list_item and self.current_synset is not None:
                self.updateSynsetFields(self.current_synset)

            multiword_topics = [s.strip() for s in synonyms_lst if ' ' in s]
            if multiword_topics:
                self.multiword_topics_editor.addMultiwordTopics(multiword_topics)

        self.setSynsetEdited(False)
        self.controller.updateUserDefinedSynonyms()

    def synsetEdited(self):
        """
        SynsetEditor.synsetEdited()
        This method is triggered when self.synonyms_field is edited/modified.
        """

        if self.ignore_edits:
            return

        if self.current_synset is None:
            return

        if self.controller.isDocument() == False:
            self.ignore_edits = True
            self.synonyms_field.clear()            
            self.ignore_edits = False
            return

        # Retrieve the synonyms from the text box, and create a list of synonyms.
        curr_synonyms_str = self.synonyms_field.toPlainText()
        curr_synonyms_str = curr_synonyms_str.replace("[", "").replace("]", "")                    
        curr_synonyms_lst = text_to_synonyms(curr_synonyms_str)

        # Retrieve the synonyms that have already been saved with the currently selected synset.

        if self.current_synset is not None:
            saved_synonyms = self.current_synset.getSynonyms()
        else:
            saved_synonyms = []

        ret = True
        if list(set(curr_synonyms_lst) - set(saved_synonyms)) != []:
            # We will only call self.updateSynset() if the user typed something rather than a space.
            ret = self.updateSynset()
        else:
            self.current_synset.setSynonyms(curr_synonyms_lst)

        # Check if any of the words/phrases in the topic clusters have been modified.
        # We will update the MiniSynsetEditor, so retrieve the synonyms in the text box.
        curr_synonyms_str = self.synonyms_field.toPlainText()
        curr_synonyms_str = curr_synonyms_str.replace("[", "").replace("]", "")

        if self.isSynsetEdited():

            self.controller.lockOrganizationPanel()

            if ret:
                self.controller.updateMiniSynsetEditors(synonyms_str=curr_synonyms_str)
            else:
                self.controller.updateMiniSynsetEditors(synonyms_str=curr_synonyms_str, force_update=True)
            self.showWarning()
            self.setSynsetEdited(True)
        else:

            self.controller.unlockOrganizationPanel()
            self.controller.updateMiniSynsetEditors(synonyms_str=curr_synonyms_str)
            self.hideWarning()    

    def deleteSynset(self, topic_clusters, warning=True):

        remove_list = list()
        for s in self.synsets: 
            lemma =  s.getLemma()
            if lemma not in topic_clusters:
                remove_list.append(lemma)

        for lemma in remove_list:
            self.setSelectedSynset(lemma)
            self.deleteSelectedSynset(warning=warning)

    def setSelectedSynset(self, lemma):

        if self.ignore_edits:
            return

        self.ignore_edits = True
        items = self.list_view.findItems(lemma, Qt.MatchExactly)
        if items:
            item = items[0]
            self.list_view.setCurrentItem(item)
            self.current_synset = item.data(Qt.UserRole)

        self.ignore_edits = False

    def setSynsetEdited(self, val):
        self.b_revised = val
        if val: # edited
            self.invalidateVisualization()
        else:
            pass

    def isExistingSynset(self, synset=None, lemma=None):
        if synset is not None:
            for s in self.synsets:
                if s.getLemma_() == synset.getLemma_():
                    return True
            return False
        elif lemma is not None:
            for s in self.synsets:            
                if s.getLemma() == lemma:
                    return True            

    def addNewSynset(self, lemma=None, selection=True):
        if self.controller.isDocument() == False:
            self.ignore_edits = True
            self.synonyms_field.clear()            
            self.ignore_edits = False
            return

        self.ignore_edits = True

        # Generate a default name for the synset
        if lemma == False or lemma is None:
            self.untitled_count += 1
            lemma = 'Undefined {}'.format(self.untitled_count)
            self.setSynsetEdited(True)            

        elif self.isExistingSynset(lemma=lemma):
            return

        synset = synonym.DSSynset(lemma=lemma)
        self.synsets.append(synset)
        self.just_selected_synset = synset
        
        item = QListWidgetItem(self.topic_cluster_warning_icon, lemma)
        item.setData(Qt.UserRole, synset)
        item.setFlags(item.flags() | Qt.ItemIsEditable)
        self.list_view.addItem(item)

        if selection:
            self.list_view.setCurrentItem(item)
            self.list_view.editItem(item)

        self.ignore_edits = False

    def deleteSelectedSynset(self, checked=False, warning=True):

        if self.current_synset is not None:

            # If warning is false, we won't show the warning dialog. 
            if warning:
                lemma = self.current_synset.getLemma()
                d = dialogs.YesNoDialog("Delete \"{}\"?".format(lemma),
                                                "Are you sure you want to delete <b>{}</b>?\n\n".format(lemma) +
                                                "Click OK to delete {} and update the visualizations.\n".format(lemma)
                                                )

                if d.retval == QMessageBox.Cancel:
                    return                

                if d.retval == QMessageBox.Ok:
                    pass

            self.setIgnoreEdits(True)
            deleted_synonyms = self.current_synset.getSynonyms()
            self.multiword_topics_editor.removeMultiwordTopics(deleted_synonyms)
            self.synsets.remove(self.current_synset)

            row = self.list_view.currentRow()
            self.clearSelection()
            self.list_view.takeItem(row)
            self.just_selected_synset = None
            self.current_synset = None
            self.setSynsetEdited(True)
            self.setIgnoreEdits(False)
            self.saveAndUpdateVisualization()

    def setSynsets(self, synsets):

        ignore_edits_copy = self.ignore_edits
        self.ignore_edits = True
        self.reset()

        self.synsets = sorted(synsets, key=lambda x: x.getLemma())

        self.ignore_edits = True

        self.prev_state = dict()

        for synset in self.synsets:
            lemma = synset.getLemma()

            if synset.getSynonyms():
                item = QListWidgetItem(self.topic_cluster_defined_icon, lemma)
            else:
                item = QListWidgetItem(self.topic_cluster_warning_icon, lemma)
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            item.setData(Qt.UserRole, synset)
            self.list_view.addItem(item)

            # Let's remember the state where all the synsets are re-set.
            synonyms_lst = synset.getSynonyms()
            synonyms_lst.sort()
            synonyms_str = '\n'.join(synonyms_lst)
            self.prev_state[lemma] = synonyms_str

        self.ignore_edits = ignore_edits_copy


    def resetEditStates(self):
        self.prev_state = dict()
        for synset in self.synsets:
            # Let's remember the state where all the synsets are re-set.
            lemma = synset.getLemma()
            synonyms_lst = synset.getSynonyms()
            synonyms_lst.sort()
            synonyms_str = '\n'.join(synonyms_lst)
            self.prev_state[lemma] = synonyms_str

    def getSynset(self, lemma):
        for synset in self.synsets:
            if synset.getLemma() == lemma:
                return synset
        return None

    def getSynsets(self):
        return self.synsets

    def getBaseTopics(self):
        base_topics = list()
        for synset in self.synsets:
            base_topics.append(synset.getLemma_())
        return base_topics

    def getAllSynonyms(self):
        synonyms_lst = list()
        for synset in self.synsets:
            synonyms_lst += synset.getSynonyms()
        return synonyms_lst

    def clearSelection(self):

        saved_ignore_edits = self.ignore_edits
        item = self.list_view.currentItem()
        if item is not None:
            if self.current_synset is not None:
                self.just_unselected_synset = self.current_synset
            else:                
                self.just_unselected_synset = None

            self.ignore_edits = True
            item.setSelected(False)
            # self.list_view.setCurrentItem(item, QItemSelectionModel.Clear | QItemSelectionModel.Deselect)
            self.list_view.setCurrentRow(-1)

            self.ignore_edits = True

            self.list_view.selectAll()
            self.list_view.clearSelection()

            self.synonyms_field.clear()
            self.ignore_edits    = saved_ignore_edits
            self.current_synset  = None
            self.synsets_changed = False
            self.just_selected_synset = None
            self.b_revised = False

    def updateSynset(self, item=None):

        if self.just_unselected_synset is not None:
            return
        elif self.current_synset is None:            
            return

        if item is None:
            # if item is None (unspecified), we will update the currently selected iteml.
            item = self.list_view.currentItem()

        if item is not None:
            # if item is not None (either it is given by the caller, or the there is one selected currently).
            return self.updateCurrentSelection(item)

    def cleanUpSynsetFields(self):
        synonym_revised = self.isSynsetEdited()
        self.synonyms_field.clear()
        self.setSynsetEdited(synonym_revised)

    def updateSynsetFields(self, synset):
        """
        This method is used to update the text box that lists synonyms included in 'synset'.
        """

        synset_revised = self.isSynsetEdited()
        synonyms_lst = synset.getSynonyms()
        lemma = synset.getLemma_()
        synonyms_lst.sort()
        display_str = self.controller.generateDisplayTopicClusterString(synonyms_lst, lemma)
        self.synonyms_field.setPlainText(display_str)
        self.setSynsetEdited(synset_revised)

    def addTopicClustersIfMissing(self, topic_clusters):

        temp = list()
        for synset in self.synsets:
            temp.append(synset.getLemma())

        missing_topics = list(set(topic_clusters) - set(temp))

        for t in sorted(missing_topics):
            self.addNewSynset(lemma=t, selection=False)

    def findSynonymCollisions(self, lemma, synonyms):

        res = list()
        for synset in self.synsets:

            if synset.getLemma() == lemma: # we need to skip the same synonym set.
                continue

            # collision detection is case insensitive
            existing_synonyms = [s.lower() for s in synset.getSynonyms()]  # existing synonyms for synset
            edited_synonyms   = [s.lower() for s in synonyms]              # synonyms edited by the user
            intersection = list(set(existing_synonyms) & set(edited_synonyms))

            if intersection:
                res.append((synset.getLemma(), intersection))

        return res

    def getCurrentSynset(self):
        return self.current_synset

    def getCurrentSynonymsList(self):
        synonyms_str = self.synonyms_field.toPlainText()
        synonyms_str = synonyms_str.replace("[", "").replace("]", "")
        synonyms_lst = text_to_synonyms(synonyms_str)
        return synonyms_lst

class MiniSynsetEditor(QFrame):

    def __init__(self, app_win=None, container=None, line=False, parent=None):

        super(MiniSynsetEditor, self).__init__(parent)

        self.rule = None
        self.app_win = app_win
        self.container = container
        self.audit_panel = None
        self.is_line = line
        self.topic_cluster = None

        self.controller = None
        self.current_synset = None
        self.original_synonym_str = ''
        self.b_revised = False
        self.untitled_count = 0
        self.prev_state = None

        self.multiword_topics_editor = None

        self.visualization_valid = True
        self.ignore_edits = True
        self.default_instruction = "<p><span style=\"color: #999;\">Select a topic clustesr.<span></p>"        

        self.initUI()

        self.setSynsetEdited(False)

        # self.undoSelection.connect(self.undoSelectionAction)
        self.ignore_current_item_changes = False

    def setController(self, c):
        self.controller = c

    def initUI(self):               
        font = self.font()
        fmetrics = QFontMetrics(font)
        icon_ht = fmetrics.height()

        if self.is_line:
            self.setStyleSheet("MiniSynsetEditor {border: none;" +
                                       "background-color: "     + views.default_ui_input_background_color + ";" +
                                          "border-bottom: 1px solid " + views.default_ui_border_color + ";" +
                                                  "}")
        else:
            self.setStyleSheet("MiniSynsetEditor {border: none;" +
                                       "background-color: "     + views.default_ui_input_background_color + ";" +
                                                  "}")

        self.setMaximumHeight(200)
        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_warning_icon.png'))
        pic = pic.scaled(icon_ht, icon_ht, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.topic_cluster_warning_icon = QIcon(pic)

        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_defined_icon.png'))
        pic = pic.scaled(icon_ht, icon_ht, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.topic_cluster_defined_icon = QIcon(pic)

        self.curr_topics_dialog = None

        main_vbox = QVBoxLayout() 
        main_vbox.setContentsMargins(0,0,0,0)
        main_vbox.setSpacing(0)

        # Name, Lemma and list of synonms
        hbox_container = QWidget()
        # hbox_container.setFixedHeight(26)
        hbox_container.setStyleSheet("background-color: " + views.default_ui_input_background_color + ";")
        hbox_ui = QHBoxLayout()
        hbox_ui.setContentsMargins(0,8,0,0)
        hbox_container.setLayout(hbox_ui)

        hbox_ui.addSpacing(6)

        tc_icon = QLabel()
        tc_icon.setStyleSheet("background-color: transparent; padding: 0px; margin: 0px;")
        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_icon.png'))
        tc_icon.setPixmap(pic.scaled(18, 18, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox_ui.addWidget(tc_icon)

        header = QLabel("Topic Cluster")
        header.setStyleSheet("QLabel {font-weight: bold; font-size:" + str(views.default_ui_font_size) + "pt;}")
        hbox_ui.addWidget(header)

        hbox_ui.addStretch()

        main_vbox.addWidget(hbox_container)

        editor_hbox = QHBoxLayout()
        editor_hbox.setContentsMargins(6,0,6,0)

        self.description = QTextEdit()
        self.description.setStyleSheet("QTextEdit {border: 0;" + 
                            "background-color: " + views.default_ui_input_background_color + ";}")
        self.description.setReadOnly(True)
        doc = self.description.document()
        doc.setDefaultStyleSheet(views.instructions_style)

        self.description.setHtml(self.default_instruction)

        editor_hbox.addWidget(self.description)
        editor_hbox.addSpacing(6)

        vbox = QVBoxLayout()
        vbox.setContentsMargins(0,0,0,0)

        # List of Synonyms
        self.synonyms_field = QPlainTextEdit()
        self.synonyms_field.textChanged.connect(self.synsetEdited)
        self.synonyms_field.setStyleSheet("QPlainTextEdit {border: 1px solid" + views.default_ui_border_color  + ";" +
                                                "background-color: " + views.default_ui_input_background_color + ";}" +

                                   "QScrollBar { background-color: " + views.default_ui_input_background_color + ";" +
                                                          "margin: 0;" +
                                                          "border: 1px solid " + views.scrollbar_border_color + 
                                                          "}" +

              "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                      "border-radius: 6px;" +   
                                             "border: 1px solid " + views.scrollbar_border_color + ";}" +

            "QScrollBar::handle:vertical {min-height: 20px;}" +
           "QScrollBar::handle:horizontal {min-width: 20px;}" +

                       "QScrollBar::add-line {height: 0; width: 0; background: none;" +
                                             "border: none;}" +

                       "QScrollBar::sub-line {height: 0; width: 0; background: none;" +
                                             "border: none;}")

        vbox.addWidget(self.synonyms_field)
        vbox.addSpacing(3)

        hbox = QHBoxLayout()
        hbox.setContentsMargins(0,2,0,5)
        hbox.addStretch()
        self.update_button = QPushButton("Update Now")
        self.update_button.clicked.connect(self.saveAndUpdateVisualization)
        self.update_button.setEnabled(False)
        hbox.addWidget(self.update_button)

        vbox.addLayout(hbox)
        editor_hbox.addLayout(vbox)

        main_vbox.addLayout(editor_hbox)
        self.setLayout(main_vbox)

    def setIgnoreEdits(self, val):
        self.ignore_edits = val

    def clearContent(self):
        self.ignore_edits = True
        self.description.setHtml(self.default_instruction)
        self.synonyms_field.setPlainText("")
        self.update_button.setEnabled(False)
        self.ignore_edits = False

    def setRule(self, rule, description):
        self.rule = rule

        if self.app_win.areInstructionsHidden() == False:

            if self.controller.isAuditPanelVisible():
                html_instructions = self.app_win.getInstruction('topic_cluster_edu')
            else:
                html_instructions = self.app_win.getInstruction('topic_cluster_pro')

            msg = description + html_instructions

        else:
           msg = description

        self.description.setHtml(msg)

    def setAuditPanel(self, audit_panel):
        self.audit_panel = audit_panel

    def setTopicCluster(self, topic_cluster):
        self.ignore_edits = True

        if self.controller is None:
            return

        self.topic_cluster = topic_cluster
        self.synonyms_lst = self.controller.getSynonymsFromSynsetEditor(self.topic_cluster)
        self.synonyms_lst.sort()
        if self.synonyms_lst:
            display_str = self.controller.generateDisplayTopicClusterString(self.synonyms_lst, topic_cluster.replace(' ', '_'))
            self.synonyms_field.setPlainText(display_str)
            self.synonyms_field.moveCursor(QTextCursor.End)
        else:
            self.synonyms_field.setPlainText("")

        self.ignore_edits = False
        
        if self.controller.isSynsetEdited():
            self.update_button.setEnabled(True)
            self.setSynsetEdited(True)
        else:
            self.update_button.setEnabled(False)
            self.setSynsetEdited(False)

    # MiniSynsetEditor
    def saveAndUpdateVisualization(self):
        topics_str = self.synonyms_field.toPlainText()
        topics_str = topics_str.replace("[", "").replace("]", "")        
        topics_lst = text_to_synonyms(topics_str)

        collisions = self.controller.findSynonymCollisions(self.topic_cluster, topics_lst)

        if collisions:
            msg = generate_collision_msg(collisions, self.topic_cluster)
            msg += "\n\nClick cancel, and delete the duplicate topic(s) first.\n\n"
            dialogs.WarningDialog("Duplicate entries", msg)

        else:
            # if there are no collisions, add the list of topics to self.topic_clustser
            self.controller.updateSynset(self.topic_cluster, topics_lst)
            self.controller.setRuleToRestore(self.rule)

    def isEdited(self):
        return self.b_revised

    def setSynsetEdited(self, val):
        self.b_revised = val

    def getSynonymsList(self):
        topics_str = self.synonyms_field.toPlainText()
        topics_str = topics_str.replace("[", "").replace("]", "")
        topics_lst = text_to_synonyms(topics_str)
        return topics_lst

    def synsetEdited(self):
        """
            MiniSynsetEditor.synsetEdited()    
        """
        if self.ignore_edits:
            return

        if self.controller.isDocument() == False:
            self.ignore_edits = True
            self.synonyms_field.clear()            
            self.ignore_edits = False
            return

        current_lst = self.getSynonymsList()

        if self.topic_cluster is not None:
            self.ignore_edits = True
            self.controller.updateSynset(self.topic_cluster, current_lst, update_visualization=False, container=self.container)
            self.ignore_edits = False

        if self.controller.isSynsetEdited():
            self.update_button.setEnabled(True)
            self.setSynsetEdited(True)
        else:
            self.update_button.setEnabled(False)
            self.setSynsetEdited(False)

    def updateSynonymsField(self, synonyms_str, force_update=False):
        ignore_edits_copy = self.ignore_edits
        if self.ignore_edits and force_update==False:
            return

        self.ignore_edits = True
        synonyms_lst = synonyms_str.splitlines()
        display_str = self.controller.generateDisplayTopicClusterString(synonyms_lst, None)
        self.synonyms_field.setPlainText(display_str)

        self.synonyms_field.moveCursor(QTextCursor.End)
        self.ignore_edits = ignore_edits_copy

class CurrentTopicsDialog(QDialog):

    def __init__(self, topics, parent=None):
        super(CurrentTopicsDialog, self).__init__(parent)

        self.setWindowTitle("Topics found in this Document")

        self.setFixedWidth(300)
        self.setFixedHeight(400)
        self.setStyleSheet("TopicClusterDialog {border: 0;" + \
                                     "background-color: " + views.default_ui_background_color + "}")
        main_vbox = QVBoxLayout()
        self.setLayout(main_vbox)

        self.topics_field = QPlainTextEdit()
        self.topics_field.setReadOnly(True)
        self.topics_field.setPlainText('\n'.join(topics))
        main_vbox.addWidget(self.topics_field)

        self.show()

    def setTopics(self, topics):
        self.topics_field.clear()
        self.topics_field.setPlainText('\n'.join(topics))

class ResolveCollisionDialog(QDialog):
    def __init__(self, topic_cluster, collisions, parent=None):
        super(ResolveCollisionDialog, self).__init__(parent)

        collision    = collisions[0]
        collision_tc = collision[0]

        self.collisions = collisions
        self.new_topic_cluster = topic_cluster
        pattern = collisions[0][1][0]

        self.setWindowTitle("Topic Cluster Conflict")
        self.setFixedWidth(600)
        self.setMinimumHeight(50)
        self.setStyleSheet("ResolveCollisionDialog {border: 0;" + \
                                         "background-color: " + views.default_ui_background_color + "}" + \

                                     "QWidget {font-size:" + str(views.default_ui_font_size) + "pt;}")

        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

        main_vbox = QVBoxLayout()
        self.setLayout(main_vbox)

        msg =  generate_collision_msg(collisions, topic_cluster, html=True)
        msg += "<p>Select the topic cluster <b>&ldquo;{}&rdquo;</b> should be included in? ".format(pattern)
        msg += "Or, you may revise or extend the phrase in the text field below, and click Enter.</p>"

        self.instruction = autofit_textedit.AutoFitTextEdit()
        self.instruction.setReadOnly(True)
        self.instruction.setStyleSheet("AutoFitTextEdit {background-color: " + views.default_ui_background_color + ";"
                                                   "margin-top:     0px; " + \
                                                   "margin-bottom:  6px;" + \
                                                   "padding-top:    0px;" + \
                                                   "padding-left:   6px; " + \
                                                   "border:         0;" + \
                                                   "}")
        doc = self.instruction.document()        
        doc.setDefaultStyleSheet(views.instructions_style)

        self.instruction.setHtml(msg)

        main_vbox.addWidget(self.instruction)


        hbox = QHBoxLayout()
        self.radio_button_group = QButtonGroup()
        self.radio_button_group.setExclusive(True)

        self.existing_tc_radio_button = QRadioButton(collision[0])            # radio button #0 (existing)
        self.existing_tc_radio_button.setChecked(False)
        self.existing_tc_radio_button.toggled.connect(self.buttonClicked)
        self.radio_button_group.addButton(self.existing_tc_radio_button, 0)

        self.new_tc_radio_button = QRadioButton(topic_cluster)
        self.new_tc_radio_button.setChecked(False)
        self.new_tc_radio_button.toggled.connect(self.buttonClicked) 
        self.radio_button_group.addButton(self.new_tc_radio_button, 1)        # radio button #1 (current)

        hbox.addWidget(self.existing_tc_radio_button)
        hbox.addWidget(self.new_tc_radio_button)
        hbox.addStretch()
        main_vbox.addLayout(hbox)

        hbox = QHBoxLayout()
        hbox.addStretch()

        self.select_button = QPushButton("Select")
        self.select_button.setDisabled(True)
        self.select_button.clicked.connect(self.select)
        self.select_button.setAutoDefault(True)
        hbox.addWidget(self.select_button)

        main_vbox.addLayout(hbox)
        main_vbox.addSpacing(10)

        hbox = QHBoxLayout()
        self.revised_pattern = QLineEdit(pattern)
        self.revised_pattern.textEdited.connect(self.revised)
        hbox.addWidget(self.revised_pattern)

        self.revise_button = QPushButton("Enter")
        self.revise_button.setDisabled(True)
        self.revise_button.clicked.connect(self.revise)
        hbox.addWidget(self.revise_button)

        main_vbox.addLayout(hbox)

        self.retval = self.exec_()

    def revised(self):
        self.revise_button.setEnabled(True)

    def buttonClicked(self):
        self.select_button.setEnabled(True)

    def cancel(self):
        self.done(QMessageBox.Cancel)

    def select(self):
        self.done(QMessageBox.Save)

    def revise(self):
        self.done(QMessageBox.Apply)

    def getSelection(self):
        selected_id = self.radio_button_group.checkedId()
        if selected_id == 0:
            selection = self.collisions[0][0]
        elif selected_id == 1:
            selection = self.new_topic_cluster
        return selection

    def getRevisedPattern(self):
        p = self.revised_pattern.text()
        return p.strip()

class TopicClusterWarning(QFrame):

    def __init__(self, parent=None):
        super(TopicClusterWarning, self).__init__(parent)

        warning_vbox = QVBoxLayout()
        warning_vbox.setSpacing(0)
        warning_vbox.setContentsMargins(6,6,0,0)
        self.setLayout(warning_vbox)

        self.setStyleSheet("TopicClusterWarning {border-top: 1px solid " + views.default_ui_border_color + ";}")

        self.controller = None

        hbox = QHBoxLayout()
        hbox.setContentsMargins(0,0,0,0)
        self.edited_warning_icon = QLabel()
        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_warning_icon.png'))
        self.edited_warning_icon.setPixmap(pic.scaled(22, 22, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        vbox = QVBoxLayout()
        vbox.addWidget(self.edited_warning_icon)
        vbox.addStretch()
        hbox.addLayout(vbox)

        self.edited_warning_msg = autofit_textedit.AutoFitTextEdit()
        self.edited_warning_msg.setStyleSheet("border: 0;")
        doc = self.edited_warning_msg.document()
        doc.setDefaultStyleSheet(views.instructions_style)
        self.edited_warning_msg.setHtml("<p>Topic clusters have been edited, and the visualizations have been locked.</p>" + 
                                        "<p>Click <b>Update Now</b> to save the changes and update the visualizations.</p>")

        hbox.addWidget(self.edited_warning_msg)
        warning_vbox.addLayout(hbox)

        hbox = QHBoxLayout()
        hbox.addStretch()
        self.update_button = QPushButton("Update Now")
        self.update_button.clicked.connect(self.saveAndUpdateVisualization)
        hbox.addWidget(self.update_button)
        hbox.addSpacing(8)
        warning_vbox.addLayout(hbox)

        self.synsets_changed = False
        self.multiword_topics_changed = False

        self.hide()

    def setController(self, c):
        self.controller = c

    def saveAndUpdateVisualization(self):
        self.controller.forceUpdateVisualization()

    def setWarningVisible(self, val, src):

        if src == SYNSET_EDITOR:
            if val:
                self.synsets_changed = True
            else:
                self.synsets_changed = False                

        elif src == MULTIWORD_TOPICS_EDITOR:
            if val:            
                self.multiword_topics_changed = True
            else:
                self.multiword_topics_changed = False

        elif src is None:
            self.synsets_changed = False            
            self.multiword_topics_changed = False

        if self.synsets_changed or self.multiword_topics_changed:
            self.show()
        else:
            self.hide()







