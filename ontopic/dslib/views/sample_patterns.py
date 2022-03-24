#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
    sample_patterns.py

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

import dslib.views as views
import dslib.utils as utils
import dslib.models.synonym as synonym
import dslib.views.dialogs  as dialogs

import pprint     
pp = pprint.PrettyPrinter(indent=4)

class SamplePatternsDialog(QDialog):

    def __init__(self, app_win=None, parent=None):

        super(SamplePatternsDialog, self).__init__(parent)

        self.setWindowTitle('Sample Patterns')

        self.app_win     = app_win;
        self.controller  = None

        self.setFixedWidth(400)
        self.setFixedHeight(500)

        self.initUI()

        # Center the dialog window
        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
      
        centerPoint = screen_rect.center()   
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft()) 

        self.hide()

    def initUI(self):

        self.setStyleSheet("SamplePatternsDialog  {background-color: " + views.default_ui_background_color + ";}" + \

                                                     "QLabel {color: " + views.default_ui_text_color + ";}" + \

                                     "QPushButton {background-color: " + views.default_ui_button_color + ";" + \
                                                             "color: " + views.default_ui_text_color + ";}" + \

                           "QPushButton::disabled {background-color: " + views.default_ui_button_color + ";" + \
                                                             "color: " + views.default_ui_text_inactive_color + ";}" + \

                                  "QPlainTextEdit {background-color: " + views.default_ui_input_background_color + ";" + \
                                                             "color: " + views.default_ui_text_color + ";" + \
                                                         "font-size: " + str(views.default_ui_font_size) + "pt;}"
                            )

        main_vbox = QVBoxLayout()

        # Header
        header_hbox = QHBoxLayout()

        title = QLabel("Sample Patterns")
        header_hbox.addWidget(title)
        header_hbox.addStretch()

        main_vbox.addLayout(header_hbox)

        # Text Box for Patterns
        self.patterns_field = QPlainTextEdit()
        self.patterns_field.setReadOnly(True)

        main_vbox.addWidget(self.patterns_field)

        self.setLayout(main_vbox)

    def openWithPatterns(self, patterns):
        self.patterns_field.setPlainText(patterns)
        self.show()

    def setController(self, c):
        self.controller = c

                
