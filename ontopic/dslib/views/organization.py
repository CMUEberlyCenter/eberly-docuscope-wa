#!/usr/bin/env python
# -*- coding: utf-8 -*-


__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform
import math
import string
import random
import threading
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
import dslib.views.info_container as info_container
import dslib.views.autofit_textedit as autofit_textedit
import dslib.views.tools_panel as tools_panel
import dslib.views.audit as audit

from dslib.views.utils import is_skip

import pprint
pp = pprint.PrettyPrinter(indent=4)

# Measurements
PARA_BUTTON_WD  = 19
PARA_BUTTON_HT  = 19
PARA_BUTTON_GAP = 5

SENT_BUTTON_WD  = 19
SENT_BUTTON_HT  = 19
SENT_BUTTON_GAP = 5

SORT_ICON_SIZE     = 20
SORT_MENU_WIDTH    = 100

LEFT_COLUMN_WIDTH  = 300

class GlobalTopicsScrollArea(QScrollArea):
    def __init__(self, org_panel, parent=None):
        super(GlobalTopicsScrollArea, self).__init__(parent)
        self.org_panel = org_panel

    def resizeEvent(self, event):
        size = event.size()
        self.org_panel.resizeDSTemporalViews(size.width())
        self.org_panel.checkHScrollBar()

        super().resizeEvent(event)

