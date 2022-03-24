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

import shlex, subprocess
import time
import threading

from operator import itemgetter

import dslib.utils as utils
import dslib.models.synonym as synonym
import dslib.views as views
import dslib.views.dialogs  as dialogs

import pprint     
pp = pprint.PrettyPrinter(indent=4)


class SynsetEditor(QDialog):

    def __init__(self, app_win=None, parent=None):

        super(SynsetEditor, self).__init__(parent)

        self.setModal(True)

        if platform.system() == 'Windows':
            self.setGeometry(0,0,round(600*1.3),round(500*1.3))
        else:
            self.setGeometry(0,0,600,400)    

        self.app_win = app_win
        self.controller = None

        self.synsets_changed   = False

        self.just_selected_synset = None
        self.current_synset = None
        self.b_revised = False
        self.untitled_count = 0
        self.filepath = ""

        self.visualization_valid = True
        self.ignore_edits = False

        self.initUI()

        self.synsets  = list()

        self.setSynsetEdited(False)

        # Center the dialog window
        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
      
        centerPoint = screen_rect.center()   
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft()) 

        self.hide()

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

        button_ht = 26

        self.setStyleSheet("SynsetEditor {background-color: " + views.default_ui_background_color + ";}" + \
                                            "QLabel {color: " + views.default_ui_text_color + ";}" + \

                            "QPushButton {background-color: " + views.default_ui_button_color + ";" + \
                                                    "color: " + views.default_ui_text_color + ";}" + \

                   "QPushButton:disabled {background-color: " + views.default_ui_button_disabled_color + ";" + \
                                                    "color: " + views.default_ui_text_inactive_color + ";}" + \

                            "QToolButton {background-color: " + views.default_ui_button_color + ";" + \
                                                    "color: " + views.default_ui_text_inactive_color + ";}" + \

                         "QPlainTextEdit {background-color: " + views.default_ui_input_background_color + ";" + \
                                                    "color: " + views.default_ui_text_color + ";}" + \

                              "QLineEdit {background-color:" + views.default_ui_input_background_color + ";" + \
                                                    "color:" + views.default_ui_text_color + ";}" + \

                                  "QMenu {background-color:" + views.default_ui_button_color + ";}" + \

                 "QMenu::item:!disabled  {background-color:" + views.default_ui_button_color + ";" + \
                                                    "color:" + views.default_ui_text_color + ";}" + \

                  "QMenu::item:disabled  {background-color:" + views.default_ui_button_color + ";" + \
                                                    "color:" + views.default_ui_text_inactive_color + ";}" + \

                  "QMenu::item:selected  {background-color:" + views.menu_selected_color + ";" + \
                                                    "color:" + views.menu_selected_text_color + ";}" + \

                  "QMenu::item:!selected {background-color:" + views.default_ui_button_color + ";}"

                  )

        # Main Window
        # ----------
        self.setWindowTitle('Synonyms Editor')

        self.wcProxyModel = None

        main_vbox = QVBoxLayout() 

        # Header Section
        header_hbox = QHBoxLayout()

        fpath_header = QLabel("file: ")
        self.filepath_field = QLabel('')
        header_hbox.addWidget(fpath_header)
        header_hbox.addWidget(self.filepath_field)
        header_hbox.addStretch()

        self.tool_button = QToolButton()

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            menu_icon_path = "data/icons/menu_icon.png"
        else:
            menu_icon_path = "data/icons/menu_dark_icon.png"

        self.tool_button.setIcon(QIcon(QPixmap(utils.resource_path(menu_icon_path))))

        self.tool_button.setStyleSheet('QToolButton::menu-indicator { image: none; }')
        self.tool_button.setPopupMode(QToolButton.InstantPopup)

        # tools_menu = PopupMenu(self.tool_button)
        tools_menu = QMenu(parent=self)

        self.open_action = QAction('Open', self) 
        self.open_action.triggered.connect(self.openFile)

        self.save_action = QAction('Save', self) 
        self.save_action.triggered.connect(self.saveFile)
        self.save_action.setDisabled(True)

        self.close_action = QAction('Close', self) 
        self.close_action.triggered.connect(self.closeEditor)

        tools_menu.addAction(self.open_action)
        tools_menu.addAction(self.save_action)
        tools_menu.addAction(self.close_action)

        self.tool_button.setMenu(tools_menu)

        header_hbox.addWidget(self.tool_button)

        main_vbox.addLayout(header_hbox)
        # End of the header section

        # Synonyms
        hbox = QHBoxLayout()

        left_vbox = QVBoxLayout()

        # List of Synonyms
        self.list_view = QListWidget()
        self.list_view.itemClicked.connect(self.synsetSelected)
        self.list_view.currentItemChanged.connect(self.synsetChanged)
        self.list_view.setMaximumWidth(180)
        self.list_view.setStyleSheet("QListWidget {background-color: " + views.default_ui_input_background_color + ";" + \
                                        "selection-color: " + views.menu_selected_text_color + ";" + \
                                        "selection-background-color: " + views.menu_selected_color + ";};")
        self.list_view.setMovement(QListWidget.Snap)
        self.list_view.setDefaultDropAction(Qt.MoveAction)
        left_vbox.addWidget(self.list_view)

        # Control UI (Add/Delet Buttons)
        ctrl_hbox = QHBoxLayout()
        self.new_button = QPushButton("New")
        self.new_button.clicked.connect(self.addNewSynset)
        self.new_button.setAutoDefault(False)        
        ctrl_hbox.addWidget(self.new_button)              

        self.delete_button = QPushButton("Delete")
        self.delete_button.clicked.connect(self.deleteSelectedSynset)
        self.delete_button.setAutoDefault(False)        
        ctrl_hbox.addWidget(self.delete_button)

        left_vbox.addLayout(ctrl_hbox)

        hbox.addLayout(left_vbox)
        # End of Left Column (List of Synsets)

        # Name, Lemma and list of synonms
        vbox_right = QVBoxLayout()

        hbox_ui = QHBoxLayout()
        header = QLabel("Synonym Set")
        header.setStyleSheet("QLabel {font-weight: bold;}")
        hbox_ui.addWidget(header)

        hbox_ui.addStretch()

        self.update_button = QPushButton("Update")
        self.update_button.clicked.connect(self.updateSynset)
        self.update_button.setAutoDefault(False)        
        self.update_button.setEnabled(False)

        hbox_ui.addWidget(self.update_button)
        vbox_right.addLayout(hbox_ui)

        fbox = QFormLayout()
        fbox.setContentsMargins(0,0,0,0)

        # Lemma
        self.lemma_field = QLineEdit()
        self.lemma_field.textEdited.connect(self.synsetEdited)
        fbox.addRow(QLabel("Base Word:"), self.lemma_field)

        # Description
        self.synonyms_field = QPlainTextEdit()
        self.synonyms_field.textChanged.connect(self.synsetEdited)
        fbox.addRow(QLabel("Synonyms:"), self.synonyms_field)

        vbox_right.addLayout(fbox)
        # vbox_right.addStretch()

        hbox.addLayout(vbox_right)

        main_vbox.addLayout(hbox)

        self.setLayout(main_vbox)

        # Center the window
        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)

        centerPoint = screen_rect.center()   
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft())   

    def setController(self, controller):
        self.controller = controller

    def cleanUpSynsetFields(self):
        synonym_revised = self.isSynsetEdited()

        self.lemma_field.clear()
        self.synonyms_field.clear()

        self.setSynsetEdited(synonym_revised)

    def isSynsetEdited(self):
        return self.b_revised

    def synsetEdited(self):
        if self.ignore_edits:
            return

        self.setSynsetEdited(True)

        synonyms = self.synonyms_field.toPlainText()

        if synonyms.find(" ") >= 0:
            dialogs.WarningDialog("Warning", "You cannot user a space character. You may define a multi-word topic first.")

    def setSynsetEdited(self, val):

        self.b_revised = val

        if val: # edited
            self.update_button.setEnabled(True)
            self.save_action.setEnabled(True)
            self.invalidateVisualization()
            if self.filepath_field.text():
                self.filepath_field.setText("{}*".format(self.filepath))
        else:
            self.update_button.setEnabled(False)
            self.save_action.setEnabled(False)

    def closeEditor(self):
        self.close()

    def closeEvent(self, event):
        if self.isSynsetEdited():
            wd = dialogs.SaveWarningDialog("Some synonyms aren't Saved.", "Do you want to save the changes?")

            if wd.retval == QMessageBox.Cancel:
                event.ignore()
                return

            elif wd.retval == QMessageBox.Save:
                # The user says we should save the changes.
                item = self.list_view.currentItem()
                self.updateCurrentSelection(item)

                self.saveFile()

                self.controller.updateVisualization()

                event.accept()

            elif wd.retval == QMessageBox.Discard:

                event.accept()

        else:
            if self.isVisualizationValid() == False:
                self.validateVisualization()
                self.controller.updateVisualization()

            event.accept()

    def addNewSynset(self):

        if self.current_synset is not None:
            item = self.list_view.currentItem()
            self.updateCurrentSelection(item)

        self.cleanUpSynsetFields()

        # Generate a default name for the synset
        self.untitled_count += 1
        lemma = 'Undefined {}'.format(self.untitled_count)

        synset = synonym.DSSynset(lemma=lemma)

        # Create a synset object
        self.synsets.append(synset)

        self.current_synset = synset

        self.setSynsetEdited(True)

        item = QListWidgetItem(lemma)
        item.setData(Qt.UserRole, synset)
        self.list_view.addItem(item)
        self.list_view.setCurrentItem(item)
        self.list_view.setFocus()

        self.updateSynsetFields(synset)

        self.lemma_field.selectAll()
        self.lemma_field.setFocus()

    def deleteSelectedSynset(self):

        if self.current_synset is not None:
            self.synsets.remove(self.current_synset)

        row = self.list_view.currentRow()
        self.list_view.takeItem(row)

        self.cleanUpSynsetFields()
        self.just_selected_synset = None
        self.current_synset = None
        self.setSynsetEdited(True)

    def readSynsetsFromFile(self, fpath):
        self.synsets = list()

        if os.path.exists(fpath):
            self.filepath = fpath
            self.filepath_field.setText(fpath)

            with open(fpath) as fin:
                synsets = json.load(fin)

            for sd in synsets:

                synset = synonym.DSSynset(synset_dict=sd)
                self.synsets.append(synset)

                item = QListWidgetItem(sd['lemma'])
                item.setData(Qt.UserRole, synset)
                self.list_view.addItem(item)

            self.list_view.setCurrentRow(0)
            self.list_view.setFocus()

            if len(self.synsets)>0:
                self.updateSynsetFields(self.synsets[0])
                self.current_synset = self.synsets[0]
                self.just_selected_synset = self.current_synset
                self.setSynsetEdited(False)
                self.controller.setUserDefinedSynonyms(self.synsets)
        else:
            print("{} does not exist.".format(fpath))

    def reset(self, display_only=False):
        self.synsets = list()
        self.list_view.clear()
        self.cleanUpSynsetFields()
        self.filepath_field.clear()

        if display_only == False:  # i.e., clean everything
            self.filepath = ""

        self.synsets_changed   = False
        self.just_selected_synset = None
        self.current_synset = None
        self.b_revised = False
        self.untitled_count = 0

        self.invalidateVisualization()

    def reopen(self):
        if self.filepath == "":
            return

        self.reset(display_only=True)
        self.ignore_edits = True
        self.readSynsetsFromFile(self.filepath)
        self.ignore_edits = False

    def openFile(self):

        fpath = self.controller.getCurrentFilepath()
        if fpath:
            folder = os.path.dirname(fpath)
        else:
            folder = ""

        filepath, _ = QFileDialog.getOpenFileName(None, 'Select a  file', folder, "JSON File (*.json)")        

        if filepath == "":
            return

        self.reset()
        self.ignore_edits = True
        self.readSynsetsFromFile(filepath)
        self.ignore_edits = False

    def saveFile(self):

        if self.filepath: # a file is open already
            default_path = self.filepath
        else: 
            fpath = self.controller.getCurrentFilepath()
            if fpath:
                folder = os.path.dirname(fpath)
                default_path = os.path.join(folder, "synonyms.json")
            else:
                default_path = 'synonyms.json'

        filepath, _ = QFileDialog.getSaveFileName(None, 'Enter File Name', default_path , "JSON File (*.json)")

        if filepath != "":
            self.filepath = filepath
            self.filepath_field.setText(filepath)

            if self.isSynsetEdited():
                self.updateSynset()

            list_of_synsets = list()
            for synset in self.synsets:
                list_of_synsets.append(synset.toDict())

            with open(filepath, 'w') as fout:
                json.dump(list_of_synsets, fout, indent=4)

            self.controller.setUserDefinedSynonyms(self.synsets)

            self.setSynsetEdited(False)
            self.save_action.setEnabled(False)

    def updateCurrentSelection(self, item):

        if self.current_synset != None and self.isSynsetEdited():
            new_lemma = self.lemma_field.text()
            new_lemma = new_lemma.strip()
            new_lemma = new_lemma.replace(' ', '_')
            self.current_synset.setLemma(new_lemma)

            item.setText(new_lemma)
            synonyms_str = self.synonyms_field.toPlainText()
            self.current_synset.setSynonyms(synonyms_str.split())

    def updateSynset(self, checked=False, item=None):

        if self.current_synset is not None:
            if item is None:
                item = self.list_view.currentItem()
            self.updateCurrentSelection(item)
            self.update_button.setEnabled(False)

    def synsetChanged(self, current, previous):

        self.previous_synset_item = previous        

    def synsetSelected(self, item):
        self.ignore_edits = True
        self.just_selected_synset = item.data(Qt.UserRole) 

        # do nothing if the same item is clicked 
        if self.current_synset == self.just_selected_synset:
            return

        self.updateSynset(item=self.previous_synset_item)
        self.cleanUpSynsetFields()

        self.current_synset = self.just_selected_synset

        self.updateSynsetFields(self.current_synset)

        self.ignore_edits = False

        self.previous_synset_item = None

    def updateSynsetFields(self, synset):
        synset_revised = self.isSynsetEdited()

        lemma    = synset.getLemma()
        synonyms = synset.getSynonyms()

        synonyms_str = '\n'.join(synonyms)
        self.lemma_field.setText(lemma)
        self.synonyms_field.setPlainText(synonyms_str)

        self.setSynsetEdited(synset_revised)

    def getFilename(self):
        return os.path.basename(self.filepath)
