#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
class AuditPanel(QFrame)

"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform
import math
import string
import random
from time import time

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

from reportlab.platypus import Image

import controller

import dslib.views as views
import dslib.views.dialogs   as dialogs
import dslib.views.report    as report

import dslib.models.document as ds_doc

import dslib.utils as utils
import dslib.views.topicview as topicview
import dslib.views.dsview as dsview
import dslib.views.autofit_textedit as autofit_textedit
import dslib.views.info_container as info_container
import dslib.views.tools_panel as tools_panel
from dslib.views.utils import is_skip

import pprint
pp = pprint.PrettyPrinter(indent=4)

CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE = "<p>Enter words and phrases associated with <b style=\"color: \'{}\'\">{}</b> in the text field.</p>"

def rule_type_to_label(rule_type):
    label = ""
    if rule_type == 'active':
        label = "expected"
    elif rule_type == 'quiet':
        label = "unexpected"
    elif rule_type == 'optional':
        label = "optional"
    elif rule_type == 'bounded_optional':
        label = "bounded opt."
    elif rule_type == 'group':
        label = ""

    return label

class AuditPanel(QFrame):
    def __init__(self, app_win=None, parent=None):

        super(AuditPanel, self).__init__(parent)

        self.app_win      = app_win
        self.controller   = None
        self.current_rule = None
        self.ruleset      = None
        self.setupUI()
        self.dont_update  = False
        self.is_locked    = False
        self.current_topic_clusters = []

    def setupUI(self):

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            check_icon_path = "data/icons/check_icon.png"
            radio_icon_path = "data/icons/radio_icon.png"
        else:
            check_icon_path = "data/icons/check_dark_icon.png"
            radio_icon_path = "data/icons/radio_dark_icon.png"

        self.setStyleSheet("QWidget {font-size: " + str(views.default_ui_font_size) + "pt;}" + \

                           "QFrame {background-color:" + views.default_vis_background_color + ";}" + \
                           
                                 "QLabel {background: transparent; " + \
                                         "}" + \

                      "QTreeWidget {background-color: " + views.default_ui_input_background_color + "; " + \
                                              "color: " + views.default_ui_text_color + "; " + \
                         "selection-background-color: " + views.menu_selected_color + "; " + \
                                    "selection-color: " + views.menu_selected_text_color + ";" + \
                                          "font-size: " +  str(views.default_ui_font_size) + "pt;}" + \

                        "QComboBox {background-color: " + views.default_ui_input_background_color + ";" + \
                                              "color: " + views.default_ui_text_color + ";" + \
                         "selection-background-color: " + views.menu_selected_color + ";" + \
                                    "selection-color: " + views.menu_selected_text_color + ";}"

                                   "QCheckBox {color: " + views.default_ui_text_color + ";}" + \

                       "QCheckBox::indicator {border: 1px solid " + views.default_ui_border_color + ";" + \
                                              "width: 12px; height: 12px;" + \
                                   "background-color: " + views.default_ui_input_background_color + ";}" + \
               "QCheckBox::indicator:checked {border: 1px solid " + views.default_ui_border_color + ";" + \
                                              "image: url(" + utils.resource_path(check_icon_path) + ");" + \
                                                      "}" + \

                            "QScrollBar { background: " + views.default_vis_background_color + ";" + \
                                   "background-color: " + views.default_vis_background_color + ";" + \
                                             "margin: 0;" +
                                             "border: 1px solid " + views.default_vis_background_color + ";" + \
                                             "}" +

                            "QTextEdit QScrollBar:vertical { background: " + views.default_vis_background_color + ";" + \
                                   "background-color: " + views.default_vis_background_color + ";" + \
                                             "margin: 0;" +
                                             "border: 1px solid " + views.default_vis_background_color + ";" + \
                                             "}" +

              "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                      "border-radius: 6px;" + 
                                             "border: 1px solid " + views.scrollbar_handle_bg_color + ";}" +

            "QScrollBar::handle:vertical {min-height: 20px;}" +
           "QScrollBar::handle:horizontal {min-width: 20px;}" +

                       "QScrollBar::add-line {height: 0; width: 0; background: none; border: none;}" +
                       "QScrollBar::sub-line {height: 0; width: 0; background: none; border: none;}" +

                        "QToolTip { background-color: " + views.default_vis_background_color + ";" +
                                              "color: " + views.default_ui_text_color + ";" +
                                          "font-size: " + str(views.default_ui_font_size) + "pt;" +                                              
                                              "border: none;" +
                                             # "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                "}"
                        )

        self.setMinimumWidth(400)

        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

        ####################
        # Main Layout
        ####################
        self.layout = QVBoxLayout()
        self.setLayout(self.layout)
        self.layout.setContentsMargins(0,0,0,0)
        self.layout.setSpacing(4)

        self.topic_ui_container = QFrame()
        top_ui_vbox = QVBoxLayout()
        top_ui_vbox.setContentsMargins(0,0,0,0)
        top_ui_vbox.setSpacing(0)
        self.topic_ui_container.setLayout(top_ui_vbox)
        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)
        self.setMinimumHeight(400)

        ####################
        # TITLE
        ####################
        title_area_container = QWidget()
        title_area_hbox = QHBoxLayout()

        title_area_hbox.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        title_area_container.setLayout(title_area_hbox)
        title_area_container.setFixedHeight(46)
        title_area_container.setStyleSheet("background-color: " + views.tab_selected_color + ";")
        
        number = QLabel()
        pic = QPixmap(utils.resource_path('data/icons/audit_icon.png'))
        number.setPixmap(pic.scaled(26, 26, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        title_area_hbox.addWidget(number)

        title_area_hbox.addSpacing(5)

        self.audit_title = QLabel(views.EXPECTATIONS_TITLE)
        self.audit_title.setStyleSheet("QLabel {font-size: " + str(views.default_ui_heading_font_size) + "pt; font-weight: bold; color: #e56600;}" +
                                       "QLabel:disabled {color: " + views.default_ui_text_inactive_color +";}")            
        title_area_hbox.addWidget(self.audit_title)

        title_area_hbox.addStretch()

        if self.app_win.areCommunicationValuesVisible():
            values_container = info_container.InfoContainer()
            values_hbox = QHBoxLayout()
            values_hbox.setContentsMargins(0,0,0,0)
            values_container.setLayout(values_hbox)
            values_container.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

            if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
                compelling_icon_path  = 'data/icons/cv_compelling_icon.png'
                credible_icon_path    = 'data/icons/cv_credible_icon.png'
                ethical_icon_path     = 'data/icons/cv_ethical_icon.png'
                considerate_icon_path = 'data/icons/cv_considerate_icon.png'
            else:
                compelling_icon_path  = 'data/icons/cv_compelling_dark_icon.png'
                credible_icon_path    = 'data/icons/cv_credible_dark_icon.png'
                ethical_icon_path     = 'data/icons/cv_ethical_dark_icon.png'
                considerate_icon_path = 'data/icons/cv_considerate_dark_icon.png'

            self.cv_compelling_icon = QPushButton()
            self.cv_compelling_icon.setFlat(True)
            self.cv_compelling_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                 
            self.cv_compelling_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path(compelling_icon_path))
            self.cv_compelling_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))     
            self.cv_compelling_icon.setToolTip("Compelling")
            self.cv_compelling_icon.clicked.connect(lambda state, arg=views.EXPECTATIONS: self.controller.openPanelDescription(arg))                                
            values_hbox.addWidget(self.cv_compelling_icon)
            values_hbox.addSpacing(2)

            self.cv_credible_icon = QPushButton()
            self.cv_credible_icon.setFlat(True)
            self.cv_credible_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))         
            self.cv_credible_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path(credible_icon_path))
            self.cv_credible_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.cv_credible_icon.setToolTip("Credible")
            self.cv_credible_icon.clicked.connect(lambda state, arg=views.EXPECTATIONS: self.controller.openPanelDescription(arg))                        
            values_hbox.addWidget(self.cv_credible_icon)      
            values_hbox.addSpacing(2)

            self.cv_considerate_icon = QPushButton()
            self.cv_considerate_icon.setFlat(True)
            self.cv_considerate_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))         
            self.cv_considerate_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path(considerate_icon_path))
            self.cv_considerate_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.cv_considerate_icon.setToolTip("Considerate")
            self.cv_considerate_icon.clicked.connect(lambda state, arg=views.EXPECTATIONS: self.controller.openPanelDescription(arg))                
            values_hbox.addWidget(self.cv_considerate_icon)
            values_hbox.addSpacing(2)

            self.cv_ethical_icon = QPushButton()
            self.cv_ethical_icon.setFlat(True)
            self.cv_ethical_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))        
            self.cv_ethical_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path(ethical_icon_path))
            self.cv_ethical_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))
            self.cv_ethical_icon.clicked.connect(lambda state, arg=views.EXPECTATIONS: self.controller.openPanelDescription(arg))        
            self.cv_ethical_icon.setToolTip("Ethical")
            values_hbox.addWidget(self.cv_ethical_icon)

            self.info_button = QToolButton(parent=self)
            icon = QIcon()
            pic = QPixmap(utils.resource_path('data/icons/info_icon.png'))        
            self.info_button.setIcon(QIcon(pic.scaled(14, 14, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.info_button.setCheckable(True)
            self.info_button.setFixedSize(14,14)
            self.info_button.setStyleSheet("QToolButton {background: transparent; border: none; margin: 0; padding-top: 0px;}")
            self.info_button.setToolTip("Read about <b>Compelling</b>, <b>Credible</b>, <b>Considerate</b>, and <b>Ethical</b>.")                
            self.info_button.clicked.connect(lambda state, arg=views.EXPECTATIONS: self.controller.openPanelDescription(arg))
            values_hbox.addWidget(self.info_button)
            values_hbox.addSpacing(8)

            title_area_hbox.addWidget(values_container)

            eff = values_container.setupAnimation()
            self.info_button.setGraphicsEffect(eff)
        
        top_ui_vbox.addWidget(title_area_container)

        ####################
        # Composing Patterns Menu Header
        ####################
        # top_ui_vbox.addSpacing(5)
        self.genre_name = QLabel("")

        top_ui_vbox.addWidget(self.genre_name)
        self.genre_name.setStyleSheet("font-weight: bold; " + \
                                      "font-size: " + str(views.default_ui_font_size) + "pt;" + \
                                      "margin-top:   6px;" + \
                                      "padding-left: 6px; padding-bottom: 0;")


        self.instructions = autofit_textedit.AutoFitTextEdit()
        self.instructions.setStyleSheet("AutoFitTextEdit {background-color: " + views.default_ui_input_background_color + ";"
                                                   "margin-top:     0px; " + \
                                                   "margin-bottom:  6px;" + \
                                                   "padding-top:    0px;" + \
                                                   "padding-left:   6px; " + \
                                                   "border:         0;" + \
                                                   "}")
        doc = self.instructions.document()        
        doc.setDefaultStyleSheet(views.instructions_style)
        top_ui_vbox.addWidget(self.instructions)

        if self.app_win.areInstructionsHidden():
            self.instructions.hide()

        line = QFrame()
        line.setFrameShape(QFrame.HLine);
        line.setStyleSheet("color: " + views.default_ui_border_color + ";")
        top_ui_vbox.addWidget(line)

        top_ui_vbox.addSpacing(5)

        self.patterns_tree = ComposingPatternTree(self.app_win)
        self.patterns_tree.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)
        top_ui_vbox.addWidget(self.patterns_tree)

        ####################
        # Pattern Display
        ####################
        self.pattern_display = PatternDisplay(app_win=self.app_win)
        self.pattern_display.setAuditPanel(self)

        self.patterns_tree.setContainer(self)

        self.vsplit_panel = QSplitter(Qt.Vertical)            # top/bottom splitter
        self.vsplit_panel.addWidget(self.topic_ui_container)  # top
        self.vsplit_panel.addWidget(self.pattern_display)     # pattern display
        self.vsplit_panel.setCollapsible(0, False)
        self.vsplit_panel.setCollapsible(1, False)
        self.vsplit_panel.setStyleSheet("QSplitter::handle {background-color: " + views.splitter_handle_color + ";}")

        self.layout.addWidget(self.vsplit_panel)
        self.pattern_display.reset()

    def clickARuleByTopic(self, topic):
        if self.ruleset is None:
            return
        rule = self.ruleset.getRuleByTopic(topic.replace('_', ' '))
        if rule is not None:
            self.selectRule(rule)

    def initialize(self, ruleset, is_file_open=True):

        self.ruleset = ruleset
        self.genre_name.setText(ruleset.getName())

        if self.instructions is not None:
            self.instructions.setHtml(self.app_win.getInstruction('audit'))

        self.pattern_display.setRuleset(ruleset)
        rules = ruleset.getRules()
        self.dont_update = True

        self.current_topic_clusters = list()

        rules_dicts = list()
        for rule in rules:

            rd = dict()
            rd['name'] = rule.getName()
            rd['type'] = rule.getType()
            rd['is_group'] = rule.isGroup()
            rd['data'] = rule
            rd['sent_count'] = -1

            if rule.isGroup():

                lst = list()
                for sub_rule in rule.getChildren():
                    sub_rd = dict()
                    sub_rd['name'] = sub_rule.getName()
                    sub_rd['type'] = sub_rule.getType()
                    sub_rd['data'] = sub_rule
                    sub_rd['sent_count'] = 0

                    topic = sub_rule.getTopic(0)

                    udt_undefined = True
                    if topic is not None:
                        lemma1 = topic['lemma']
                        lemma1 = lemma1.replace(' ', '_')

                        if topic.get('user_defined', False):
                            if ds_doc.DSDocument.isUserDefinedSynonymDefined(lemma1):
                                udt_undefined = False
                            else:
                                udt_undefined = True                                
                        else:
                            udt_undefined = False

                        self.current_topic_clusters.append(topic['lemma'])

                    else:
                        udt_undefined = True
                        lemma1 = None

                    sub_rd['sent_count'] = self.controller.countTopicExperienceCollocationSentences(lemma1, None)
                    sub_rd['user_defined_topics_undefined'] = udt_undefined

                    lst.append(sub_rd)

                rd['children'] = lst

            else:
                rd['children'] = []

                topic = rule.getTopic(0)
                if topic is not None:
                    lemma1 = topic['lemma']
                    lemma1 = lemma1.replace(' ', '_')

                    if topic.get('user_defined', False):
                        if ds_doc.DSDocument.isUserDefinedSynonymDefined(lemma1):
                            udt_undefined = False
                        else:
                            udt_undefined = True
                    else:
                         udt_undefined = False

                    self.current_topic_clusters.append(topic['lemma'])

                else:
                    lemma1 = None

                rd['sent_count'] = self.controller.countTopicExperienceCollocationSentences(lemma1, None)
                rd['user_defined_topics_undefined'] = udt_undefined

            rules_dicts.append(rd)

        if is_file_open:
            self.patterns_tree.setRules(rules_dicts, ignore_undefined_udt=False)
        else:
            # we don't need to add the utd_undefined icons
            self.patterns_tree.setRules(rules_dicts, ignore_undefined_udt=True)

        self.pattern_display.reset()
        self.dont_update = False

    def getCurrentTopicClusters(self):
        return self.current_topic_clusters

    def setInstructionsVisible(self, is_visible):
        if is_visible:
            self.instructions.show()
        else:
            self.instructions.hide()

        # topic_dict = self.current_rule.getTopic(0)
        # descr = CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE.format(topic_dict['lemma'], topic_dict['lemma'])
        self.pattern_display.setRule(self.current_rule, True)

    def reset(self):
        pass

    def isLocked(self):
        return self.is_locked

    def setLocked(self, val):

        if self.ruleset is None:
            return

        if val == self.is_locked:
            return
        else:
            self.is_locked = val
            if val:
                op = QGraphicsOpacityEffect()
                op.setOpacity(0.6)      
                self.topic_ui_container.setGraphicsEffect(op)
            else:
                self.topic_ui_container.setGraphicsEffect(None)
                
    def updateSynonymsField(self, synonyms_str, force_update=False):
        self.pattern_display.updateSynonymsField(synonyms_str, force_update=force_update)

    def setController(self, c):
        self.controller = c
        self.patterns_tree.setController(c)
        self.pattern_display.setController(c)

    def selectRule(self, rule):
        self.patternSelected(rule)
        self.patterns_tree.setSelectionByName(rule.getName())

    def patternSelected(self, rule):

        if self.dont_update == True:
            return

        if rule is not None and self.controller.isDocument():

            self.current_rule = rule
            self.pattern_display.setRule(self.current_rule, True)

            topic_dict = rule.getTopic(0)

            if topic_dict is not None:
                lemma = topic_dict['lemma']
                self.controller.updateTopicClusterPanel(lemma)

            else:
                self.controller.clearTopicsEditorSelection()

            self.visualize()

        elif rule is not None:

            self.current_rule = rule
            self.pattern_display.setRule(self.current_rule, False)

            topic_dict = rule.getTopic(0)

            if topic_dict is not None:
                lemma = topic_dict['lemma']
                self.controller.updateTopicClusterPanel(lemma, ignore_edits=False)
            else:
                self.controller.clearTopicsEditorSelection()

        else:
            self.current_rule = None
            self.pattern_display.setRule(None)

    def visualize(self):
        if self.current_rule is None:
            return

        topic = self.current_rule.getTopic(0)
        if topic is not None:
            lemma = topic['lemma']
            lemma_ = lemma.replace(' ', '_')

            # If the topic is a user-defined topic, AND if its topic cluster is empty,
            # we don't highlight any sentences because there are no matches by default.
            if topic['user_defined']:
                if self.controller.getSynonymsFromSynsetEditor(lemma) == []:
                    self.controller.resetEditor()                   
                    return
        else:
            lemma_ = None

        self.controller.visualizeByRule(lemma_, None)

    def unselectCurrentItem(self):
        self.patterns_tree.unselectCurrentItem()
        self.pattern_display.setRule(None, True)

#################################
#
#################################
RULE  = 0
GROUP = 1

class PatternDisplay(QFrame):
#class PatternDisplay(QScrollArea): 
    def __init__(self, app_win=None, parent=None):
        super(PatternDisplay, self).__init__(parent)

        self.app_win        = app_win
        self.setupUI()
        self.audit_panel    = None
        self.current_rule   = None
        self.dont_visualize = False
        self.ruleset        = None
        self.controller     = None

    def setController(self, controller):
        self.controller = controller
        self.synset_editor.setController(controller)

    def setRuleset(self, ruleset):
        self.ruleset = ruleset

    def setAuditPanel(self, audit_panel):
        self.audit_panel = audit_panel
        self.synset_editor.setAuditPanel(audit_panel)

    def setView(self, view):
        self.show()
        if view == GROUP:
            self.group_container.show()    
            self.rule_container.hide()
        elif view == RULE:
            self.group_container.hide()
            self.rule_container.show()

    def setupUI(self):
        self.setMinimumHeight(400)
        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

        # Main Layout
        self.setStyleSheet(  "QComboBox {background-color: " + views.default_ui_input_background_color + ";" + \
                                                   "color: " + views.default_ui_text_color + ";" + \
                              "selection-background-color: " + views.menu_selected_color + ";" + \
                                         "selection-color: " + views.menu_selected_text_color + ";}" + \
                        # "PatternDisplay {background-color: " + views.audit_description_bg_color + ";}" )
                        "PatternDisplay {background-color: " + "#f00" + ";}" )

        main_vbox = QVBoxLayout()
        main_vbox.setContentsMargins(0,0,0,0)
        self.setLayout(main_vbox)

        # The container of the info about the currently selected rule
        self.rule_container = QFrame()
        rule_layout = QVBoxLayout()
        rule_layout.setSpacing(3)
        self.rule_container.setStyleSheet("QFrame {background-color: " + views.default_ui_input_background_color + ";" +
                                                   "margin: 0;}")
        self.rule_container.setLayout(rule_layout)

        # The container of the info about the currently selected group
        self.group_container = QFrame()
        group_layout = QVBoxLayout()
        group_layout.setSpacing(3)
        self.group_container.setStyleSheet("QFrame {background-color: " + views.default_ui_input_background_color + ";}")        
        self.group_container.setLayout(group_layout)

        main_vbox.addWidget(self.rule_container)
        main_vbox.addWidget(self.group_container)

        rule_layout.setContentsMargins(0,0,0,0)
        group_layout.setContentsMargins(0,0,0,0)

        group_layout.setSpacing(0)
        
        # --------------------------------------------------------------------
        # Group panel

        self.group_title = QLabel("About this Group of Expectations")
        self.group_title.setStyleSheet("font-weight: bold; color: " + views.default_ui_text_color + ";" + \
                                     "margin-top: 6;" + \
                                     "margin-left: 4;" + \
                                     "margin-bottom: 0;")
        group_layout.addWidget(self.group_title)

        # Description of the pattern
        self.group_description = QTextEdit()
        self.group_description.setStyleSheet("QTextEdit {border: 0;"  + \
                                                 "padding: 0;"  + \
                                                  "margin: 0;"  + \
                                        "background-color: " + views.default_vis_background_color + ";}")

        d = self.group_description.document()
        d.setDocumentMargin(8)
        d.setDefaultStyleSheet(views.instructions_style)
        self.group_description.setFrameStyle(QFrame.NoFrame)
        self.group_description.setMinimumHeight(0)
        self.group_description.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.MinimumExpanding)
        self.group_description.setReadOnly(True)
        group_layout.addWidget(self.group_description)
        group_layout.addStretch()

        self.group_container.hide()

        # --------------------------------------------------------------------
        # Topic Cluster Editor

        tc_editor_hbox = QHBoxLayout()
        tc_editor_hbox.setContentsMargins(0,0,0,0)
        tc_editor_hbox.setSpacing(0)

        self.synset_editor = tools_panel.MiniSynsetEditor(app_win=self.app_win, container=self, line=True)

        tc_editor_hbox.addWidget(self.synset_editor)

        rule_layout.addLayout(tc_editor_hbox)

        

        ####################################################################################

        rule_layout.addSpacing(8)

        self.tab_widget = QTabWidget()
        self.tab_widget.setStyleSheet("QTabWidget::pane {border: 0;}" + \
                                      "QTabBar {background-color: transparent;}" + \
                                 "QTabBar::tab {background-color: " + views.tab_color + ";" + \
                                                         "border: 1px solid" + views.tab_light_border_color + ";" + \
                                            "border-bottom-color: " + views.tab_color + ";" + \
                                         "border-top-left-radius: 4px;"   + \
                                        "border-top-right-radius: 4px;"   + \
                                                        "padding: 5px;"   + \
                                                   "padding-left: 15px;"  + \
                                                  "padding-right: 15px;}" + \

                                  "QTabBar::tab:selected {color: " + views.default_ui_text_color + ";" + \
                                              "background-color: " + views.tab_selected_light_color + ";" + \
                                           "border-bottom-color: " + views.tab_selected_light_color + ";" + \
                                                   "margin-left: 4px;" + \
                                                   "margin-right: 4px;" + \
                                                 "margin-bottom: 0px;}" + \

                                 "QTabBar::tab:!selected {color: " + views.default_ui_text_inactive_color + ";" + \
                                              "background-color: " + views.tab_light_color + ";" + \
                                           "border-bottom-color: " + views.tab_light_color + ";" + \
                                                   "margin-left: 4px;" + \
                                                   "margin-right: 4px;" + \
                                                 "margin-bottom: 0px;}")

        self.tab_widget.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)
        self.tab_widget.setDocumentMode(True)
        self.tbar = self.tab_widget.tabBar()
        self.tbar.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        self.tbar.setExpanding(True)
        self.tbar.setDrawBase(False)

        rule_layout.addWidget(self.tab_widget)

        #
        # Description
        #
        self.descr_container = QFrame()
        dscr_vbox = QVBoxLayout()
        dscr_vbox.setContentsMargins(0,0,0,0)
        self.descr_container.setLayout(dscr_vbox)
        self.descr_container.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)
        self.descr_container.setStyleSheet("QFrame {background-color: " + views.tab_selected_color + ";" + \
                                                 "padding: 0;" + \
                                                  "margin: 0;" + \
                                           # "border-left: 1px solid" + views.default_ui_border_color + ";" + \
                                           # "border-right: 1px solid" + views.default_ui_border_color + ";" + \
                                           # "border-bottom: 1px solid" + views.default_ui_border_color + ";" + \
                                           "}")

        self.tab_widget.addTab(self.descr_container, "About this Expectation")

        # Description of the pattern
        self.description = QTextEdit()
        self.description.setStyleSheet("QTextEdit {border: 0;"  + \
                                                 "padding: 0;"  + \
                                                  "margin: 0;"  + \
                                              "margin-top: 26px;" + \
                                        "background-color: " + views.default_vis_background_color + ";}")
                                        # "background-color: " + views.default_ui_background_color + ";}")

        d = self.description.document()
        d.setDocumentMargin(8)
        d.setDefaultStyleSheet(views.instructions_style)
        self.description.setFrameStyle(QFrame.NoFrame)
        self.description.setMinimumHeight(0)
        self.description.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.MinimumExpanding)
        self.description.setReadOnly(True)
        dscr_vbox.addWidget(self.description)

        #
        # Sample Sentences
        #
        self.sample_sents_container = QFrame()
        sample_sents_vbox = QVBoxLayout()
        sample_sents_vbox.setContentsMargins(0,0,0,0)
        self.sample_sents_container.setLayout(sample_sents_vbox)
        # self.sample_sents_container.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + ";"
        self.sample_sents_container.setStyleSheet("QFrame {background-color: " + views.tab_selected_color + ";" + \
                                               "padding: 0;" + \
                                                "margin: 0;" + \
                                           # "border-left: 1px solid" + views.default_ui_border_color + ";" + \
                                          # "border-right: 1px solid" + views.default_ui_border_color + ";" + \
                                         # "border-bottom: 1px solid" + views.default_ui_border_color + ";" + \
                                           "}")

        self.tab_widget.addTab(self.sample_sents_container, "Sample Sentences")

        # Examples
        self.examples = QTextEdit()
        self.examples.setStyleSheet("QTextEdit {border: 0;"+ \
                                                 "padding: 0;" + \
                                                  "margin: 0;" + \
                                              "margin-top: 26px;"
                                                   "color:" + views.default_text_color + ";" + \
                                        "background-color: " + views.default_vis_background_color + ";}")
        d = self.examples.document()
        self.examples.setMinimumHeight(0)
        self.examples.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        d.setDocumentMargin(8)
        style  = views.instructions_style
        style  = "span.topic {font-weight: bold; color: " + views.global_topic_color + ";} "
        style += "span.experience {background-color: "    + views.ds_cluster_highlight_color + ";"
        style +=                             "color: "    + views.ds_text_color + ";}"
        d.setDefaultStyleSheet(style)
        self.examples.setReadOnly(True)
        self.examples.setHtml("n/a")
        sample_sents_vbox.addWidget(self.examples)

        #
        # Sample Patterns
        #
        # self.sample_sents_container = QWidget()
        # sample_sents_vbox = QVBoxLayout()
        # self.sample_sents_container.setLayout(sample_sents_vbox)
        # self.tab_widget.addTab(self.sample_sents_container, "Sample Sentences")

        self.sample_patterns_container = QFrame()
        sample_patterns_vbox = QVBoxLayout()
        sample_patterns_vbox.setContentsMargins(0,0,0,0)
        self.sample_patterns_container.setLayout(sample_patterns_vbox)
        self.sample_patterns_container.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + ";"
                                               "padding: 0;" + \
                                                "margin: 0;" + \
                                           "border-left: 1px solid" + views.default_ui_border_color + ";" + \
                                          "border-right: 1px solid" + views.default_ui_border_color + ";" + \
                                         "border-bottom: 1px solid" + views.default_ui_border_color + ";" + \
                                           "}")


        # self.tab_widget.addTab(self.sample_patterns_container, "Sample Patterns")

        self.sample_patterns = QTextEdit()
        self.sample_patterns.setStyleSheet("QTextEdit {border: 0;"+ \
                                                     "padding: 0;" + \
                                                      "margin: 0;" + \
                                                      "color:" + views.default_text_color + ";" + \
                                            "background-color: " + views.default_vis_background_color + ";}")
        d = self.sample_patterns.document()
        self.sample_patterns.setMinimumHeight(0)
        self.sample_patterns.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        d.setDocumentMargin(8)
        d.setDefaultStyleSheet(views.instructions_style)
        self.sample_patterns.setReadOnly(True)
        self.sample_patterns.setHtml("n/a")
        sample_patterns_vbox.addWidget(self.sample_patterns)

        #
        # Values
        #
        if self.app_win.areCommunicationValuesVisible():
            rule_layout.addSpacing(4)
            self.values_title = QLabel("Communication values tied to this expectation")
            self.values_title.setStyleSheet("font-weight: bold; color: " + views.default_ui_text_color + "; " + \
                                            "margin-bottom: 0;" )
            rule_layout.addWidget(self.values_title)

            # icons
            values_hbox = QHBoxLayout()
            values_hbox.setContentsMargins(0,0,0,0)

            if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
                compelling_icon_path  = 'data/icons/cv_compelling_icon.png'
                credible_icon_path    = 'data/icons/cv_credible_icon.png'
                ethical_icon_path     = 'data/icons/cv_ethical_icon.png'
                considerate_icon_path = 'data/icons/cv_considerate_icon.png'
            else:
                compelling_icon_path  = 'data/icons/cv_compelling_dark_icon.png'
                credible_icon_path    = 'data/icons/cv_credible_dark_icon.png'
                ethical_icon_path     = 'data/icons/cv_ethical_dark_icon.png'
                considerate_icon_path = 'data/icons/cv_considerate_dark_icon.png'

            self.cv_compelling_icon = QLabel()
            pic = QPixmap(utils.resource_path(compelling_icon_path))
            self.cv_compelling_icon.setPixmap(pic.scaled(22, 22, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            values_hbox.addWidget(self.cv_compelling_icon)
            self.cv_compelling_label = QLabel("Compelling")
            values_hbox.addWidget(self.cv_compelling_label)
            values_hbox.addSpacing(10)

            self.cv_credible_icon = QLabel()
            pic = QPixmap(utils.resource_path(credible_icon_path))
            self.cv_credible_icon.setPixmap(pic.scaled(22, 22, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            values_hbox.addWidget(self.cv_credible_icon)      
            self.cv_credible_label = QLabel("Credible")
            values_hbox.addWidget(self.cv_credible_label)
            values_hbox.addSpacing(10)

            self.cv_considerate_icon = QLabel()
            pic = QPixmap(utils.resource_path(considerate_icon_path))
            self.cv_considerate_icon.setPixmap(pic.scaled(22, 22, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            values_hbox.addWidget(self.cv_considerate_icon)
            self.cv_considerate_label = QLabel("Considerate")
            values_hbox.addWidget(self.cv_considerate_label)
            values_hbox.addSpacing(10)

            self.cv_ethical_icon = QLabel()
            pic = QPixmap(utils.resource_path(ethical_icon_path))
            self.cv_ethical_icon.setPixmap(pic.scaled(22, 22, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            self.cv_ethical_icon.setDisabled(True)
            values_hbox.addWidget(self.cv_ethical_icon)
            self.cv_ethical_label = QLabel("Ethical")
            values_hbox.addWidget(self.cv_ethical_label)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)        
            self.cv_considerate_label.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)        
            self.cv_considerate_icon.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)
            self.cv_compelling_label.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)                
            self.cv_compelling_icon.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)        
            self.cv_credible_label.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)                
            self.cv_credible_icon.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)        
            self.cv_ethical_label.setGraphicsEffect(fade_effect)

            fade_effect = QGraphicsOpacityEffect()
            fade_effect.setOpacity(0.4)                
            self.cv_ethical_icon.setGraphicsEffect(fade_effect)

            values_hbox.addStretch()

            if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
                down_open_icon_path = 'data/icons/down_open_icon.png'
                up_close_icon_path  = 'data/icons/up_close_icon.png'
            else:
                down_open_icon_path = 'data/icons/down_open_dark_icon.png'
                up_close_icon_path  = 'data/icons/up_close_dark_icon.png'

            self.down_open_icon = QIcon(QPixmap(utils.resource_path(down_open_icon_path)))
            self.up_close_icon  = QIcon(QPixmap(utils.resource_path(up_close_icon_path)))

            self.show_values_button = QPushButton()
            self.show_values_button.setIcon(self.down_open_icon)
            self.show_values_button.setFixedSize(16,16)
            self.show_values_button.setFlat(True)
            self.show_values_button.setStyleSheet("QPushButton {background: transparent;}" + \
                                          "QPushButton:pressed {background: transparent;"  + \
                                                                         "border: none;}")
            self.show_values_button.setToolTip("Read about relevant communication values")
            self.show_values_button.clicked.connect(self.toggleValuesDescription)
            values_hbox.addWidget(self.show_values_button)

            rule_layout.addLayout(values_hbox)

            #
            # Description of the values
            #
            self.cv_description = QTextEdit()
            self.cv_description.setStyleSheet("QTextEdit {border: 1px solid " + views.default_ui_border_color + ";" + \
                                               "background-color: " + views.default_vis_background_color + ";" + \
                                               "margin: 0px;"
                                               "padding: 0px;}")
            d = self.cv_description.document()
            d.setDocumentMargin(8)
            d.setDefaultStyleSheet(views.instructions_style)
            self.cv_description.setFrameStyle(QFrame.NoFrame)
            self.cv_description.setMinimumHeight(0)
            self.cv_description.setMaximumHeight(300)
            self.cv_description.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
            self.cv_description.setReadOnly(True)
            self.cv_description.hide()
            rule_layout.addWidget(self.cv_description)
            rule_layout.addSpacing(8)

        self.show()

    def toggleValuesDescription(self):
        if self.cv_description.isVisible():
            self.show_values_button.setIcon(self.down_open_icon)            
            self.show_values_button.setToolTip("Read about relevant communication values")            
            self.cv_description.hide()            
        else:
            self.show_values_button.setIcon(self.up_close_icon)
            self.show_values_button.setToolTip("Close")            
            self.cv_description.show()            

    def openTopicClusterDialog(self):
        dialogs.TopicClusterDialog(rule=self.current_rule, controller=self.controller, parent=self)

    def updateSynonymsField(self, synonyms_str, force_update=False):
        self.synset_editor.updateSynonymsField(synonyms_str, force_update=force_update)

    def clearFields(self):
        self.description.setText("")
        self.examples.setHtml("")

    def setType(self, rule_type):

        if rule_type == 'active':
            color = views.audit_active_rule_color
            bg_color = views.audit_active_rule_bg_color

        elif rule_type == 'quiet':
            color = views.audit_quiet_rule_color            
            bg_color = views.audit_quiet_rule_bg_color

        elif rule_type == 'optional':
            color = views.audit_optional_rule_color            
            bg_color = views.audit_optional_rule_bg_color

        elif rule_type == 'bounded_optional':
            color = views.audit_bounded_optional_rule_color            
            bg_color = views.audit_bounded_optional_rule_bg_color

        elif rule_type == 'group' or rule_type == 'default':
            color = views.audit_default_rule_color            
            bg_color = views.audit_default_rule_bg_color

    def reset(self):
        self.clearFields()
        self.setType('default')
        self.hide()

    def setRule(self, rule, is_document):

        if rule is None:
            self.reset()
            return

        elif rule.isGroup():
            # self.reset()
            self.show()            
            self.clearFields()
            self.setView(GROUP)
            self.group_description.setHtml(rule.getDescription())            
            return

        if self.isVisible() == False:
            self.show()

        self.setView(RULE)

        self.current_rule = rule

        self.description.setHtml(rule.getDescription())
        if self.app_win.areCommunicationValuesVisible():        
            self.cv_description.setHtml(rule.getCVDescription())

        self.examples.setHtml(rule.getExamples())

        self.description.verticalScrollBar().setValue(0);
        if self.app_win.areCommunicationValuesVisible():        
            self.cv_description.verticalScrollBar().setValue(0);
        self.examples.verticalScrollBar().setValue(0);

        values = rule.getValues()
        if self.app_win.areCommunicationValuesVisible():        
            effect1 = self.cv_credible_label.graphicsEffect()
            effect2 = self.cv_credible_icon.graphicsEffect()
            opacity = 0.4
            if "credible" in values:
                opacity = 1.0
            effect1.setOpacity(opacity)
            effect2.setOpacity(opacity)                            
            self.cv_credible_label.setGraphicsEffect(effect1)
            self.cv_credible_icon.setGraphicsEffect(effect2)        

            effect1 = self.cv_compelling_label.graphicsEffect()
            effect2 = self.cv_compelling_icon.graphicsEffect()            
            opacity = 0.4
            if "compelling" in values:
                opacity = 1.0            
            effect1.setOpacity(opacity)
            effect2.setOpacity(opacity)                            
            self.cv_compelling_label.setGraphicsEffect(effect1)
            self.cv_compelling_icon.setGraphicsEffect(effect2)                

            effect1 = self.cv_considerate_label.graphicsEffect()
            effect2 = self.cv_considerate_icon.graphicsEffect()            
            opacity = 0.4            
            if "considerate" in values:
                opacity = 1.0                        
            effect1.setOpacity(opacity)
            effect2.setOpacity(opacity)
            self.cv_considerate_label.setGraphicsEffect(effect1)
            self.cv_considerate_icon.setGraphicsEffect(effect2)

            effect1 = self.cv_ethical_label.graphicsEffect()
            effect2 = self.cv_ethical_icon.graphicsEffect()            
            opacity = 0.4                        
            if "ethical" in values:
                opacity = 1.0                                    
            effect1.setOpacity(opacity)
            effect2.setOpacity(opacity)
            self.cv_ethical_label.setGraphicsEffect(effect1)
            self.cv_ethical_icon.setGraphicsEffect(effect2)

        self.setType(rule.getType())

        topic_dict = rule.getTopic(0)
        topic_label = None

        if topic_dict is None:                                   # no topic. hide the UI
            pass
        else:
            if topic_dict['user_defined']:                       # user defined, show additioanl field
                topic_label = topic_dict['lemma']
            else:                                                # regular topic
                topic_label = topic_dict['lemma']

        descr = CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE.format(views.global_topic_color, topic_label)
        self.synset_editor.setTopicCluster(topic_label)
        self.synset_editor.setRule(rule, descr)

#################################
#
#################################

class ComposingPatternTree(QTreeWidget):
    def __init__(self, app_win=None, parent=None):
        super(ComposingPatternTree, self).__init__(parent)

        self.app_win         = app_win
        self.controller      = None
        self.container       = None
        self.setHeaderHidden(True)
        self.setColumnCount(5)

        self.setStyleSheet("ComposingPatternTree {padding-right: 0px; margin-right: 0px; border: none;}" + \
                           "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                 "color: " + views.default_ui_text_color + ";" + \
                                                "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                "}")

        self.setColumnWidth(0,200)             # tree
        self.setColumnWidth(1,20)              # warning icon (on/off)
        self.setColumnWidth(2,100)             # expected (or not)
        self.setColumnWidth(3,30)              # count
        self.setColumnWidth(4,18)              # arrow

        header = self.header()
        header.setMinimumSectionSize(15)
        header.setSectionResizeMode(0, QHeaderView.Stretch);
        header.setSectionResizeMode(1, QHeaderView.Fixed)
        header.setSectionResizeMode(2, QHeaderView.Fixed)
        header.setSectionResizeMode(3, QHeaderView.Fixed)
        header.setSectionResizeMode(4, QHeaderView.Fixed)
        header.setStretchLastSection(False);
        header.resizeSection(1,20)
        header.resizeSection(2,100)
        header.resizeSection(3,30)
        header.resizeSection(4,18)

        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_warning_icon.png'))
        self.udt_undefined_icon = QIcon(pic.scaled(16, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        pic = QPixmap(utils.resource_path('data/icons/active_icon.png'))
        self.active_icon = QIcon(pic.scaled(16, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        pic = QPixmap(utils.resource_path('data/icons/quiet_icon.png'))
        self.quiet_icon = QIcon(pic.scaled(16, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        pic = QPixmap(utils.resource_path('data/icons/optional_icon.png'))
        self.optional_icon = QIcon(pic.scaled(16, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        pic = QPixmap(utils.resource_path('data/icons/bounded_optional_icon.png'))
        self.bounded_optional_icon = QIcon(pic.scaled(16, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        pic = QPixmap(utils.resource_path('data/icons/active_arrow_icon.png'))
        self.active_arrow_icon = QIcon(pic.scaled(10, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        pic = QPixmap(utils.resource_path('data/icons/quiet_arrow_icon.png'))
        self.quiet_arrow_icon = QIcon(pic.scaled(10, 16, Qt.KeepAspectRatio, Qt.SmoothTransformation))

        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)

        # self.itemSelectionChanged.connect(self.ruleSelected)
        self.itemClicked.connect(self.ruleSelected)

    def setController(self, c):
        self.controller = c

    def setContainer(self, container):
        self.container = container

    def ruleSelected(self, item, column):
        rule = item.data(0, Qt.UserRole)
        if rule is not None:
            self.container.patternSelected(rule)

    def setSelectionByName(self, name):
        items = self.findItems(name, Qt.MatchContains | Qt.MatchRecursive, 0)
        if len(items) > 0:
            item = items[0]
            self.setCurrentItem(item)

    def unselectCurrentItem(self):
        self.clearSelection()
        item = self.currentItem()
        if item is not None:
            item.setSelected(False)        

    def setRules(self, rules_dicts, ignore_undefined_udt=False):

        if rules_dicts == []:
            return

        self.clear()

        r_count = ord('A')
        for rd in rules_dicts:
            r_name  = rd['name']
            r_type  = rd['type']
            r_label = rule_type_to_label(r_type)
            r_data  = rd['data']
            r_is_group = rd['is_group']
            r_sent_count = rd['sent_count']
            r_udt_undefined = rd.get('user_defined_topics_undefined', False)

            ol_name = "{}. {}".format(chr(r_count), r_name)  # ordered list name

            if r_is_group:
                r_item = QTreeWidgetItem(self, [ol_name, '', '', '', ''])
                r_item.setExpanded(True)

            else:
                r_item = QTreeWidgetItem(self, [ol_name, '', r_label, str(r_sent_count), ''])

            r_item.setToolTip(0, r_name)                       # 0: group name
            r_item.setData(0, Qt.UserRole, r_data)             #
            r_item.setTextAlignment(3, Qt.AlignRight)          # 3: count

            font = r_item.font(0)
            font.setBold(True)
            r_item.setFont(0, font)

            if r_is_group == False:                            # not a group

                if r_type == 'active':
                    r_item.setIcon(2, self.active_icon)
                    if r_sent_count == 0:
                        r_item.setIcon(4, self.active_arrow_icon)
                elif r_type == 'quiet':
                    r_item.setIcon(2, self.quiet_icon)
                    if r_sent_count > 0:
                        r_item.setIcon(4, self.quiet_arrow_icon)
                elif r_type == 'optional':
                    r_item.setIcon(2, self.optional_icon)
                elif r_type == 'bounded_optional':
                    r_item.setIcon(2, self.bounded_optional_icon)

                if ignore_undefined_udt == False and r_udt_undefined:            # warning icon
                    r_item.setIcon(1, self.udt_undefined_icon)
                    r_item.setToolTip(1, "Topic cluster is not defined.")
                    r_item.setTextAlignment(1, Qt.AlignRight) 

            sr_count = 1
            for sub_rd in rd['children']:
                sr_name  = sub_rd['name']
                sr_type  = sub_rd['type']
                sr_label = rule_type_to_label(sr_type)
                sr_data  = sub_rd['data']
                sr_sent_count = sub_rd['sent_count']
                sr_udt_undefined = sub_rd.get('user_defined_topics_undefined', False)

                ol_name = "{}. {}".format(sr_count, sr_name)

                sr_item = QTreeWidgetItem(r_item, [ol_name, '', sr_label, str(sr_sent_count), ''])
                sr_item.setData(0, Qt.UserRole, sr_data)
                sr_item.setToolTip(0, sr_name)
                sr_item.setTextAlignment(3, Qt.AlignRight)

                if sr_type == 'active':
                    sr_item.setIcon(2, self.active_icon)
                    if sr_sent_count == 0:
                        sr_item.setIcon(4, self.active_arrow_icon)
                elif sr_type == 'quiet':
                    sr_item.setIcon(2, self.quiet_icon)
                    if sr_sent_count > 0:
                        sr_item.setIcon(4, self.quiet_arrow_icon)
                elif sr_type == 'optional':
                    sr_item.setIcon(2, self.optional_icon)
                elif sr_type == 'bounded_optional':
                    sr_item.setIcon(2, self.bounded_optional_icon)

                if ignore_undefined_udt == False and sr_udt_undefined:
                    sr_item.setIcon(1, self.udt_undefined_icon)
                    r_item.setToolTip(1, "Topic cluster is not defined.")

                sr_count += 1

            r_count += 1

        first = self.topLevelItem(0)
        self.scrollToItem(first)