class OrganizationPanel(QFrame):
    def __init__(self, impressions_panel=False, app_win=None, parent=None):

        super(OrganizationPanel, self).__init__(parent)
        
        self.app_win = app_win
        self.controller = None

        self.global_topic_views = None
        self.local_topic_views  = None
        self.global_label_views = None
        self.local_label_views  = None

        # Default Values
        self.coverage_threshold      = 30  # percentage
        self.span_threshold          = 60  # percentage 
        self.min_topics              = 2   # default cut off count is 2 (at least a topic appears twice)
        self.para_coverage_threshold = 60  # percentage

        self.topic_clusterd_only     = True
        self.sort_by                 = views.TOPIC_SORT_APPEARANCE

        self.global_header           = []
        self.local_header            = []
        self.global_topics           = []
        self.local_topics            = []

        self.selected_global_topics  = []
        self.selected_local_topics   = []

        self.selected_paragraphs     = []
        self.selected_sentences      = []

        self.graphing_option         = topicview.DSTemporalView.COUNT

        self.global_topic_layout_stretch     = None
        self.scroll_vis_h_scroll_bar_visible = False

        self.is_locked               = False

        self.rx_plots_view           = None

        self.current_index           = -1

        self.topic_cluster_only_toggle_button = None

        self.audit_panel = None

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            check_icon_path = "data/icons/check_icon.png"
        else:
            check_icon_path = "data/icons/check_dark_icon.png"

        self.setStyleSheet("QWidget {font-size: " + str(views.default_ui_font_size) + "pt;}" + 

                    "QFrame {background-color: " + views.default_ui_background_color + ";}" + 

                      "QScrollBar { background-color:"  + views.scrollbar_bg_color + ";" +
                                             "margin: 0;" +
                                             "border: 1px solid " + views.scrollbar_border_color + ";}" +

              "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                      "border-radius: 6px;" +   
                                             "border: 1px solid " + views.scrollbar_border_color + ";}" +

                       "QScrollBar::add-line {height: 0; width 0; background: none; border: none;}" +
                       "QScrollBar::sub-line {height: 0; width 0; background: none; border: none;}" +

                        "QToolTip { background-color: " + views.default_vis_background_color + ";" +
                                              "color: " + views.default_ui_text_color + ";" +
                                          "font-size: " + str(views.default_ui_font_size) + "pt;" +
                                             "border: none;" +
                                             "}" +                                

                       "QCheckBox::indicator {border: 1px solid " + views.default_ui_border_color + ";" +
                                              "width: 12px; height: 12px;" + \
                                   "background-color: " + views.default_ui_input_background_color + ";}" +
               "QCheckBox::indicator:checked {border: 1px solid " + views.default_ui_border_color + ";" +
                                              "image: url(" + utils.resource_path(check_icon_path) + ");"
                                              "}"                                                
                                        )

        self.layout = QVBoxLayout()
        self.setLayout(self.layout)
        self.layout.setContentsMargins(0,6,0,0)

        self.setMinimumWidth(400)
        self.setMinimumHeight(600)
        self.setSizePolicy(QSizePolicy.MinimumExpanding,QSizePolicy.Ignored)

        ##################################################
        #
        # UI for Global Topics
        # 
        ##################################################

        ##################################################
        # The main container for GlobalTopics
        ##################################################
        global_layout = QVBoxLayout()
        global_layout.setContentsMargins(0,0,0,0)
        global_layout.setSpacing(0)
        global_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        self.global_container = QWidget()
        self.global_container.setLayout(global_layout)
        self.global_container.setMinimumHeight(200)
        self.global_container.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + "}")

        # Title Area
        title_area_container = QWidget()
        title_area_hbox = QHBoxLayout()
        title_area_hbox.setAlignment(Qt.AlignVCenter | Qt.AlignLeft)
        title_area_container.setLayout(title_area_hbox)
        title_area_container.setFixedHeight(46)
        title_area_container.setStyleSheet("background-color: " + views.tab_selected_color + ";")
        
        # title_area_container.setStyleSheet("background-color: " + "#ff0" + ";")        
        number = QLabel()
        pic = QPixmap(utils.resource_path('data/icons/audit_icon.png'))
        number.setPixmap(pic.scaled(26, 26, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        title_area_hbox.addWidget(number)

        title_area_hbox.addSpacing(5)

        self.coherence_title = QLabel(views.COHERENCE_TITLE)
        self.coherence_title.setStyleSheet("QLabel {font-size: " + str(views.default_ui_heading_font_size) + "pt;" + 
                                                 "font-weight: bold; color: #e56600;}" +
                                      "QLabel:disabled {color: " + views.default_ui_text_inactive_color +";}")

        title_area_hbox.addWidget(self.coherence_title)

        title_area_hbox.addStretch()

        if self.app_win.areCommunicationValuesVisible():
            self.coherence_values_container = info_container.InfoContainer()
            values_hbox = QHBoxLayout()
            values_hbox.setContentsMargins(0,0,0,0)
            self.coherence_values_container.setLayout(values_hbox)
            self.coherence_values_container.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

            if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
                cv_coherence_icon_path = 'data/icons/cv_coherent_icon.png'
            else:
                cv_coherence_icon_path = 'data/icons/cv_coherent_dark_icon.png'            

            self.cv_coherence_icon = QPushButton()
            self.cv_coherence_icon.setFlat(True)
            self.cv_coherence_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                                          
            self.cv_coherence_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path(cv_coherence_icon_path))
            self.cv_coherence_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation))) 
            self.cv_coherence_icon.setToolTip("Coherence")
            self.cv_coherence_icon.clicked.connect(lambda state, arg=views.COHERENCE: self.controller.openPanelDescription(arg))
            values_hbox.addWidget(self.cv_coherence_icon)

            self.info_button = QToolButton(parent=self)
            icon = QIcon()
            pic = QPixmap(utils.resource_path('data/icons/info_icon.png'))        
            self.info_button.setIcon(QIcon(pic.scaled(14, 14, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.info_button.setCheckable(True)
            self.info_button.setFixedSize(14,14)
            self.info_button.setStyleSheet("QToolButton {background: transparent; border: none; margin: 0; padding-top: 0px;}")
            self.info_button.setToolTip("Read about <b>Coherence</b>") 
            self.info_button.clicked.connect(lambda state, arg=views.COHERENCE: self.controller.openPanelDescription(arg))   
            values_hbox.addWidget(self.info_button)
            values_hbox.addSpacing(8)

            title_area_hbox.addWidget(self.coherence_values_container)

            eff = self.coherence_values_container.setupAnimation()
            self.info_button.setGraphicsEffect(eff)

        global_layout.addWidget(title_area_container) 

        instructions_container = QWidget()
        instructions_vbox = QVBoxLayout()
        instructions_container.setLayout(instructions_vbox)
        instructions_vbox.setContentsMargins(0,10,0,0)

        gbox = QGridLayout()
        gbox.setColumnStretch(0,0)
        gbox.setColumnStretch(1,0)
        gbox.setColumnStretch(2,10)

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            topic_left_icon_path  = 'data/icons/topic_left_icon.png'
            topic_right_icon_path = 'data/icons/topic_right_icon.png'
            topic_sent_icon_path  = 'data/icons/topic_sent_icon.png'
            para_button_icon_path = 'data/icons/para_button_icon.png'
            non_local_icon_path   = 'data/icons/non_local_icon.png'
        else:
            topic_left_icon_path  = 'data/icons/topic_left_dark_icon.png'
            topic_right_icon_path = 'data/icons/topic_right_dark_icon.png'
            topic_sent_icon_path  = 'data/icons/topic_sent_dark_icon.png'
            para_button_icon_path = 'data/icons/para_button_dark_icon.png'
            non_local_icon_path   = 'data/icons/non_local_dark_icon.png' 

        icon_size = 20
        hbox1 = QHBoxLayout()
        hbox1.addSpacing(5)
        self.topic_left_icon = QLabel()
        pic = QPixmap(utils.resource_path(topic_left_icon_path))
        self.topic_left_icon.setPixmap(pic.scaled(icon_size, icon_size, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox1.addWidget(self.topic_left_icon)      
        self.topic_left_label = QLabel("Topic before the main verb")
        hbox1.addWidget(self.topic_left_label, alignment=Qt.AlignLeft)
        hbox1.addStretch()
        hbox1.addSpacing(10)
        gbox.addLayout(hbox1, 0, 0)

        hbox2 = QHBoxLayout()        
        self.topic_sent_icon = QLabel()
        pic = QPixmap(utils.resource_path(topic_sent_icon_path))
        self.topic_sent_icon.setPixmap(pic.scaled(icon_size*2, icon_size, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox2.addWidget(self.topic_sent_icon)      
        self.topic_sent_label = QLabel("Topic in a topic sentence")
        hbox2.addWidget(self.topic_sent_label)
        hbox2.addStretch()
        gbox.addLayout(hbox2, 0, 1)

        hbox3 = QHBoxLayout()        
        self.non_local_icon = QLabel()
        pic = QPixmap(utils.resource_path(non_local_icon_path))
        self.non_local_icon.setPixmap(pic.scaled(round(icon_size*1.43), icon_size, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox3.addWidget(self.non_local_icon)      
        self.non_local_label = QLabel("Non-local topic")
        hbox3.addWidget(self.non_local_label)
        hbox3.addStretch()        
        hbox3.addSpacing(10)
        gbox.addLayout(hbox3, 0, 2)

        hbox1 = QHBoxLayout()  
        hbox1.addSpacing(5)
        self.topic_right_icon = QLabel()
        pic = QPixmap(utils.resource_path(topic_right_icon_path))
        self.topic_right_icon.setPixmap(pic.scaled(icon_size, icon_size, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox1.addWidget(self.topic_right_icon)
        self.topic_right_label = QLabel("Topic after the main verb")
        hbox1.addWidget(self.topic_right_label, alignment=Qt.AlignLeft)
        hbox1.addStretch()
        hbox1.addSpacing(10)
        gbox.addLayout(hbox1, 1, 0)

        hbox2 = QHBoxLayout()  
        hbox2.addSpacing(icon_size)
        self.para_button_icon = QLabel()
        pic = QPixmap(utils.resource_path(para_button_icon_path))
        self.para_button_icon.setPixmap(pic.scaled(icon_size, icon_size, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox2.addWidget(self.para_button_icon)      
        self.para_button_label = QLabel("Paragraph/Sentence Number")
        hbox2.addWidget(self.para_button_label)
        hbox2.addStretch()
        gbox.addLayout(hbox2, 1, 1)

        instructions_vbox.addLayout(gbox)
        instructions_vbox.addSpacing(5)
        
        self.instructions_textbox = autofit_textedit.AutoFitTextEdit()
        self.instructions_textbox.setStyleSheet("AutoFitTextEdit {background-color: " + views.default_ui_input_background_color + ";"
                                                   "margin-top:      0px; " +
                                                   "margin-left:     3px; " + 
                                                   "padding-left:    6px; " +
                                                   "padding-bottom: 10px; " +
                                                   "border: 0;}")

        doc = self.instructions_textbox.document()
        doc.setDefaultStyleSheet(views.instructions_style)
        html_str = self.app_win.getInstruction('coherence')
        self.instructions_textbox.setHtml(html_str)
        instructions_vbox.addWidget(self.instructions_textbox)

        if self.app_win.areInstructionsHidden():
            self.instructions_textbox.hide()

        global_layout.addWidget(instructions_container)        

        ##################################################
        # Title Area (Topics Across Paragraphs)
        ##################################################
        global_title_area_layout = QHBoxLayout()
        global_title_area_layout.setContentsMargins(0,0,0,0)
        global_title_area_layout.setSpacing(0)

        global_title_area = QWidget()
        global_title_area.setLayout(global_title_area_layout)
        global_title_area.setStyleSheet("QWidget {background-color: qlineargradient( x1:0 y1:0, x2:1 y2:0, stop:0 " + \
                                        views.global_title_bg_color + ", stop:1" + views.global_title_bg_color2 + "); " + \
                                        "padding-left:   8px; " + \
                                        "padding-top:    5px; " + \
                                        "padding-right:  5px; " + \
                                        "padding-bottom: 5px;}")

        global_title = QLabel("Topic Across Paragraphs")
        global_title.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)
        font = global_title.font() 
        title_font_size = views.default_ui_heading_font_size
        global_title.setStyleSheet("QLabel {background: transparent; " + \
                                   "font-size: " + str(title_font_size) + "pt; " + \
                                   "font-weight: bold; " + \
                                   "color: " + views.default_ui_text_color + ";" + \
                                   "padding-left: 0;} " + \
                                   "QLabel:disabled {color: " + views.default_ui_text_inactive_color +";}")

        global_title_area_layout.addWidget(global_title)

        self.global_reset_button = QPushButton()
        self.global_reset_button.setIcon(QIcon(QPixmap(utils.resource_path('data/icons/reset_icon.png'))))
        self.global_reset_button.setIconSize(QSize(16,16))        
        self.global_reset_button.setFixedSize(16,16)
        self.global_reset_button.setFlat(True)

        self.global_reset_button.setStyleSheet("QPushButton {background-color: transparent;" +
                                                                      "margin: 0px;" +
                                                                "padding-left: 0px;" +
                                                                      "border: none;}" +
                                       "QPushButton:pressed {background-color: transparent;" +
                                                                      "margin: 0px;" +
                                                                "padding-left: 0px;" +
                                                                      "border: none;}")

        self.global_reset_button.clicked.connect(self.resetGlobalTopics)
        self.global_reset_button.hide()
        global_title_area_layout.addWidget(self.global_reset_button)

        global_title_area_layout.addStretch()

        # Editor on/off UI
        hbox = QHBoxLayout()
        hbox.setContentsMargins(0,0,5,0)
        hbox.setSpacing(0)
        button_container = QWidget()
        button_container.setLayout(hbox)
        button_container.setStyleSheet("background-color: transparent;" + \
                                       "color: " + views.default_ui_text_color + ";")

        tc_icon = QLabel()
        tc_icon.setStyleSheet("background-color: transparent; padding: 0px; margin: 0px;")
        pic = QPixmap(utils.resource_path('data/icons/topic_cluster_icon.png'))
        tc_icon.setPixmap(pic.scaled(18, 18, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        hbox.addWidget(tc_icon)

        label = QLabel("Show Only Topic Clusters")
        label.setStyleSheet("background-color: transparent;" + \
                                "padding-left: 0; margin-left: 0;" + \
                               "padding-right: 0; margin-right: 0;" + \
                                       "color: " + views.default_ui_text_color + ";")
        hbox.addWidget(label)

        # font = label.font()
        # fmetrics = QFontMetrics(font)
        # ht = fmetrics.height()
        ht = 26

        pic = QPixmap(utils.resource_path('data/icons/off_icon.png'))
        self.off_icon = QIcon(pic)
        pic = QPixmap(utils.resource_path('data/icons/on_icon.png'))
        self.on_icon  = QIcon(pic)

        self.topic_cluster_only_toggle_button = QPushButton()
        self.topic_cluster_only_toggle_button.setFlat(True)
        self.topic_cluster_only_toggle_button.setIconSize(QSize(ht, ht)) 
        self.topic_cluster_only_toggle_button.setStyleSheet("border: 0; padding: 0; background-color: transparent;")
        self.topic_cluster_only_toggle_button.setIcon(self.on_icon)
        self.topic_cluster_only_toggle_button.clicked.connect(self.toggleTopicClustersFilter)

        hbox.addWidget(self.topic_cluster_only_toggle_button)
        self.topic_cluster_only_toggle_label = QLabel("On")
        self.topic_cluster_only_toggle_label.setStyleSheet("background-color: transparent;" + \
                                                               "padding-left: 0; margin-left: 0;" + \
                                                                      "color: " + views.default_ui_text_color + ";")
        hbox.addWidget(self.topic_cluster_only_toggle_label)

        global_title_area_layout.addWidget(button_container)

        global_layout.addWidget(global_title_area)

        ##################################################
        # Create the control area consisting of (a) sort menu, (b) paragraph buttons
        ##################################################

        self.global_control_container = QFrame()
        self.global_control_container.setMaximumHeight(topicview.CONTROL_HT)
        self.global_control_container.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        self.global_control_container.setStyleSheet("QFrame {border: none;}")

        global_control_layout = QHBoxLayout()
        global_control_layout.setContentsMargins(0,0,0,0)
        global_control_layout.setSpacing(0)
        self.global_control_container.setLayout(global_control_layout)

        # sort icon
        sort_ui_container = QFrame()
        sort_ui_container.setFixedSize(LEFT_COLUMN_WIDTH, topicview.CONTROL_HT)
        sort_ui_container.setStyleSheet("QFrame {border: none; border-right: 1px solid " + views.default_ui_border_color + ";}")
        hbox = QHBoxLayout()
        hbox.setContentsMargins(5,5,0,0)
        sort_ui_container.setLayout(hbox)

        sort_icon = QWidget()
        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            icon_path = 'data/icons/sort_icon.png'
        else:
            icon_path = 'data/icons/sort_dark_icon.png'

        s = "QWidget {border-image: url(\"" + \
                                   utils.resource_path(icon_path) + \
                                   "\");}"
        sort_icon.setStyleSheet(s)
        sort_icon.setFixedSize(SORT_ICON_SIZE, SORT_ICON_SIZE)
        hbox.addWidget(sort_icon)

        # sort menu
        sort_menu = QComboBox()
        sort_menu.addItems(['Appearance', 'Count'])
        sort_menu.setStyleSheet("QComboBox {background-color: " + views.default_ui_input_background_color + ";" + \
                                                      "color: " + views.default_ui_text_color + ";" + \
                                 "selection-background-color: " + views.menu_selected_color + ";" + \
                                            "selection-color: " + views.menu_selected_text_color + ";}")

        sort_menu.currentIndexChanged.connect(self.toggleGlobalTopicSortMethod)
        hbox.addWidget(sort_menu)
        hbox.addSpacing(10)

        global_control_layout.addWidget(sort_ui_container)

        ##################################################
        # Paragraph SentButtonsView.
        ##################################################
        para_buttons_scroll_layout = QHBoxLayout()
        para_buttons_scroll_layout.setContentsMargins(2,0,0,0)
        para_buttons_scroll_layout.setSpacing(0)
        para_buttons_scroll_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        para_buttons_scroll_container = QWidget()
        para_buttons_scroll_container.setLayout(para_buttons_scroll_layout)
        para_buttons_scroll_container.setStyleSheet("QWidget {background-color:" + views.default_vis_background_color + ";}")

        para_buttons_scroll_area = QScrollArea()
        para_buttons_scroll_area.setWidget(para_buttons_scroll_container)
        para_buttons_scroll_area.setWidgetResizable(True)
        para_buttons_scroll_area.setAlignment(Qt.AlignLeft)
        para_buttons_scroll_area.setViewportMargins(0,0,0,0)
        para_buttons_scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        para_buttons_scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        para_buttons_scroll_area.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        para_buttons_scroll_area.setStyleSheet("QScrollArea {border: 0;}")

        self.para_buttons = ParaButtonsView(app_win=self.app_win)
        para_buttons_scroll_layout.addWidget(self.para_buttons)

        self.para_buttons_hscrollbar = para_buttons_scroll_area.horizontalScrollBar()

        global_control_layout.addWidget(para_buttons_scroll_area)

        ##################################################
        # List of global topics
        ##################################################
        hbox = QHBoxLayout()

        # Setup the scrollable area
        self.global_label_layout = QVBoxLayout()
        self.global_label_layout.setContentsMargins(0,10,0,0)
        self.global_label_layout.setSpacing(0)
        self.global_label_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.global_label_layout.addStretch()

        global_label_container = QFrame()
        global_label_container.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        global_label_container.setLayout(self.global_label_layout)
        global_label_container.setStyleSheet("QFrame {background-color:" + views.default_vis_background_color + "; border: none;}")
        
        scroll_label_area = QScrollArea()                    
        scroll_label_area.setWidget(global_label_container)
        scroll_label_area.setWidgetResizable(True)
        scroll_label_area.setAlignment(Qt.AlignLeft)
        scroll_label_area.setViewportMargins(0,0,0,0)
        scroll_label_area.setStyleSheet("QScrollArea {border: none; border-right: 1px solid " + views.default_ui_border_color + ";}")

        scroll_label_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_label_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_label_area.setFixedWidth(LEFT_COLUMN_WIDTH)

        self.global_label_v_scroll_bar = scroll_label_area.verticalScrollBar()
        self.global_label_v_scroll_bar.valueChanged.connect(self.globalLabelScrollBarChanged)

        hbox.addWidget(scroll_label_area) # the left side of the Global Topic Area

        # Scroll Area for the global topics.
        self.global_vis_layout = QVBoxLayout()
        self.global_vis_layout.setContentsMargins(2,10,0,0)
        self.global_vis_layout.setSpacing(0)
        self.global_vis_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.global_vis_layout.addStretch()

        global_vis_container = QFrame()
        global_vis_container.setLayout(self.global_vis_layout)
        global_vis_container.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        global_vis_container.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + "; border: 0;}")

        self.global_topics_scroll_area = GlobalTopicsScrollArea(self)
        self.global_topics_scroll_area.setWidget(global_vis_container)
        self.global_topics_scroll_area.setWidgetResizable(True)
        self.global_topics_scroll_area.setAlignment(Qt.AlignLeft)
        self.global_topics_scroll_area.setViewportMargins(0,0,0,0)
        self.global_topics_scroll_area.setStyleSheet("QScrollArea {border: 0;}")

        self.global_vis_h_scroll_bar = self.global_topics_scroll_area.horizontalScrollBar()
        self.global_vis_h_scroll_bar.valueChanged.connect(self.globalVisHScrollBarChanged)

        self.global_vis_v_scroll_bar = self.global_topics_scroll_area.verticalScrollBar()
        self.global_vis_v_scroll_bar.valueChanged.connect(self.globalVisVScrollBarChanged)

        hbox.addWidget(self.global_topics_scroll_area)

        # Add the contrall container and the topic area (scroll_area) to the global container
        global_layout.addWidget(self.global_control_container)
        global_layout.addLayout(hbox)

        self.global_control_container.hide()

        ##################################################
        #
        # UI for Local Topics
        # 
        ##################################################

        # The main container for Local Topics
        local_layout = QVBoxLayout()
        local_layout.setContentsMargins(0,0,0,0)
        local_layout.setSpacing(0)
        local_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        self.local_container = QWidget()
        self.local_container.setLayout(local_layout)
        self.local_container.setMinimumHeight(200)
        self.local_container.setStyleSheet("background-color: " + views.default_vis_background_color + ";")

        ########
        # Local Title Area
        ########
        local_title_area_layout = QHBoxLayout()
        local_title_area_layout.setContentsMargins(0,0,0,0)

        local_title_area = QWidget()
        local_title_area.setLayout(local_title_area_layout)
        local_title_area.setStyleSheet("QWidget {background-color: qlineargradient( x1:0 y1:0, x2:1 y2:0, stop:0 " + \
                                        views.local_title_bg_color + ", stop:1" + views.local_title_bg_color2 + "); " + \
                                        "padding-left:   8px; " + \
                                        "padding-top:    5px; " + \
                                        "padding-right:  0px; " + \
                                        "padding-bottom: 5px;}")                                        

        self.local_title = QLabel("Coherence Across Sentences")
        self.local_title.setStyleSheet("QLabel {background: transparent; " + \
                                       "font-size: " + str(title_font_size) + "pt; " + \
                                       "font-weight: bold; " + \
                                       "color: " + views.default_ui_text_color + ";" + \
                                       "padding-left: 0;} " + \
                                       "QLabel:disabled {color: #d0d0d0;}")
        local_title_area_layout.addWidget(self.local_title)

        local_title_area_layout.addStretch()

        local_layout.addWidget(local_title_area)

        ########
        # Create the control area consisting of (a) sort menu, (b) paragraph buttons
        ########
        self.local_control_container = QWidget()
        self.local_control_container.setMaximumHeight(topicview.CONTROL_HT)

        local_control_layout = QHBoxLayout()
        local_control_layout.setContentsMargins(0,0,0,0)
        local_control_layout.setSpacing(0)
        self.local_control_container.setLayout(local_control_layout)

        # sort icon
        empty_box = QFrame()
        empty_box.setFixedSize(LEFT_COLUMN_WIDTH, topicview.CONTROL_HT)
        empty_box.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + "; border: none; border-right: 1px solid " + views.default_ui_border_color + ";}")
        local_control_layout.addWidget(empty_box)

        # sent buttons
        sent_buttons_scroll_layout = QHBoxLayout()
        sent_buttons_scroll_layout.setContentsMargins(2,0,0,0)
        sent_buttons_scroll_layout.setSpacing(0)
        sent_buttons_scroll_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        sent_buttons_scroll_container = QWidget()
        sent_buttons_scroll_container.setLayout(sent_buttons_scroll_layout)
        sent_buttons_scroll_container.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + ";}")

        sent_buttons_scroll_area = QScrollArea()
        sent_buttons_scroll_area.setWidget(sent_buttons_scroll_container)
        sent_buttons_scroll_area.setWidgetResizable(True)
        sent_buttons_scroll_area.setAlignment(Qt.AlignLeft)
        sent_buttons_scroll_area.setViewportMargins(0,0,0,0)
        sent_buttons_scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        sent_buttons_scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        sent_buttons_scroll_area.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        sent_buttons_scroll_area.setStyleSheet("QScrollArea {border: 0;}")

        self.sent_buttons = SentButtonsView(app_win=self.app_win)
        sent_buttons_scroll_layout.addWidget(self.sent_buttons)

        self.sent_buttons_hscrollbar = sent_buttons_scroll_area.horizontalScrollBar()

        local_control_layout.addWidget(sent_buttons_scroll_area)

        ########
        # List of Topics
        ########

        hbox = QHBoxLayout()

        # Setup the scrollable area
        self.local_label_layout = QVBoxLayout()
        self.local_label_layout.setContentsMargins(0,10,0,0)
        self.local_label_layout.setSpacing(0)
        self.local_label_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.local_label_layout.addStretch()

        local_label_container = QWidget()
        local_label_container.setLayout(self.local_label_layout)
        local_label_container.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + ";}")
        
        scroll_label_area = QScrollArea()
        scroll_label_area.setWidget(local_label_container)
        scroll_label_area.setWidgetResizable(True)
        scroll_label_area.setAlignment(Qt.AlignLeft)
        scroll_label_area.setViewportMargins(0,0,0,0)
        scroll_label_area.setStyleSheet("QScrollArea {border: 0; border-right: 1px solid " + views.default_ui_border_color + ";}"
                                        # "QScrollBar:horizontal {background: #ddd;}"+ \
                                        # "QScrollBar:vertical   {background: #ddd;}"
                                        )
        scroll_label_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_label_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_label_area.setFixedWidth(LEFT_COLUMN_WIDTH)

        self.local_label_v_scroll_bar = scroll_label_area.verticalScrollBar()
        self.local_label_v_scroll_bar.valueChanged.connect(self.localLabelScrollBarChanged)

        hbox.addWidget(scroll_label_area) # the left side of the Global Topic Area

        # Scroll Area for the global topics.
        scroll_vis_layout = QVBoxLayout()
        scroll_vis_layout.setContentsMargins(0,10,0,0)
        scroll_vis_layout.setSpacing(0)
        scroll_vis_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        scroll_vis_container = QFrame()
        scroll_vis_container.setLayout(scroll_vis_layout)
        scroll_vis_container.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        scroll_vis_container.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + ";}")

        self.local_topics_scroll_area = QScrollArea()
        self.local_topics_scroll_area.setWidget(scroll_vis_container)
        self.local_topics_scroll_area.setWidgetResizable(True)
        self.local_topics_scroll_area.setAlignment(Qt.AlignLeft)
        self.local_topics_scroll_area.setViewportMargins(0,0,0,0)
        self.local_topics_scroll_area.setStyleSheet("QScrollArea {border: none;}"
                                                    # "QScrollBar:horizontal {background: #ddd;}"+ \
                                                    # "QScrollBar:vertical {background: #ddd;}"
                                                    )

        l_h_scroll_bar = self.local_topics_scroll_area.horizontalScrollBar()
        l_h_scroll_bar.valueChanged.connect(self.localVisHScrollBarChanged)

        self.local_vis_v_scroll_bar = self.local_topics_scroll_area.verticalScrollBar()
        self.local_vis_v_scroll_bar.valueChanged.connect(self.localVisVScrollBarChanged)

        # Create a container for the local topic visualization
        self.local_vis_layout = QVBoxLayout()
        self.local_vis_layout.setContentsMargins(2,0,0,0)
        self.local_vis_layout.setSpacing(0)
        self.local_vis_layout.addStretch()

        local_vis_container = QFrame()
        local_vis_container.setLayout(self.local_vis_layout)
        local_vis_container.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        local_vis_container.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + "; border: 0;}")

        scroll_vis_layout.addWidget(local_vis_container)
        scroll_vis_layout.addStretch()

        hbox.addWidget(self.local_topics_scroll_area)

        # Add the contrall container and the topic area (scroll_area) to the local container
        local_layout.addWidget(self.local_control_container)
        local_layout.addLayout(hbox)

        ##################################################
        #
        # UI for DocuScope / Reader Experience
        #
        ##################################################

        # RxView
        rx_layout = QVBoxLayout()
        rx_layout.setContentsMargins(0,0,0,0)
        rx_layout.setSpacing(0)
        rx_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        self.rx_container = QWidget()
        self.rx_container.setLayout(rx_layout)
        self.rx_container.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + "}")
        self.rx_container.setMinimumHeight(200)

        # Title Area
        title_area_container = QWidget()
        title_area_hbox = QHBoxLayout()
        title_area_hbox.setAlignment(Qt.AlignVCenter | Qt.AlignLeft)
        title_area_container.setLayout(title_area_hbox)
        title_area_container.setFixedHeight(46)
        title_area_container.setStyleSheet("background-color: " + views.tab_selected_color + ";")
        
        number = QLabel()
        pic = QPixmap(utils.resource_path('data/icons/audit_icon.png'))
        number.setPixmap(pic.scaled(26, 26, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        title_area_hbox.addWidget(number)

        title_area_hbox.addSpacing(5)

        self.rx_title = QLabel(views.IMPRESSIONS_TITLE)
        self.rx_title.setStyleSheet("QLabel {font-size: " + str(views.default_ui_heading_font_size) + "pt; font-weight: bold; color: #e56600;}")
        title_area_hbox.addWidget(self.rx_title)

        title_area_hbox.addStretch()
        if self.app_win.areCommunicationValuesVisible():        
            self.impressions_values_container = info_container.InfoContainer()
            values_hbox = QHBoxLayout()
            values_hbox.setContentsMargins(0,0,0,0)                
            self.impressions_values_container.setLayout(values_hbox)
            self.impressions_values_container.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

            self.cv_compelling_icon = QPushButton()
            self.cv_compelling_icon.setFlat(True)
            self.cv_compelling_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                                          
            self.cv_compelling_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path('data/icons/cv_compelling_icon.png'))
            self.cv_compelling_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.cv_compelling_icon.setToolTip("Compelling")
            self.cv_compelling_icon.clicked.connect(lambda state, arg=views.IMPRESSIONS: self.controller.openPanelDescription(arg))                                
            values_hbox.addWidget(self.cv_compelling_icon)
            values_hbox.addSpacing(2)

            # self.cv_credible_icon = QLabel()
            self.cv_credible_icon = QPushButton()
            self.cv_credible_icon.setFlat(True)
            self.cv_credible_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                                                  
            self.cv_credible_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path('data/icons/cv_credible_icon.png'))
            self.cv_credible_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))
            self.cv_credible_icon.setToolTip("Credible")
            self.cv_credible_icon.clicked.connect(lambda state, arg=views.IMPRESSIONS: self.controller.openPanelDescription(arg))                        
            values_hbox.addWidget(self.cv_credible_icon)      
            values_hbox.addSpacing(2)

            # self.cv_considerate_icon = QLabel()
            self.cv_considerate_icon = QPushButton()
            self.cv_considerate_icon.setFlat(True)
            self.cv_considerate_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                                                  
            self.cv_considerate_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path('data/icons/cv_considerate_icon.png'))
            self.cv_considerate_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.cv_considerate_icon.setToolTip("Considerate")
            self.cv_considerate_icon.clicked.connect(lambda state, arg=views.IMPRESSIONS: self.controller.openPanelDescription(arg))                
            values_hbox.addWidget(self.cv_considerate_icon)
            values_hbox.addSpacing(2)

            # self.cv_ethical_icon = QLabel()
            self.cv_ethical_icon = QPushButton()
            self.cv_ethical_icon.setFlat(True)
            self.cv_ethical_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                                                          
            self.cv_ethical_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path('data/icons/cv_ethical_icon.png'))
            self.cv_ethical_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.cv_ethical_icon.setToolTip("Ethical")
            self.cv_ethical_icon.clicked.connect(lambda state, arg=views.IMPRESSIONS: self.controller.openPanelDescription(arg))        
            values_hbox.addWidget(self.cv_ethical_icon)

            self.info_button = QToolButton(parent=self)
            icon = QIcon()
            pic = QPixmap(utils.resource_path('data/icons/info_icon.png'))
            self.info_button.setIcon(QIcon(pic.scaled(14, 14, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.info_button.setCheckable(True)
            self.info_button.setFixedSize(14,14)
            self.info_button.setStyleSheet("QToolButton {background: transparent; border: none; margin: 0; padding-top: 0px;}")
            self.info_button.setToolTip("Read about <b>Compelling</b>, <b>Credible</b>,\n<b>Considerate</b>, and <b>Ethical</b>.")        
            self.info_button.clicked.connect(lambda state, arg=views.IMPRESSIONS: self.controller.openPanelDescription(arg))
            values_hbox.addWidget(self.info_button)
            values_hbox.addSpacing(8)

            title_area_hbox.addWidget(self.impressions_values_container)

            eff = self.impressions_values_container.setupAnimation()
            self.info_button.setGraphicsEffect(eff)

        rx_layout.addWidget(title_area_container) 

        #
        # Control area (empty box + paragraph buttons)
        #
        self.rx_control_container = QFrame()
        self.rx_control_container.setMaximumHeight(topicview.CONTROL_HT)

        rx_control_layout = QHBoxLayout()
        rx_control_layout.setContentsMargins(0,0,0,0)
        rx_control_layout.setSpacing(0)
        self.rx_control_container.setLayout(rx_control_layout)

        empty_box = QFrame()
        empty_box.setFixedSize(LEFT_COLUMN_WIDTH, topicview.CONTROL_HT)
        empty_box.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + "; " + \
                                                  "border: none;}")

        rx_control_layout.addWidget(empty_box)

        rx_para_buttons_scroll_layout = QHBoxLayout()
        rx_para_buttons_scroll_layout.setContentsMargins(2,0,0,0)
        rx_para_buttons_scroll_layout.setSpacing(0)
        rx_para_buttons_scroll_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

        rx_para_buttons_scroll_container = QWidget()
        rx_para_buttons_scroll_container.setLayout(rx_para_buttons_scroll_layout)
        rx_para_buttons_scroll_container.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + ";}")

        rx_para_buttons_scroll_area = QScrollArea()
        rx_para_buttons_scroll_area.setWidget(rx_para_buttons_scroll_container)
        rx_para_buttons_scroll_area.setWidgetResizable(True)
        rx_para_buttons_scroll_area.setAlignment(Qt.AlignLeft)
        rx_para_buttons_scroll_area.setViewportMargins(0,0,0,0)
        rx_para_buttons_scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        rx_para_buttons_scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        rx_para_buttons_scroll_area.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        rx_para_buttons_scroll_area.setStyleSheet("QScrollArea {border: none;}")

        self.rx_para_buttons = ParaButtonsView(app_win=self.app_win)
        rx_para_buttons_scroll_layout.addWidget(self.rx_para_buttons)

        self.rx_para_buttons_hscrollbar = rx_para_buttons_scroll_area.horizontalScrollBar()
        rx_control_layout.addWidget(rx_para_buttons_scroll_area)

        rx_layout.addWidget(self.rx_control_container)

        #
        # List of Views
        #
        self.rx_vis_layout = QHBoxLayout()
        self.rx_vis_layout.setContentsMargins(2,0,0,0)
        self.rx_vis_layout.setSpacing(0)

        rx_view = QWidget()
        rx_view.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + "; " + \
                                                 "border: none;}")
        rx_view.setLayout(self.rx_vis_layout)
        rx_layout.addWidget(rx_view)

        #
        # synset editor
        #
        self.synset_editor = tools_panel.MiniSynsetEditor(app_win=self.app_win, container=self)

        #
        # Add the views to the splitter
        #
        self.tab_widget = QTabWidget()
        # 
        self.tab_widget.setStyleSheet("QTabWidget::pane {border: 0;" + \
                                                           "top: 0px; " + \
                                                             ";}" + \

                                           "QTabBar {background-color: " + views.default_ui_background_color + ";}" + \

                               "QTabBar::tab {background-color: " + views.tab_color + ";" + \
                                                        "border: 1px solid" + views.default_ui_border_color + ";" + \
                                           "border-bottom-color: " + views.tab_color + ";" + \
                                        "border-top-left-radius: 4px;" + \
                                       "border-top-right-radius: 4px;" + \
                                                       "padding: 5px;" + \
                                                       "padding-left:  15px;" + \
                                                       "padding-right: 15px;}" + \

                                  "QTabBar::tab:selected {color: " + views.default_ui_text_color + ";" + \
                                              "background-color: " + views.tab_selected_color + ";" + \
                                           "border-bottom-color: " + views.tab_selected_color + ";" + \
                                                   "margin-left: 4px;" + \
                                                 "margin-bottom: 0px;}" + \

                                 "QTabBar::tab:!selected {color: " + views.default_ui_text_inactive_color + ";" + \
                                              "background-color: " + views.tab_color + ";" + \
                                           "border-bottom-color: " + views.tab_color + ";" + \
                                                   "margin-left: 4px;" + \
                                                 "margin-bottom: 0px;}")

        self.tab_widget.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)
        self.tab_widget.setDocumentMode(True)
        self.tbar = self.tab_widget.tabBar()
        self.tbar.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        self.tbar.setExpanding(True)
        self.tbar.setDrawBase(False)

        self.vsplit_panel = QSplitter(Qt.Vertical)
        self.vsplit_panel.addWidget(self.global_container)
        self.vsplit_panel.addWidget(self.local_container)
        self.vsplit_panel.addWidget(self.synset_editor)

        self.vsplit_panel.setCollapsible(0, False)
        self.vsplit_panel.setCollapsible(1, False)
        self.vsplit_panel.setCollapsible(2, True)

        self.vsplit_panel.setStretchFactor(0, 2)
        self.vsplit_panel.setStretchFactor(1, 1)
        self.vsplit_panel.setStretchFactor(2, 1)
        self.vsplit_panel.setStyleSheet("QSplitter::handle {background-color: " + views.splitter_handle_color + ";}")

        # Vis Frames
        self.tab_widget.addTab(self.vsplit_panel, "Coherence")   
        if impressions_panel:
            self.tab_widget.addTab(self.rx_container, "Impressions")

        self.tab_widget.currentChanged.connect(self.tabChanged)

        # self.layout.addWidget(self.vsplit_panel)
        self.layout.addWidget(self.tab_widget)

        # self.rx_container.hide()
        self.local_container.hide()

        self.rx_cluster_labels_view = None

    def showSynsetEditor(self):
        self.synset_editor.show()

    def hideSynsetEditor(self):
        self.synset_editor.hide()

    def hideValuesIcons(self):
        if self.app_win.areCommunicationValuesVisible():        
            self.impressions_values_container.hide()
            self.coherence_values_container.hide()

    def clickATopic(self, lemma, expr):

        if self.current_index > 1:
            # We need to ignore the clicks on topic clusters if we
            # are in the Clarity or Impression panels.
            return

        if self.global_label_views is not None:

            for label_view in self.global_label_views:

                if label_view.lemma() == lemma:
                    if label_view.isSelected() == False:
                        label_view.processClicked()

                    if expr is not None:       # not used for now 9/13/2021
                        label_view.toggleDSData(True)
                        res = label_view.clickACluster(expr)
                        return res
                    return True

        elif self.local_label_views is not None:
            for label_view in self.local_label_views:
                if label_view.lemma() == lemma:
                    label_view.processClicked()
                    return True
        return False

    def tabChanged(self):
        if self.controller is not None:
            prev_index = self.current_index
            index = self.tab_widget.currentIndex()                        
            self.current_index = index
            
            tab_count = self.tab_widget.count()
            if tab_count == 4:  # All 4 Tabs are Visible
                tc = self.controller.getCurrentTopicCluster()

                if tc is not None:
                    if index == 0:    # expectations
                        self.controller.clickARuleByTopic(tc)  # works

                    elif index == 1:  # coherence
                        self.clickATopic(tc, None)

                    elif index > 1:
                        self.resetVisualizations()
                        self.controller.unselectCurrentExpectation()

                else:
                    self.resetVisualizations()
                    self.resetGlobalTopics()
                    self.controller.unselectCurrentExpectation()                    

                if prev_index != 3 and index == 3:
                    self.clearDSSelection()

            elif tab_count == 3:  # The expectations panel is not visible
                tc = self.controller.getCurrentTopicCluster()
                if tc is not None:
                    if index == 0:                  # on the coherence 
                        self.clickATopic(tc, None)
                    elif index > 0:
                        self.resetVisualizations()
                else:
                    self.resetVisualizations()
                    self.resetGlobalTopics()

                if prev_index != 2 and index == 2:  # on the impressions panel
                    self.clearDSSelection()

                self.controller.unselectParagraph(None)
                #self.para_buttons.unselectButtons()
                self.rx_para_buttons.unselectButtons()
                self.resetGlobalTopics()

    def setCurrentTabIndex(self, index):
        self.tab_widget.setCurrentIndex(index)

    def getExpectationsPixmap(self):
        if self.audit_panel is not None:
            pixmap = QPixmap(self.audit_panel.size())
            self.audit_panel.render(pixmap)
            return pixmap

    def getGlobalTopicsVisPixmap(self):
        pixmap = QPixmap(self.global_container.size())
        self.global_container.render(pixmap)        
        return pixmap

    def getLocalTopicsVisPixmap(self):
        pixmap = QPixmap(self.local_container.size())
        self.local_container.render(pixmap)        
        return pixmap

    def getReaderExperienceVisPixmap(self):
        pixmap = QPixmap(self.rx_container.size())
        self.rx_container.render(pixmap)        
        return pixmap

    def isVScrollBarVisible(self):
        return self.global_vis_v_scroll_bar.isVisible()

    def checkHScrollBar(self):

        if self.global_topic_layout_stretch is None:
            return

        prev_state = self.scroll_vis_h_scroll_bar_visible
        new_state  = self.global_vis_h_scroll_bar.isVisible()

        if new_state:
            # Add a little extra space to the TopicLabelView, if
            # the h scroll bar is visible now (but not before)
            h_bar_height = qApp.style().pixelMetric(QStyle.PM_ScrollBarExtent)
            self.global_label_layout_stretch.setFixedHeight(4 + h_bar_height)

        elif new_state == False:
            # Remove the little space from the TopiclabelView
            # if the horizontalbar is currently invisible (and previously invisible)
            self.global_label_layout_stretch.setFixedHeight(4)

        self.scroll_vis_h_scroll_bar_visible = new_state

    def resizeDSTemporalViews(self, width):
        if self.global_topic_views is not None:
            for v in self.global_topic_views:
                v.resizeDSTemporalView(width)

        if self.local_topic_views is not None:
            for v in self.local_topic_views:
                v.resizeDSTemporalView(width)

    def rxVisHScrollBarChanged(self, val):
        self.rx_para_buttons_hscrollbar.setValue(val)

    def rxVisVScrollBarChanged(self, val):
        if self.rx_cluster_labels_view.isVisible():    
            self.rx_cluster_labels_view.setVerticalScrollValue(val)
        elif self.rx_dimension_labels_view.isVisible():            
            self.rx_dimension_labels_view.setVerticalScrollValue(val)

    def rxLabelVScrollBarChanged(self, val):
        self.rx_plots_view.setVerticalScrollValue(val)

    def globalVisHScrollBarChanged(self, val):
        self.para_buttons_hscrollbar.setValue(val)
        if self.global_topic_views is not None:
            for v in self.global_topic_views:
                v.offsetDSTemporalView(val)

    def globalVisVScrollBarChanged(self, val):
        self.global_label_v_scroll_bar.setValue(val)

    def globalLabelScrollBarChanged(self, val):
        self.global_vis_v_scroll_bar.setValue(val)

    def localVisHScrollBarChanged(self, val):
        self.sent_buttons_hscrollbar.setValue(val)

    def localVisVScrollBarChanged(self, val):
        self.local_label_v_scroll_bar.setValue(val)

    def localLabelScrollBarChanged(self, val):
        self.local_vis_v_scroll_bar.setValue(val)

    ##################################################
    # Set Methods
    ##################################################

    def setInstructionsVisible(self, is_visible):
        if is_visible:
            self.instructions_textbox.show()
        else:
            self.instructions_textbox.hide()
        current_topic = None

        if len(self.selected_global_topics) == 1:
            current_topic = self.selected_global_topics[0]
        elif len(self.selected_global_topics) == 0 and len(self.selected_local_topics) == 1:
            current_topic = self.selected_local_topics[0]

        if current_topic is not None:
            current_topic = current_topic.replace('_', ' ')
            descr = audit.CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE.format(views.global_topic_color, current_topic)
            rule = self.controller.getRuleByTopic(current_topic)
            self.synset_editor.setRule(rule, descr)
        else:
            self.synset_editor.setRule(None, '') 

    def setLocked(self, val):

        if val == self.is_locked:
            return
        else:
            self.is_locked = val
            if val:  # locked == True
                self.global_container.setEnabled(False)
                self.local_container.setEnabled(False)
                op = QGraphicsOpacityEffect()
                op.setOpacity(0.6)      
                self.global_container.setGraphicsEffect(op)
            else:
                self.global_container.setEnabled(True)                
                self.local_container.setEnabled(True)
                self.global_container.setGraphicsEffect(None)

    def updateSynonymsField(self, synonyms_str, force_update=False):
        if self.synset_editor.isVisible():
            self.synset_editor.updateSynonymsField(synonyms_str, force_update=force_update)

    def isCoherencePanelVisible(self):
        return self.global_container.isVisible()

    def isLocked(self):
        return self.is_locked

    def setController(self, c):
        self.controller = c
        self.para_buttons.setController(c)
        self.sent_buttons.setController(c)
        self.rx_para_buttons.setController(c)
        self.synset_editor.setController(c)

    def setBoxSize(self, val):
        self.box_size = val

    # def setTopicThresholds(self, min_topics, span, coverage, para_coverage):
    #     self.span_threshold          = span
    #     self.coverage_threshold      = coverage
    #     self.para_coverage_threshold = para_coverage
    #     self.min_topics              = min_topics

    # def min_topics_changed(self, val):
        # self.min_topics = val

    def setMinTopics(self, val):
        self.min_topics = val

    def setAdjacencyStats(self, adj_stats_dict):
        for v in self.global_topic_views:
            topic = v.lemma()
            x = adj_stats_dict.get(topic, None)
            v.setAdjacencyStats(x)

    def reset(self):
        """
        Remove/Delete all the topic visualization objects
        """
        #
        # Global
        #
        for i in reversed(range(self.global_vis_layout.count())):
            w = self.global_vis_layout.itemAt(i)
            # if type(w) == QWidgetItem:
            if type(w) == topicview.TopicPlotView:                                
                w.widget().deleteLater()
                w.widget().setParent(None) 

        for i in reversed(range(self.global_label_layout.count())):
            w = self.global_label_layout.itemAt(i)
            # if type(w) == QWidgetItem:
            if type(w) == topicview.TopicLabelView:                                
                w.widget().deleteLater()
                w.widget().setParent(None)

        self.para_buttons.clearButtons()
        self.rx_para_buttons.clearButtons()

        self.global_topic_views = None
        self.global_header           = []
        self.global_topics           = []
        self.selected_global_topics  = []
        self.selected_paragraphs     = []
        self.global_topic_layout_stretch = None
        self.global_label_layout_stretch = None

        #
        # Local
        #
        for i in reversed(range(self.local_vis_layout.count())):
            w = self.local_vis_layout.itemAt(i)
            if type(w) == QWidgetItem:
                w.widget().deleteLater()
                w.widget().setParent(None)

        for i in reversed(range(self.local_label_layout.count())):
            w = self.local_label_layout.itemAt(i)
            if type(w) == QWidgetItem:
                w.widget().deleteLater()
                w.widget().setParent(None)

        self.sent_buttons.clearButtons()                

        self.local_topic_views  = None
        self.local_header            = []
        self.local_topics            = []
        self.selected_local_topics   = []
        self.selected_sentences      = []

        #
        # Rx Panel
        # 
        if type(self.rx_plots_view) == dsview.RxTemporalView:
            self.rx_plots_view.clearScene()

        for i in reversed(range(self.rx_vis_layout.count())):
            item = self.rx_vis_layout.itemAt(i)
            if type(item) == QWidgetItem:
                item.widget().deleteLater()
                item.widget().setParent(None)
            else:
                self.rx_vis_layout.removeItem(item)

        self.rx_plots_view            = None
        self.rx_para_buttons.clearButtons()


    def setGraphingOption(self, option):
        self.graphing_option = option

    ##################################################
    # Get Methods
    ##################################################    

    def getGlobalHeaderLabels(self):
        return self.getGlobalTopics()

    def getLocalHeaderLabels(self):
        return self.getLocalTopics()

    def getGlobalTopics(self):
        return self.global_topics

    def getLocalTopics(self):
        return self.local_topics

    def isLocalVisible(self):
        if self.selected_paragraphs:
            return True
        else:
            return False

    def updateGlobalTopics(self, global_data):
        data = global_data['data']

        header = data[0]   # list of tuples (POS, LEMMA, POS, SENT_COUNT, PARA_COUNT)
        self.global_header = header
        nrows  = len(data)
        ncols  = len(header)

        self.global_topics = list()

        if ncols == 0:
            return []

        topic_filter    = self.controller.getTopicFilter()
        sent_filter     = self.filterTopics(data, nrows, ncols)     

        true_left_count = 0
        l_count = 0

        for ci in range(ncols):    # for each colum (word) in a row

            topic = header[ci][1]
            p_ri = 0

            if topic is not None:
                if self.controller.areNonLocalTopicsExcluded() == True and \
                    self.controller.isLocalTopic(topic) == False and \
                    self.controller.isTopicCluster(topic) == False:
                    continue

                if ds_doc.DSDocument.isUserDefinedSynonym(topic):
                    true_left_count = sent_filter[topic]['left_count']
                    count = sent_filter[topic]['count']                    
                    l_count = sent_filter[topic]['left_count']
                    if count < 2:
                        count = 2
                else:
                    true_left_count = sent_filter[topic]['left_count']

                    if topic_filter == views.TOPIC_FILTER_ALL:
                        count = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:
                        l_count = sent_filter[topic]['left_count']
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

            if count < self.min_topics:
                continue

            self.global_topics.append(topic)

        # find the topic clusters that are not included in self.global_topics.
        # or simply add all the topic clusters and call list(set(...)) so that there
        # no duplicates!!

        tcs = self.controller.getTopicClusters()
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

    def updateLocalTopics(self, local_data):

        data = local_data

        topic_filter = self.controller.getTopicFilter()
        header = data[0]
        nrows  = len(data)
        ncols  = len(header)

        if ncols == 0:
            return []

        sent_filter = self.filterLocalTopics(data, nrows, ncols)

        true_left_count = 0
        l_count = 0
        self.local_topics = list()

        for ci in range(ncols):

            topic = header[ci][1]
            sent_count = 0

            if topic is not None:
                true_left_count = sent_filter[topic]['left_count']

                if topic_filter == views.TOPIC_FILTER_ALL:
                    count = sent_filter[topic]['count']
                    l_count = sent_filter[topic]['left_count']                  
                else:
                    l_count = sent_filter[topic]['left_count']
                    if l_count == 1:
                        count = 2
                    else:
                        count = l_count

            if count < self.min_topics:
                continue

            is_global = False
            if topic in self.global_topics:
                is_global = True

            self.local_topics.append((topic, is_global))

        return self.local_topics


    ##################################################
    # UI
    ##################################################

    def toggleGlobalResetButton(self, show):
        if show:
            self.global_reset_button.show()
        else:
            self.global_reset_button.hide()

    def toggleTopicClustersFilter(self):
        progdialog = dialogs.DSProgressDialog("Updating the visualization...", '', 0, 0, self.app_win) 
        progdialog.show()
        self.app_win.processEvents()

        if self.topic_clusters_only == True:
            self.topic_cluster_only_toggle_button.setIcon(self.off_icon)
            self.topic_clusters_only = False
            self.topic_cluster_only_toggle_label.setText("Off")
        else:
            self.topic_cluster_only_toggle_button.setIcon(self.on_icon)
            self.topic_clusters_only = True
            self.topic_cluster_only_toggle_label.setText("On")

        self.controller.unselectParagraph(None, refresh_editor=False)
        self.para_buttons.unselectButtons()
        self.controller.unselectTopic(None)
        
        self.sortGlobalView(self.sort_by)

        progdialog.reset()

    def setTopicClustersOnly(self, val):
        self.topic_clusters_only = val
        if self.topic_clusters_only == True:
            self.topic_cluster_only_toggle_button.setIcon(self.on_icon)
            self.topic_clusters_only = True
            self.topic_cluster_only_toggle_label.setText("On")
        else:
            self.topic_cluster_only_toggle_button.setIcon(self.off_icon)
            self.topic_clusters_only = False
            self.topic_cluster_only_toggle_label.setText("Off")            
        
    def toggleGlobalTopicSortMethod(self, val):
        progdialog = dialogs.DSProgressDialog("Updating the visualization...", '', 0, 0, self.app_win)            
        progdialog.show()
        self.app_win.processEvents()

        if val == views.TOPIC_SORT_APPEARANCE:
            self.controller.setGlobalTopicSortMethod(views.TOPIC_SORT_APPEARANCE)
            self.sortGlobalView(views.TOPIC_SORT_APPEARANCE)
        else:
            self.controller.setGlobalTopicSortMethod(views.TOPIC_SORT_LEFT_COUNT)
            self.sortGlobalView(views.TOPIC_SORT_LEFT_COUNT)
        self.toggleGlobalResetButton(False)

        progdialog.reset()

    def updateGlobalResetButton(self):
        if self.isLocked():
            return

        if self.selected_paragraphs or self.selected_global_topics:
            self.toggleGlobalResetButton(True)
        else:
            self.toggleGlobalResetButton(False)

    ##################################################
    # Interactions
    ##################################################

    #
    # Topic
    #
    def resetVisualizations(self):
        self.controller.unselectTopic(None)  # clear all the topic selections
        self.controller.clearEditorHighlights()
        self.controller.unselectCurrentExpectation()

    def setSelectedTopics(self, selected_topics):

        self.selected_global_topics = list()
        self.selected_local_topics  = list()

        local_topics = [t[0] for t in self.local_topics]

        for t in selected_topics:
            topic = t[0]
            is_global = t[1]
            if is_global:
                self.selected_global_topics.append(topic)
                if topic in local_topics:
                    self.selected_local_topics.append(topic)

            else:
                self.selected_local_topics.append(topic)

        if self.global_topic_views is not None:
            for v in self.global_topic_views:
                if v.lemma() in self.selected_global_topics:
                    v.select()
                elif v.isSelected():
                    v.unselect()

            for v in self.global_label_views:
                if v.lemma() in self.selected_global_topics:
                    v.select()
                elif v.isSelected():
                    v.unselect()

        if self.local_topic_views is not None:
            for v in self.local_topic_views:
                if v.lemma() in self.selected_local_topics:
                    v.select()
                elif v.isSelected():
                    v.unselect()

            for v in self.local_label_views:
                if v.lemma() in self.selected_local_topics:
                    v.select()
                elif v.isSelected():
                    v.unselect()

        self.updateGlobalResetButton()

        # if there is one and only one selected global topic, update the synset editor.
        current_topic = None
        if len(self.selected_global_topics) == 1:
            current_topic = self.selected_global_topics[0]
        elif len(self.selected_global_topics) == 0 and len(self.selected_local_topics) == 1:
            current_topic = self.selected_local_topics[0]

        if current_topic is not None:
            if self.controller.isTopicCluster(current_topic):
                current_topic = current_topic.replace('_', ' ')
                self.synset_editor.setEnabled(True)                
                self.synset_editor.setTopicCluster(current_topic)
                descr = audit.CP_DESCRIPTION_TOPIC_ONLY_TEMPLATE.format(views.global_topic_color, current_topic)
                rule = self.controller.getRuleByTopic(current_topic)
                self.synset_editor.setRule(rule, descr)
            else:
                self.synset_editor.clearContent()
                self.synset_editor.setDisabled(True)
                self.controller.clearTopicsEditorSelection()

    def getSelectedGlobalTopic(self):
        if self.selected_global_topics is not None and self.selected_global_topics != []:
            return self.selected_global_topics[0]
        else:
            return None
    #
    # Paragraph
    #
    def setSelectedParagraphs(self, selected_paragraphs, local_data, selected_topics=[]):

        self.selected_paragraphs = selected_paragraphs

        if self.global_topic_views is None:
            return

        for v in self.global_topic_views:
            v.update(selected_paragraphs=selected_paragraphs)

        if local_data == None:
            if self.local_container.isVisible():
                self.local_container.hide()
            return
        else:
            self.local_container.show()

        self.updateLocalView(local_data, selected_paragraphs, selected_topics)
        self.updateGlobalResetButton()

        num_paragraphs = len(selected_paragraphs)
        if num_paragraphs == 1:
            self.local_title.setText("Topic Across Sentences in Paragraph {}".format(selected_paragraphs[0]))
        elif num_paragraphs == 2:
            self.local_title.setText("Topic Across Sentences in Paragraphs {} and {}".format(selected_paragraphs[0], selected_paragraphs[1]))
        elif num_paragraphs > 2:
            pstr = ""
            for pid in selected_paragraphs[:-1]:
                pstr += (str(pid) + ", ")
            pstr += "and {}".format(selected_paragraphs[-1])
            self.local_title.setText("Topic Across Sentences in Paragraphs " + pstr)
        else:
            self.local_title.setText("Topic Across Sentences")


        self.para_buttons.setSelectedParagraphs([i-1 for i in selected_paragraphs])
        self.rx_para_buttons.setSelectedParagraphs([i-1 for i in selected_paragraphs])

    #
    # Sentence
    #
    def unselectSentence(self, sent):
        if sent in self.selected_sentences:
            self.selected_sentences.remoe(sent)

        self.sent_buttons.unselectButtons()

        if self.local_topic_views is not None:
            for v in self.local_topic_views:
                v.update()

    def setSelectedSentences(self, selected_sentences, selected_topics=[]):
        if self.local_topic_views is None:
            return

        if self.selected_sentences:
            self.sent_buttons.setSelectedSentences(selected_sentences)

        self.selected_sentences = selected_sentences

        for v in self.local_topic_views:
            v.update(selected_sentences=selected_sentences)

    def getSelectedGlobalTopics(self):
        res = list()
        for v in self.global_topic_views:
            if v.isSelected():
                res.append(v.lemma())

    def getSelectedLocalTopics(self):
        res = list()
        for v in self.local_topic_views:
            if v.isSelected():
                res.append(v.lemma())

    def clearDSCategorySelection(self, prev_category, new_category):
        
        if prev_category[3] != new_category[3]:  # a selection is made in a different panel. TAP or RX panels.

            if prev_category[0] == new_category[0] and prev_category[1] == new_category[1]:

                if new_category[3] == 'rx':
                    if self.global_label_views is not None:
                        for v in self.global_label_views:
                            v.clearDSSelections(prev_category[0], prev_category[1])
                else:
                    if self.rx_cluster_labels_view.isVisible():
                        self.rx_cluster_labels_view.clearSelection(prev_category[0])

                    elif self.rx_dimension_labels_view.isVisible():
                        self.rx_dimension_labels_view.clearSelection(prev_category[0], prev_category[1])

            if prev_category[0] != new_category[0] or prev_category[1] != new_category[1]:

                if new_category[3] == 'rx':
                    if self.global_label_views is not None:
                        for v in self.global_label_views:
                            v.clearDSSelections(prev_category[0], prev_category[1])
                else:
                    if self.rx_cluster_labels_view.isVisible():
                        self.rx_cluster_labels_view.clearSelection(prev_category[0])

                    elif self.rx_dimension_labels_view.isVisible():
                        self.rx_dimension_labels_view.clearSelection(prev_category[0], prev_category[1])
        else:
            if self.global_label_views is not None:
                for v in self.global_label_views:
                    v.clearDSSelections(prev_category[0], prev_category[1])

    ##################################################
    # Visualization Related Methdos
    ##################################################

    def redrawGraphs(self):
        for v in self.global_topic_views:
            v.redrawGraphs()

    def resetGlobalTopics(self):
        if self.global_topic_views is None or self.global_label_views is None:
            return

        self.controller.unselectTopic(None, refresh_editor=False)  # clear all the topic selections
        self.controller.unselectParagraph(None, refresh_editor=False)
        self.controller.resetEditor()
        self.selected_paragraphs = []

        for v in self.global_topic_views:
            if v.isSelected():
                v.unselect()
            v.collapse()
            v.update()

        for v in self.global_label_views:
            if v.isSelected():
                v.unselect()
            v.collapse()
            v.update()

        self.para_buttons.unselectButtons()
        self.rx_para_buttons.unselectButtons()

        self.selected_sentences = []
        self.updateLocalView(None, [], [])
        self.toggleGlobalResetButton(False)
        self.local_control_container.hide()

        self.synset_editor.clearContent()   # Mini Synset Editor

    def resetLocalTopics(self):
        self.selected_sentences = []
        self.sent_buttons.unselectButtons()

        # topics = list()
        if self.local_topic_views is not None:
            for v in self.local_topic_views:
                if v.isSelected():
                    v.unselect()
                v.update()

            for v in self.local_label_views:
                if v.isSelected():
                    v.unselect()
                # else:
                #     if v.isGlobal():
                #         topics.append(v.lemma())

    def findVGaps(self, data, nrows, ncols):
        res = dict()
        for c in range(0, ncols):  # for each topic
            plist = list()

            # initialize 'plist', 'startp', and 'endp'
            pindex = 0
            startp = -1
            endp   = -1
            for r in range(1, nrows):
                elem= data[r][c]

                if type(elem) == tuple and elem[0] is not None and elem[ds_doc.IS_SKIP] == False:
                    if startp < 0:
                        startp = pindex
                    elif startp >= 0:
                        endp = pindex

                if type(elem) == int and elem < 0:
                    # paragraph break
                    plist.append(False)
                    pindex += 1

            label = data[0][c]

            pindex = 0
            for r in range(1, nrows):
                elem= data[r][c]

                if type(elem) == tuple and elem[0] is not None and elem[ds_doc.IS_SKIP] == False: 
                    # if there is a hit, update plist.
                    plist[pindex] = True

                elif pindex < startp or pindex > endp:
                    # True if it is before the first one or after the last one.
                    plist[pindex] = True
                
                if type(elem) == int and elem < 0:
                    # paragraph break
                    pindex += 1
                    
            res[label[1]] = plist
                
        return res
        
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

                    if elem[ds_doc.ISLEFT]:
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
                        
            res[header] = {'type':            views.VISMODE_TEXT,
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

                    if elem[ds_doc.ISLEFT]:
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

            res[header] = {'type':           views.VISMODE_TEXT_COLLAPSED,
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

    # def sortLocalView(self, sort_by):

    #     # sort by appearance first always.
    #     self.local_header.sort(key=lambda tup: tup[2])
    #     if sort_by == views.TOPIC_SORT_LEFT_COUNT:
    #         self.local_header.sort(key=lambda tup: tup[3], reverse=True)

    #     # Create a sorted list of topics for the current list of topic usage views.
    #     current_order = [x.lemma() for x in self.local_topic_views]

    #     # Remove all the topic usage views from the layout
    #     for i in reversed(range(self.local_vis_layout.count())):
    #         w = self.local_vis_layout.itemAt(i)
    #         if type(w) == topicview.TopicPlotView and w.isEmpty() == False:
    #             self.local_vis_layout.removeWidget(w)

    #     # Add topic usage views in a new order
    #     for t in self.local_header:
    #         topic = t[1]
    #         if topic in current_order:
    #             i = current_order.index(t[1])
    #             self.local_vis_layout.insertWidget(self.local_vis_layout.count()-1, 
    #                                                    self.local_topic_views[i])

    def sortGlobalView(self, sort_by):

        self.sort_by = sort_by

        if self.global_topic_views is None:
            return

        # sort by appearance first.
        self.global_header.sort(key=lambda tup: tup[2])

        if self.sort_by == views.TOPIC_SORT_LEFT_COUNT:
            # if the user selects 'sort by count', re-sort the list.
            self.global_header.sort(key=lambda tup: tup[4], reverse=True)

        # Create a sorted list of topics for the current list of topic usage views.
        current_order = [x.lemma() for x in self.global_topic_views]

        if self.topic_clusters_only:

            ##### Plots #####
            # Remove all the topic plot views from the layout
            for i in reversed(range(self.global_vis_layout.count())):
                item = self.global_vis_layout.itemAt(i)
                w = item.widget()
                if type(w) == topicview.TopicPlotView:
                    self.global_vis_layout.removeWidget(w)
                    w.setParent(None)
                    w.hide()
                    del item

            # Add topic plot views in a new order
            for t in self.global_header:
                lemma = t[1]
                if self.topic_clusters_only and self.controller.isTopicCluster(lemma) == False:
                    continue

                if lemma in current_order:
                    i = current_order.index(lemma)
                    w = self.global_topic_views[i]
                    self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, w)
                    w.show()

            if self.global_topic_layout_stretch is None:
                v = topicview.TopicPlotView(None, None, None, None, self, None, None,
                                            app_win=self.app_win, controller=self.controller)
                self.global_topic_layout_stretch = v

            self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, self.global_topic_layout_stretch)                
            self.global_topic_layout_stretch.show()

            #
            # Labels
            #
            # Remove all the topic label views from the layout
            for i in reversed(range(self.global_label_layout.count())):
                item = self.global_label_layout.itemAt(i)
                w = item.widget()
                if type(w) == topicview.TopicLabelView:
                    self.global_label_layout.removeWidget(w)
                    w.setParent(None)
                    w.hide()
                    del item

            # Add topic usage views in a new order
            for t in self.global_header:
                lemma = t[1]
                if self.topic_clusters_only and self.controller.isTopicCluster(lemma) == False:
                    continue

                if lemma in current_order:
                    i = current_order.index(lemma)
                    w = self.global_label_views[i]
                    self.global_label_layout.insertWidget(self.global_label_layout.count()-1, w)
                    w.show()

            if self.global_label_layout_stretch is None:
                l = topicview.TopicLabelView(None, None, None, None, self, None, None,
                                             app_win=self.app_win, controller=self.controller)            
                self.global_label_layout_stretch = l

            self.global_label_layout.insertWidget(self.global_label_layout.count()-1, self.global_label_layout_stretch)
            self.global_label_layout_stretch.show()

        else:

            ##### Plots #####
            # Remove all the topic plot views from the layout
            for i in reversed(range(self.global_vis_layout.count())):
                item = self.global_vis_layout.itemAt(i)
                w = item.widget()
                if type(w) == topicview.TopicPlotView:
                    self.global_vis_layout.removeWidget(w)
                    w.setParent(None)
                    w.hide()
                    del item

            # self.global_topic_layout_stretch = None

            # Add topic plot views in a new order
            for t in self.global_header:
                lemma = t[1]
                if self.topic_clusters_only and self.controller.isTopicCluster(lemma) == False:
                    continue

                if lemma in current_order:
                    i = current_order.index(lemma)
                    w = self.global_topic_views[i]
                    self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, w)
                    w.show()

            if self.global_topic_layout_stretch is None:
                v = topicview.TopicPlotView(None, None, None, None, self, None, None,
                                            app_win=self.app_win, controller=self.controller)
                self.global_topic_layout_stretch = v

            self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, self.global_topic_layout_stretch)                
            self.global_topic_layout_stretch.show()
            #
            # Labels
            #
            # # Remove all the topic label views from the layout
            for i in reversed(range(self.global_label_layout.count())):
                item = self.global_label_layout.itemAt(i)
                w = item.widget()
                if type(w) == topicview.TopicLabelView:
                    self.global_label_layout.removeWidget(w)
                    w.setParent(None)
                    w.hide()                
                    del item

            # self.global_label_layout_stretch = None

            # Add topic usage views in a new order
            for t in self.global_header:
                lemma = t[1]
                if self.topic_clusters_only and self.controller.isTopicCluster(lemma) == False:
                    continue

                if lemma in current_order:
                    i = current_order.index(lemma)
                    w = self.global_label_views[i]
                    self.global_label_layout.insertWidget(self.global_label_layout.count()-1, w)
                    w.show()

            if self.global_label_layout_stretch is None:
                l = topicview.TopicLabelView(None, None, None, None, self, None, None,
                                             app_win=self.app_win, controller=self.controller)            
                self.global_label_layout_stretch = l

            self.global_label_layout.insertWidget(self.global_label_layout.count()-1, self.global_label_layout_stretch)
            self.global_label_layout_stretch.show()


    def updateGlobalView(self, global_data, adj_stats_dict, selected_topics=[]):

        if global_data is None:
            return ValueError('global_data is None.')

        self.global_control_container.show()

        data = global_data['data']
        para_data = global_data['para_data']

        if data is None:
            return ValueError('data is None.')

        header = data[0]   # list of tuples (POS, LEMMA, POS, COUNT)

        nrows  = len(data)
        ncols  = len(header)

        self.global_topic_views = list()
        self.global_label_views = list()
        self.global_topics = list()

        # Clear the widget from the topics_layout
        for i in reversed(range(self.global_vis_layout.count())):
            w = self.global_vis_layout.itemAt(i)
            if type(w) == topicview.TopicPlotView:                                
                w.widget().deleteLater()
                w.widget().setParent(None)

        for i in reversed(range(self.global_label_layout.count())):
            w = self.global_label_layout.itemAt(i)
            if type(w) == topicview.TopicLabelView:                
                w.widget().deleteLater()
                w.widget().setParent(None)

        if ncols == 0:
            self.para_buttons.update(len(para_data))
            return

        # Filters
        para_filter     = self.filterParaTopics(data, nrows, ncols) 
        key_para_topics = self.controller.getKeyParaTopics()
        topic_filter    = self.controller.getTopicFilter()
        gaps            = self.findVGaps(data, nrows, ncols)
        sent_filter     = self.filterTopics(data, nrows, ncols)     

        tcs = self.controller.getTopicClusters()

        sent_count = 0
        b_break = False
        true_left_count = 0
        l_count = 0
        count = 0

        for ci in range(ncols):    # for each (word/topic) 

            topic = header[ci][1]
            topic_data = [None] * (nrows-1)
            p_ri = 0

            if topic is not None:

                if self.controller.areNonLocalTopicsExcluded() == True and \
                    self.controller.isLocalTopic(topic) == False and \
                    self.controller.isTopicCluster(topic) == False:
                    continue

                if ds_doc.DSDocument.isUserDefinedSynonym(topic):
                    true_left_count = sent_filter[topic]['left_count']
                    count   = sent_filter[topic]['count']                    
                    l_count = sent_filter[topic]['left_count']
                    if count < 2:
                            count = 2
                else:
                    true_left_count = sent_filter[topic]['left_count']
                    if topic_filter == views.TOPIC_FILTER_ALL:
                        count   = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:
                        l_count = sent_filter[topic]['left_count']
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

            if count < self.min_topics:
                continue

            self.global_topics.append(topic)

            if topic in tcs:
                is_tc = True
            else:
                is_tc = False

            topic_info = None
            sent_count = 0
            for ri in range(2,nrows):     # for each column
                elem= data[ri][ci]        # get the elem 

                if type(elem) == int and elem < 0:
                    b_break = True

                # Not the first column (not the paragraph ID/Number)
                elif type(elem) == tuple and elem[0] is not None and \
                            is_skip(elem, true_left_count, topic_filter) == False:

                    curr_elem = topic_data[p_ri]

                    # d['sent_id'] captures the sent id of the first occurence of the topic on the left side.
                    if curr_elem is not None and elem[ds_doc.ISLEFT] == True and curr_elem['topic'][ds_doc.ISLEFT] == False:
                        d = dict()
                        d['topic']   = elem
                        d['sent_id'] = sent_count   
                        topic_data[p_ri] = d

                    elif curr_elem is None:
                        d = dict()
                        d['topic']   = elem

                        if elem[ds_doc.ISLEFT] == True:
                            d['sent_id'] = sent_count

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

            topic_data = topic_data[0:p_ri+1]
            if adj_stats_dict is not None:
                adj_stats = adj_stats_dict.get(topic_info[ds_doc.LEMMA], None)
            else:
                adj_stats = None

            # if self.controller.areNonLocalTopicsExcluded() == True and \
               # self.controller.isLocalTopic(topic) == False:
            if self.controller.isLocalTopic(topic) == False:               
                is_non_local = True
            else:
                is_non_local = False

            v = topicview.TopicPlotView(topic_info, topic_data, sent_filter, para_filter, self,
                               para_data, adj_stats,
                               is_global=True, view_type=views.GLOBAL_VIEW, is_non_local=is_non_local,
                               app_win=self.app_win, controller=self.controller)
            self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, v)
            v.update()

            l = topicview.TopicLabelView(topic_info, topic_data, sent_filter, para_filter, self,
                               para_data, adj_stats,
                               topic_plot_view=v,
                               is_global=True, view_type=views.GLOBAL_VIEW, is_topic_cluster=is_tc,
                               app_win=self.app_win, controller=self.controller)
            self.global_label_layout.insertWidget(self.global_label_layout.count()-1, l)
            v.setTopicLabelView(l)

            self.global_topic_views.append(v)
            self.global_label_views.append(l)

            # end of the for loop

        # Add missing topic clusters, if any
        if tcs is not None:
            missing_tcs = list(set(tcs) - set(self.global_topics))
            for tc  in missing_tcs:
                topic_info = ('NOUN', '', tc, False, '', '', None, False, 0, None, -1, -1, False, False, False, False)
                v = topicview.TopicPlotView(topic_info, {}, {tc: None}, {tc: None}, self, None, None,
                                   is_global=True, view_type=views.GLOBAL_VIEW,
                                   app_win=self.app_win, controller=self.controller)
                self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, v)
                v.update()

                l = topicview.TopicLabelView(topic_info, {}, {tc: None}, {tc: None}, self, None, None,
                                   topic_plot_view=v,
                                   is_global=True, view_type=views.GLOBAL_VIEW, is_topic_cluster=True,
                                   app_win=self.app_win, controller=self.controller)
                self.global_label_layout.insertWidget(self.global_label_layout.count()-1, l)
                v.setTopicLabelView(l)

                self.global_topic_views.append(v)
                self.global_label_views.append(l)

        #    
        # Empty views to stretch the bottom
        #
        v = topicview.TopicPlotView(None, None, None, None, self, None, None,
                               app_win=self.app_win, controller=self.controller)
        self.global_vis_layout.insertWidget(self.global_vis_layout.count()-1, v)

        l = topicview.TopicLabelView(None, None, None, None, self, None, None,
                               app_win=self.app_win, controller=self.controller)
        self.global_label_layout.insertWidget(self.global_label_layout.count()-1, l)

        self.global_topic_layout_stretch = v
        self.global_label_layout_stretch = l

        self.para_buttons.update(para_filter[topic]['para_count'])

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

                    if elem[ds_doc.IS_TOPIC] == False: # it's not a topic word
                        bSkip = True

                    if bSkip == False: # it's a topic word
                        if start < 0:
                            start = r
                        elif start >= 0:
                            end = r

                        given_left_count += 1

                        if elem[ds_doc.ISLEFT] == False:
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

            res[header] = {'type':            views.VISMODE_PARAGRAPH,
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

    def updateLocalView(self, local_data, selected_paragraphs, selected_topics):

        if local_data is not None:
            self.local_control_container.show()

        for i in reversed(range(self.local_label_layout.count())):
            w = self.local_label_layout.itemAt(i)
            if type(w) == QWidgetItem:
                w.widget().deleteLater()
                w.widget().setParent(None)

        for i in reversed(range(self.local_vis_layout.count())):
            w = self.local_vis_layout.itemAt(i)
            if type(w) == QWidgetItem:
                w.widget().deleteLater()
                w.widget().setParent(None)

        self.local_topic_views = list()
        self.local_label_views = list()
        self.local_topics = list()
        self.sent_buttons.update(None)

        data = local_data
        if data is None:
            return

        topic_filter = self.controller.getTopicFilter()
        key_para_topics = self.controller.getKeyParaTopics()
        key_sent_topics = []

        header = data[0]   # list of tuples (POS, LEMMA)
        self.local_header = header
        nrows  = len(data)
        ncols  = len(header)

        sent_buttons_data = [None] * (nrows-1)

        if ncols == 0:
            return

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

                if self.topic_clusters_only and self.controller.isTopicCluster(topic) == False:
                    continue

                if topic is not None:
                    true_left_count = sent_filter[topic]['left_count']

                    if topic_filter == views.TOPIC_FILTER_ALL:
                        count = sent_filter[topic]['count']
                        l_count = sent_filter[topic]['left_count']                  
                    else:
                        l_count = sent_filter[topic]['left_count']
                        if l_count == 1:
                            count = 2
                        else:
                            count = l_count

                if count < self.min_topics:
                    continue

                is_global = False
                if topic in self.global_topics:
                    is_global = True

                if self.controller.isTopicCluster(topic):
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
                        if elem[ds_doc.IS_SKIP] == False:
                            d = dict()
                            d['topic'] = elem
                            d['sent_id'] = sent_id
                            d['para_id'] = para_id-1
                            topic_data[sent_pos] = d
                            topic_info = elem

                    elif type(elem) == tuple and elem[0] is not None \
                                and is_skip(elem, true_left_count, topic_filter) == True:
                        b_skip = True

                    elif type(elem) == tuple and elem[0] is None:
                        b_skip = True

                    sent_buttons_data[sent_pos] = (sent_id, para_id-1, sent_pos)

                    if b_para_break:
                        para_count += 1
                        para_id = selected_paragraphs[para_count]
                        sent_id = 0
                        b_para_break = False
                    else:
                        sent_pos += 1
                        sent_id  += 1


                is_global = False
                if topic in self.global_topics:
                    is_global = True

                v = topicview.TopicPlotView(topic_info, topic_data, sent_filter, None, self, None, None,
                                   is_global=is_global, view_type=views.LOCAL_VIEW,
                                   app_win=self.app_win, controller=self.controller)
                self.local_vis_layout.insertWidget(self.local_vis_layout.count()-1, v)
                v.update()

                l = topicview.TopicLabelView(topic_info, topic_data, sent_filter, None, self, None, None,
                                   topic_plot_view=v,
                                   is_global=is_global, view_type=views.LOCAL_VIEW, is_topic_cluster=is_tc,
                                   app_win=self.app_win, controller=self.controller)
                self.local_label_layout.insertWidget(self.local_label_layout.count()-1, l)

                v.setTopicLabelView(l)

                lst = [t[0] for t in selected_topics]
                t   = topic_info[ds_doc.LEMMA]
                if t in lst:
                    v.select()
                    l.select()

                v.update()
                l.update()

                self.local_topic_views.append(v)
                self.local_label_views.append(l)

            v = topicview.TopicPlotView(None, None, None, None, self, None, None,
                                        app_win=self.app_win, controller=self.controller)
            self.local_vis_layout.insertWidget(self.local_vis_layout.count()-1, v)

            l = topicview.TopicLabelView(None, None, None, None, self, None, None,
                                         app_win=self.app_win, controller=self.controller)            
            self.local_label_layout.insertWidget(self.local_label_layout.count()-1, l)

            num_sent = nrows - 1 - (len(selected_paragraphs) - 1)
            self.sent_buttons.update(sent_buttons_data[:num_sent])

    #
    # hide Expectations panel
    #
    def removeGenreExpectationsPanel(self):
        self.tab_widget.removeTab(0)
        self.hideValuesIcons()

    def addGenreExpectationsPanel(self, ge_panel):
        self.audit_panel = ge_panel
        self.tab_widget.insertTab(0, ge_panel, "Expectations")

    def isAuditPanel(self):
        if self.audit_panel is None:
            return False
        else:
            return True

    #
    # show/hide Sentence Clarity panel
    #
    def addSentClarityPanel(self, sc_panel):
        self.tab_widget.insertTab(2, sc_panel, "Clarity")

    #
    # show / hide Impressions (DS) panel
    #
    def isDSPanelVisible(self):
        return self.rx_container.isVisible()

    def showDSPanel(self):
        self.rx_container.show()

    def hideDSPanel(self):
        self.rx_container.hide()

    # add / remove Impressions panel
    def removeImpressionsPanel(self):
        if self.tab_widget.count() == 4 and self.tab_widget.tabText(3) == "Impressions":
            self.tab_widget.removeTab(3)
            self.hideValuesIcons()

    def addImpressionsPanel(self):
        if self.tab_widget.count() == 3 and self.tab_widget.tabText(3) != "Impressions":
            # If there are 3 tabs (i.e., Expectations, Coherence, and Clarity),
            # add the Impressions tab.
            self.tab_widget.insertTab(3, self.rx_container, "Impressions")
            self.hideValuesIcons()

    #
    # show / hide Topics panel
    #
    def isTopicsPanelVisible(self):
        return self.global_container.isVisible()

    def showTopicsPanel(self):
        self.global_container.show()

    def hideTopicsPanel(self):
        self.global_container.hide()

    def hideGlobalTopicsPanel(self):
        if self.global_container.isVisible():
            self.global_container.hide()
            self.global_topic_views = None
            self.global_label_views = None

    def showGlobalTopicsPanel(self):
        if self.global_container.isVisible() == False:
            self.global_container.show()

    def showLocalTopicsPanel(self):
        if self.local_container.isVisible() == False:
            self.local_container.show()

    def hideLocalTopicsPanel(self):
        if self.local_container.isVisible() == True:
            self.local_container.hide()

    def updateRxView(self, data, tag_dicts, num_tokens):

        if type(self.rx_plots_view) == dsview.RxTemporalView:
            self.rx_plots_view.clearScene()

        for i in reversed(range(self.rx_vis_layout.count())):
            item = self.rx_vis_layout.itemAt(i)
            if type(item) == QWidgetItem:
                item.widget().deleteLater()
                item.widget().setParent(None)
            else:
                self.rx_vis_layout.removeItem(item)

        if type(data) == dict:
            para_data = data['para_data']
        else:
            para_data = None

        rx_plots_vbox = QVBoxLayout()
        if para_data is not None:
            self.rx_plots_view  = dsview.RxTemporalView(tag_dicts, para_data, 
                                                        org_panel=self, 
                                                        app_win=self.app_win, 
                                                        controller=self.controller)
            self.rx_plots_view.update()
        else:
            self.rx_plots_view = QWidget()
            self.rx_plots_view.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)            
            self.rx_plots_view.setStyleSheet("background-color: transparent;")

        rx_plots_vbox.addWidget(self.rx_plots_view)            
        rx_plots_vbox.addStretch()

        self.rx_cluster_labels_view   = dsview.RxClusterLabelsView(tag_dicts, self.rx_plots_view, num_tokens,
                                        org_panel=self, app_win=self.app_win, controller=self.controller)
        self.rx_dimension_labels_view = dsview.RxDimensionLabelsView(tag_dicts, self.rx_plots_view, num_tokens,
                                        org_panel=self, app_win=self.app_win, controller=self.controller)

        # self.rx_cluster_v_scrollbar   = self.rx_cluster_labels_view.verticalScrollBar()
        # self.rx_dimension_v_scrollbar = self.rx_dimension_labels_view.verticalScrollBar()

        self.rx_dimension_labels_view.hide()

        self.rx_vis_layout.addWidget(self.rx_cluster_labels_view)
        self.rx_vis_layout.addWidget(self.rx_dimension_labels_view)

        self.rx_vis_layout.addLayout(rx_plots_vbox)

        if para_data is not None:
            self.rx_para_buttons.update(len(para_data))

    def expandCluster(self, cluster_name, is_selected):
        self.rx_cluster_labels_view.hide()
        self.rx_dimension_labels_view.setCluster(cluster_name, is_selected)
        self.rx_dimension_labels_view.show()
        if type(self.rx_plots_view) == dsview.RxTemporalView:
            self.clearDSSelection()
            self.rx_plots_view.showDimensions(cluster_name)

    def collapseCluster(self, cluster_name, is_selected):

        self.rx_dimension_labels_view.hide()

        vpos = self.rx_cluster_labels_view.scrollToCluster(cluster_name, is_selected)

        # if self.rx_cluster_labels_view.isVisible():
        #     self.rx_cluster_labels_view.setVerticalScrollValue(vpos)
        # elif self.rx_dimension_labels_view.isVisible():
        #     self.rx_dimension_labels_view.setVerticalScrollValue(vpos)

        self.rx_cluster_labels_view.show()

        if type(self.rx_plots_view) == dsview.RxTemporalView:
            self.rx_plots_view.hideDimensions(cluster_name)
            self.rx_plots_view.setVerticalScrollValue(vpos)

        if is_selected == False:
            self.controller.resetEditor()

    def clickACluster(self, cluster_name, force=False):
        res = self.rx_cluster_labels_view.processClicked(cluster_name, force=True)    
        return res 

    def clearDSSelection(self):
        if self.rx_cluster_labels_view is not None:
            self.rx_cluster_labels_view.unselect()

