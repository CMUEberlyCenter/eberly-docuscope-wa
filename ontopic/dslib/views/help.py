#!/usr/bin/env python
# -*- coding: utf-8 -*-


__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform

import platform

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineSettings

import dslib.utils as utils
import dslib.views as views
import dslib.views.dialogs as dialogs

class HelpDialog(QDialog):
    def __init__(self, is_modal=False, app_win=None, parent=None):    
        super(HelpDialog, self).__init__(parent)

        self.app_win = app_win
        self.controller = None

        self.setModal(is_modal)

        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().availableGeometry(screen)
        h = screen_rect.height()
        win_ht = round(h * 0.85)

        self.setFixedSize(800, win_ht)

        self.setMaximumHeight(win_ht)
        self.setMaximumWidth(800)
        self.setMinimumWidth(600)
        self.setMinimumHeight(600)

        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        vbox = QVBoxLayout()
        vbox.setContentsMargins(0,0,0,0)
        # Editor

        self.setStyleSheet("QWebEngineView {background-color: " + views.default_vis_background_color + ";}" + 
                            "QScrollBar { background-color:"  + views.scrollbar_bg_color + ";" +
                                                   "margin: 0;" +
                                            "border-radius: 6px;" +   
                                                   "border: 1px solid " + views.scrollbar_border_color + "}" +

                    "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                            "border-radius: 6px;" +   
                                                   "border: 1px solid " + views.scrollbar_border_color + ";}" +
   
                             "QScrollBar::add-line {height: 0; background: none;" +
                                                   "border: none;}"
                             "QScrollBar::sub-line {height: 0; background: none;" +
                                                   "border: none;}")


        self.editor = QWebEngineView()

        vbox.addWidget(self.editor)

        self.setLayout(vbox)      

    def setHtml(self, html_content):
        html_str = "<style>{}</style> <body>{}</body>".format(views.help_style, html_content)
        self.editor.setHtml(html_str, baseUrl=QUrl.fromLocalFile(utils.resource_path('data/icons/')))
    
class GettingStartedDialog(QDialog):
    def __init__(self, option=True, app_win=None, parent=None):    
        super(GettingStartedDialog, self).__init__(parent)

        self.app_win = app_win
        self.controller = None

        self.setModal(True)

        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().availableGeometry(screen)
        h = screen_rect.height()
        win_ht = round(h * 0.85)

        self.setFixedSize(800, win_ht)

        self.setMaximumHeight(win_ht)
        self.setMaximumWidth(800)
        self.setMinimumWidth(600)
        self.setMinimumHeight(600)

        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        vbox = QVBoxLayout()
        vbox.setContentsMargins(0,0,0,0)

        # Editor
        self.setStyleSheet("QWebEngineView {background-color: " + views.default_vis_background_color + ";}" + 

                                   "QPushButton {font-size: " + str(views.default_ui_font_size) + "pt;}" + \
                                   
                                         "QCheckBox {color: " + views.default_ui_text_color +";" + \
                                               "font-size: " + str(views.default_ui_font_size) + "pt;}" + \

                            "QScrollBar { background-color:"  + views.scrollbar_bg_color + ";" +
                                                   "margin: 0;" +
                                            "border-radius: 6px;" +   
                                                   "border: 1px solid " + views.scrollbar_border_color + "}" +

                    "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                            "border-radius: 6px;" +   
                                                   "border: 1px solid " + views.scrollbar_border_color + ";}" +
   
                             "QScrollBar::add-line {height: 0; background: none;" +
                                                   "border: none;}"
                             "QScrollBar::sub-line {height: 0; background: none;" +
                                                   "border: none;}")


        self.editor = QWebEngineView()
        vbox.addWidget(self.editor)

        # Close Button
        hbox = QHBoxLayout()
        hbox.setContentsMargins(3,2,14,6)
        hbox.addStretch()

        self.checkbox = QCheckBox("Do not show this dialog at startup.")
        self.checkbox.setChecked(option)
        hbox.addWidget(self.checkbox)

        self.close_button = QPushButton("Close")
        self.close_button.clicked.connect(self.closeDialog)
        self.close_button.setDefault(True)
        hbox.addWidget(self.close_button)

        vbox.addLayout(hbox)
        self.setLayout(vbox)      

    def setController(self, controller):
        self.controller = controller

    def setHtml(self, html_content):
        html_str = "<style>{}</style> <body>{}</body>".format(views.help_style, html_content)
        self.editor.setHtml(html_str, baseUrl=QUrl.fromLocalFile(utils.resource_path('data/icons/')))

    def setOption(self, option):
        self.checkbox.setChecked(option)        

    def closeDialog(self):
        self.controller.setHideGettingStartedDialogOption(self.checkbox.isChecked())
        self.close()




