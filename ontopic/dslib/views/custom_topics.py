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

from operator import itemgetter

import dslib.views as views
import dslib.utils as utils
import dslib.models.synonym as synonym
import dslib.views.dialogs  as dialogs

import pprint     
pp = pprint.PrettyPrinter(indent=4)


class MultiwordTopicsDialog(QDialog):

    def __init__(self, app_win=None, parent=None):

        super(MultiwordTopicsDialog, self).__init__(parent)

        self.setModal(True)

        self.setWindowTitle('Multiword Topics Editor')

        self.app_win = app_win;
        self.controller = None

        self.setFixedWidth(500)
        self.setFixedHeight(300)

        self.filepath = ""
        self.b_edited = False
        self.visualization_valid = True

        self.ignore_edits = False

        self.initUI()

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

    def initUI(self):

        self.setStyleSheet("MultiwordTopicsDialog {background-color: " + views.default_ui_background_color + ";}" + \

                                                     "QLabel {color: " + views.default_ui_text_color + ";}" + \

                                     "QPushButton {background-color: " + views.default_ui_button_color + ";" + \
                                                             "color: " + views.default_ui_text_color + ";}" + \

                                     "QToolButton {background-color: " + views.default_ui_button_color + ";" + \
                                                             "color: " + views.default_ui_text_inactive_color + ";}" + \

                           "QPushButton::disabled {background-color: " + views.default_ui_button_color + ";" + \
                                                             "color: " + views.default_ui_text_inactive_color + ";}" + \

                                  "QPlainTextEdit {background-color: " + views.default_ui_input_background_color + ";" + \
                                                             "color: " + views.default_ui_text_color + ";}"
                                  "QMenu {background-color:" + views.default_ui_button_color + ";}" + \

                 "QMenu::item:!disabled  {background-color:" + views.default_ui_button_color + ";" + \
                                                    "color:" + views.default_ui_text_color + ";}" + \

                  "QMenu::item:disabled  {background-color:" + views.default_ui_button_color + ";" + \
                                                    "color:" + views.default_ui_text_inactive_color + ";}" + \

                  "QMenu::item:selected  {background-color:" + views.menu_selected_color + ";" + \
                                                    "color:" + views.menu_selected_text_color + ";}" + \

                  "QMenu::item:!selected {background-color:" + views.default_ui_button_color + ";}")                                                             

        main_vbox = QVBoxLayout()

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

        ###

        instruction = QLabel("Enter multiword topics in separate lines.")
        main_vbox.addWidget(instruction)

        # the text box for holding the topics
        self.multiword_topics_field = QPlainTextEdit()
        self.multiword_topics_field.textChanged.connect(self.edited)

        main_vbox.addWidget(self.multiword_topics_field)

        self.setLayout(main_vbox)

    def closeEditor(self):
        self.close()

    def closeEvent(self, event):
        if self.isEdited():
            wd = dialogs.SaveWarningDialog("Some multi-word topics aren't Saved.", "Do you want to save the changes?")

            if wd.retval == QMessageBox.Cancel:
                event.ignore()
                return

            elif wd.retval == QMessageBox.Save:
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

    def isEdited(self):
        return self.b_edited

    def readFromFile(self, fpath):   
        if os.path.exists(fpath):
            self.filepath = fpath
            self.filepath_field.setText(fpath)

            with open(self.filepath) as fin:
                text = fin.read()
                topics = text.splitlines()

            self.controller.setMultiwordTopics(topics)
            self.multiword_topics_field.setPlainText(text)
            self.b_edited = False
            self.save_action.setDisabled(True)

    def reset(self):
        self.multiword_topics_field.clear()
        self.filepath_field.clear()

        self.filepath = ""
        self.b_edited = False
        self.visualization_valid = True
        self.ignore_edits = False

    def reopen(self):
        if self.filepath == "":
            return

        self.b_edited = False
        self.ignore_edits = True
        self.readFromFile(self.filepath)
        self.ignore_edits = False
        self.validateVisualization()

    def openFile(self):
        fpath = self.controller.getCurrentFilepath()

        if fpath:
            folder = os.path.dirname(fpath)
        else:
            folder = ""

        filepath, _ = QFileDialog.getOpenFileName(None, 'Select a file', folder, "Text File (*.txt)")        

        if filepath == "":
            return

        self.ignore_edits = True
        self.readFromFile(filepath)
        self.invalidateVisualization()
        self.ignore_edits = False

    def edited(self):
        if self.ignore_edits:
            return

        if self.b_edited == False:
            self.b_edited = True

            if self.filepath_field.text():
                self.filepath_field.setText("{}*".format(self.filepath))

            self.save_action.setEnabled(True)
            self.invalidateVisualization()

    def saveFile(self):

        if self.filepath: # a file is open already
            default_path = self.filepath
        else: 
            fpath = self.controller.getCurrentFilepath()
            if fpath:
                folder = os.path.dirname(fpath)
                default_path = os.path.join(folder, "multiword_topics.txt")
            else:
                default_path = 'multiword_topics.txt'

        filepath, _ = QFileDialog.getSaveFileName(None, 'Enter File Name', default_path , "Text File (*.txt)")

        if filepath != "":
            self.filepath = filepath
            self.filepath_field.setText(filepath)

            topics_str = self.multiword_topics_field.toPlainText()
            with open(filepath, 'w') as fout:
                fout.write(topics_str)

            topics = topics_str.splitlines()
            self.controller.setMultiwordTopics(topics)

            self.save_action.setDisabled(True)
            self.b_edited = False


    def setController(self, c):
        self.controller = c

    def getFilename(self):
        return os.path.basename(self.filepath)
                