######################################################################
#
# Paragraph Buttons
#
######################################################################

class ParaButton(QPushButton):
    """
    Buttons used to highlight paragraphs in the text view.
    """
    def __init__(self, label, pos, app_win=None, controller=None, parent=None):
        super(ParaButton, self).__init__(label, parent)

        self.pos        = pos   # 0 base
        self.app_win    = app_win
        self.controller = controller
        self.selected   = False
        self.font_size  = views.default_ui_font_size * 0.6

    def isSelected(self):
        return self.selected

    def getPos(self):
        return self.pos

    def processClicked(self, val):
        if self.controller.isTopicSentHighlighted():
            dialogs.WarningDialog("Unhighlight topic sentences", 
                        "You cannot select a paragraph while topic sentences are highlighted.")
            return

        if self.selected == True:
            self.controller.unselectParagraph(self.pos)
            self.reset()

        else:
            self.controller.setSelectedParagraph(self.pos)
            self.setStyleSheet("background-color: " + views.default_ui_selected_color + ";" + \
                                      "font-size: {}pt;".format(round(self.font_size)) + \
                                          "color: "+ views.default_text_color + ";")
            self.selected = True

        self.repaint()

    def reset(self):
        self.setStyleSheet("background-color: " + views.default_vis_background_color + ";" + \
                                  "font-size: {}pt; ".format(round(self.font_size)) + \
                                      "color: "+ views.default_text_color + ";")
        self.selected = False

    def setSelected(self):
        self.selected = True
        self.highlight()

    def highlight(self):
        self.setStyleSheet("background-color: " + views.default_ui_selected_color + ";" + \
                                  "font-size: {}pt;".format(round(self.font_size)) + \
                                      "color: "+ views.default_text_color + ";")

class ParaButtonsView(QGraphicsView):

    def __init__(self, app_win=None, parent=None):
        super(ParaButtonsView, self).__init__(parent)

        self.app_win = app_win
        self.controller = None

        self.setAlignment(Qt.AlignVCenter|Qt.AlignLeft)
        self.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform);
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setStyleSheet("ParaButtonsView {border: 0px; padding-top: 5px;}")

        self.setFixedHeight(topicview.CONTROL_HT)

        self.scene = QGraphicsScene()
        self.setScene(self.scene)
        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))

        self.font_size = views.default_ui_font_size * 0.6

    def setController(self, c):
        self.controller = c

    def setSelectedParagraphs(self, paragraphs):
        for item in self.scene.items():
            if item.isWidget() and type(item.widget()) == ParaButton:
                if item.widget().getPos() in paragraphs:
                    item.widget().setChecked(True)
                    item.widget().setSelected()
                    item.widget().highlight()
                else:
                    item.widget().reset()            

    def setSelectedParagraph(self, pos):
         for item in self.scene.items():
            if item.isWidget() and type(item.widget()) == ParaButton:
                if item.widget().getPos() == pos:
                    item.widget().setChecked(True)
                    item.widget().setSelected()
                    item.widget().highlight()
                else:
                    item.widget().reset()

    def unselectButtons(self):
        for item in self.scene.items():
            if item.isWidget() and type(item.widget()) == ParaButton:
                item.widget().reset()            

    def clearButtons(self):
        items = self.scene.items()
        num_items = len(items)
        i = 0
        while i < num_items:
            item = items[i]
            if item.isWidget() and type(item.widget()) == ParaButton:
                self.scene.removeItem(item)
                item.widget().deleteLater()
                item.widget().setParent(None)
            i += 1

        self.scene.clear()

    def update(self, num_paras):
        xpos = 0

        self.clearButtons()

        for i in range(num_paras):

            pbutton = ParaButton(str(i+1), i,
                                 app_win=self.app_win,
                                 controller=self.controller)

            pbutton.setStyleSheet("background-color: " + views.default_vis_background_color + ";" + \
                                         "font-size: {}pt;".format(round(self.font_size)) + \
                                             "color: "+ views.default_text_color + ";")

            pbutton.setMaximumWidth(PARA_BUTTON_WD)
            pbutton.setMaximumHeight(PARA_BUTTON_HT)
            t = self.scene.addWidget(pbutton, Qt.Widget)
            t.setPos(xpos, 0)
            pbutton.clicked.connect(pbutton.processClicked)
            xpos += (PARA_BUTTON_WD + PARA_BUTTON_GAP)

        xpos += PARA_BUTTON_WD*10
        self.setFixedWidth(xpos)

######################################################################
#
# Sentence Buttons
#
######################################################################

class SentButton(QPushButton):
    """
    Buttons used to highlight paragraphs in the text view.
    """
    def __init__(self, label, sent_id, para_id, sent_pos,
                 container=None, app_win=None, controller=None, parent=None):
        super(SentButton, self).__init__(label, parent)

        self.para_id    = para_id
        self.sent_id    = sent_id
        self.sent_pos   = sent_pos
        self.app_win    = app_win
        self.controller = controller
        self.container  = container
        self.selected   = False
        self.font_size = views.default_ui_font_size * 0.6

    def getPos(self):
        return self.sent_pos

    def processClicked(self, is_selected):
        if self.selected == False:
            self.controller.setSelectedSentence(para_id=self.para_id, 
                                                sent_id=self.sent_id, 
                                                sent_pos=self.sent_pos)

            self.setStyleSheet("background-color: " + views.default_ui_selected_color + ";" \
                                      "font-size: {}pt;".format(round(self.font_size)) + \
                                          "color: "+ views.default_text_color + ";")
            self.selected = True

        else:
            # ask the controller to unselect the currently selected sentence            
            self.controller.unselectSentence(para_id=self.para_id, 
                                             sent_id=self.sent_id, 
                                             sent_pos=self.sent_pos) 
            self.reset()

        self.repaint()

    def reset(self):
        self.setStyleSheet("background-color: " + views.default_vis_background_color + ";" + \
                                  "font-size: {}pt;".format(round(self.font_size)) + \
                                      "color: "+ views.default_text_color + ";")
        self.selected = False

    def highlight(self):
        self.setStyleSheet("background-color: " + views.default_ui_selected_color + ";" \
                                  "font-size: {}pt;".format(round(self.font_size)) + \
                                      "color: "+ views.default_text_color + ";")

class SentButtonsView(QGraphicsView):

    def __init__(self, app_win=None, parent=None):
        super(SentButtonsView, self).__init__(parent)

        self.app_win = app_win
        self.controller = None

        self.selected_sentences = []

        self.setAlignment(Qt.AlignVCenter|Qt.AlignLeft)
        self.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform);
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setStyleSheet("SentButtonsView {border: 0px; padding-top: 5px}")
        self.setFixedHeight(topicview.CONTROL_HT)

        self.scene = QGraphicsScene()
        self.setScene(self.scene)
        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))
        self.font_size = views.default_ui_font_size * 0.6

    def setController(self, c):
        self.controller = c

    def setSelectedSentences(self, sentences):
        self.selected_sentences = sentences
        selected_positions = [t[2] for t in sentences]
        for item in self.scene.items():
            if item.isWidget() and type(item.widget()) == SentButton:
                if item.widget().getPos() in selected_positions:
                    item.widget().highlight()
                else:
                    item.widget().reset()

    def unselectButtons(self):
        for item in self.scene.items():
            if item.isWidget() and type(item.widget()) == SentButton:
                item.widget().reset()            

    def clearButtons(self):
        items = self.scene.items()
        num_items = len(items)
        i = 0
        while i < num_items:
            item = items[i]
            if item.isWidget() and type(item.widget()) == SentButton:
                self.scene.removeItem(item)
                item.widget().deleteLater()
                item.widget().setParent(None)
            i += 1

        self.scene.clear()

    def update(self, sent_buttons_data):
        if sent_buttons_data is None:
            self.clearButtons()
            return

        xpos = 0
        for t in sent_buttons_data:
            if t is None:
                continue

            sent_id  = t[0]  # position within the paragraph
            para_id  = t[1]  
            sent_pos = t[2]  # position within the selected paragraphs
            sbutton = SentButton(str(sent_id+1), sent_id, para_id, sent_pos,
                                 container=self,
                                 app_win=self.app_win,
                                 controller=self.controller)

            sbutton.setStyleSheet("background-color:" + views.default_vis_background_color + ";" + \
                                         "font-size: {}pt;".format(round(self.font_size)) + \
                                             "color: "+ views.default_text_color + ";")

            sbutton.setMaximumWidth(SENT_BUTTON_WD)
            sbutton.setMaximumHeight(SENT_BUTTON_HT)
            t = self.scene.addWidget(sbutton, Qt.Widget)
            t.setPos(xpos, 0)
            sbutton.clicked.connect(sbutton.processClicked)
            xpos += (SENT_BUTTON_WD + SENT_BUTTON_GAP)

        self.setFixedWidth(xpos)

    def buttonToggled(self, button, checked):
        if checked == False:
            button.unselected()
        else:
            button.selected()





