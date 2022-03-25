#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
    These classes are used to visualize topics and docuscope categories.
    
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
import dslib.views.report as report
import dslib.views.organization as organization
import dslib.views.dialogs   as dialogs
import dslib.models.document as ds_doc
import dslib.models.stat as ds_stat
import dslib.utils as utils

from dslib.views.utils import is_skip, truncate_label

import pprint
pp = pprint.PrettyPrinter(indent=4)

# Measurements
CONTROL_HT         = 25
TOPIC_HT           = 30
TOPIC_DOT_SIZE     = 15

CATEGORY_HT        = 25
CATEGORY_LABEL_WD  = 240
CATEGORY_GAP       = 5
CATEGORY_DOT_SIZE  = 4

BINARY_DOT_SIZE    = 14

ignored_categories = ['SyntacticComplexity', 'Orphaned', 'Other']

######################################################################
#
# class TopicLabelView(QFrame):                   
#     class TopicLabel(QPushButton):              
#
#     class DSClusterLabelsView(QScrollArea):     
#         class ClusterLabel(QPushButton):        
#
#     class DSDimensionLabelsView(QScrollArea):   
#         class DimensionLabel(QPushButton):      
#
######################################################################

class TopicLabelView(QFrame):
    def __init__(self, topic_info, topic_data, sent_stats, para_stats, panel_view,
                 para_data, adj_stats,
                 is_global=True, view_type=None,
                 topic_plot_view=None,
                 is_topic_cluster=False,
                 app_win=None, controller=None, parent=None):

        super(TopicLabelView, self).__init__(parent)

        self.app_win     = app_win
        self.controller  = controller
        self.topic_info  = topic_info    
        self.topic_data  = topic_data
        self.is_global   = is_global
        self.view_type   = view_type
        self.topic_plot_view  = topic_plot_view
        self.panel_view  = panel_view
        self.para_data   = para_data
        self.adj_stats   = adj_stats
        self.is_topic_cluster = is_topic_cluster

        self.ds_cluster_labels = None
        self.ds_dim_labels     = None

        self.is_selected           = False
        self.is_in_process         = False
        self.expand_button_pressed = False

        if topic_info is None:
            self.setFixedHeight(4)
        else:            
            self.setFixedHeight(TOPIC_HT)

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        # Main Layout
        layout = QVBoxLayout()
        layout.setContentsMargins(0,0,0,CATEGORY_GAP)
        layout.setSpacing(CATEGORY_GAP)
        self.setLayout(layout)

        self.setStyleSheet("TopicLabelView {background-color: " + views.default_vis_background_color + ";" + \
                                           "border: 0;" + \
                                           "border-right: 1px solid " + views.default_ui_border_color + ";" + \
                                           "border-top: 1px solid " + views.default_ui_border_color + ";}")

        topic = None
        if topic_info is not None:
            topic = topic_info[ds_doc.LEMMA]

            # TOPIC LABEL
            if para_stats is not None: # Global
                self.label = TopicLabel(topic, sent_stats.get(topic), para_stats.get(topic),
                                        is_global=self.is_global, view_type=self.view_type,
                                        is_topic_cluster=is_topic_cluster,
                                        app_win=self.app_win, controller=self.controller, container=self)
            # else:  # Local
            elif sent_stats is not None: # Local
                self.label = TopicLabel(topic, sent_stats.get(topic), None,
                                        is_global=self.is_global, view_type=self.view_type,
                                        is_topic_cluster=is_topic_cluster,
                                        app_win=self.app_win, controller=self.controller, container=self)
            else:
                return

            layout.addWidget(self.label)
    
            if para_stats is not None: # Global
                self.ds_cluster_labels = DSClusterLabelsView(self.adj_stats, topic_plot_view, self, app_win=self.app_win, controller=self.controller)
                self.topic_plot_view.setDSClusterLabelsView(self.ds_cluster_labels)
                layout.addWidget(self.ds_cluster_labels)
                self.ds_cluster_labels.hide()

                self.ds_dim_labels = DSDimensionLabelsView(self.adj_stats, topic_plot_view, self, app_win=self.app_win, controller=self.controller)
                self.topic_plot_view.setDSDimensionLabelsView(self.ds_dim_labels)
                layout.addWidget(self.ds_dim_labels)
                self.ds_dim_labels.hide()
            else:
                self.ds_cluster_labels = None
                self.ds_dim_labels = None

    def clearDSSelections(self, cluster, dimension):
        if self.ds_cluster_labels is not None and self.ds_cluster_labels.isVisible():
            self.ds_cluster_labels.clearSelection(cluster)

        elif self.ds_dim_labels is not None:
            self.ds_dim_labels.clearSelection(cluster, dimension)


    def lemma(self):
        return self.topic_info[ds_doc.LEMMA]

    def isSelected(self):
        return self.is_selected

    def isGlobal(self):
        return self.is_global

    def collapse(self):
        if self.ds_cluster_labels is not None and self.ds_cluster_labels.isVisible():
            self.ds_cluster_labels.hide()
            self.ds_cluster_labels.unselect()
            self.controller.setSelectedDSCategory(None, None, None)
            self.setFixedHeight(TOPIC_HT)
            self.label.resetExpandButton()

        elif self.ds_dim_labels is not None and self.ds_dim_labels.isVisible():
            self.ds_dim_labels.hide()
            self.ds_dim_labels.unselect()
            self.controller.setSelectedDSCategory(None, None, None)
            self.setFixedHeight(TOPIC_HT)
            self.label.resetExpandButton()

    def toggleDSDataPressed(self):
        self.expand_button_pressed = True   

    def toggleDSData(self, val):
        # Expand or Contract the Experience panel under the topic row.
        if val == True:  # open
            res = self.topic_plot_view.toggleDSData(val)
            if res:
                if self.ds_cluster_labels is not None:
                    self.ds_cluster_labels.show()
                self.setFixedHeight(TOPIC_HT + 3 + CATEGORY_GAP + (CATEGORY_HT+CATEGORY_GAP)*3)
            else:
                topic = self.topic_info[ds_doc.LEMMA]                 
                topic = topic.replace('_', ' ')
                dialogs.WarningDialog("No Collocations for \u201C{}\u201D".format(topic),
                          "This topic cluster (\u201C{}\u201C) has no collocations with impression categoreis. ".format(topic) + \
                          "None of the words/phrases associated with this topic cluster are found in this text.")

        else:                             # close
            self.topic_plot_view.toggleDSData(val)
            if self.ds_cluster_labels is not None:
                self.ds_cluster_labels.hide()
                self.ds_cluster_labels.unselect()

            if self.ds_dim_labels is not None:
                self.ds_dim_labels.hide()
                self.ds_dim_labels.unselect()

            self.controller.setSelectedDSCategory(None, None, None)
            self.setFixedHeight(TOPIC_HT)
    
    def showDimensions(self, cluster, is_cluster_selected):
        self.ds_cluster_labels.hide()                   
        self.ds_cluster_labels.unselect()   

        self.ds_dim_labels.setCluster(cluster, is_cluster_selected)
        self.ds_dim_labels.setVerticalScrollValue(0)
        self.ds_dim_labels.show()

    def hideDimensions(self, cluster, is_selected):
        self.ds_dim_labels.hide()                        # we'll hide the dimension buttons
        self.ds_dim_labels.unselect()

        self.ds_cluster_labels.show()                    # we'll show the cluster buttons
        self.ds_cluster_labels.scrollToCluster(cluster, is_selected)  # it'll be done by the topic_view_plot...

    def processClicked(self):

        if self.is_selected:
            self.unselect()
        else:
            self.select()

        self.topic_plot_view.processClicked(select_label=False)

    def select(self):
        self.is_selected = True
        self.label.select()

    def unselect(self):
        self.is_selected = False
        self.label.unselect()

    def clickACluster(self, cluster):
        if self.ds_cluster_labels is None:
            return

        self.ds_cluster_labels.show()
        res = False
        if self.ds_cluster_labels.isClusterIncluded(cluster):
            self.ds_cluster_labels.scrollToCluster(cluster, False)
            res = self.ds_cluster_labels.processClicked(cluster)
        return res


class TopicLabel(QFrame):
    """
    Cluster buttons used in the temporal view
    """
    def __init__(self, topic, sent_stats, para_stats, is_global=True, view_type=None, is_topic_cluster=False,
                 app_win=None, controller=None, container=None, parent=None):
        super(TopicLabel, self).__init__(parent)

        self.topic       = topic
        self.app_win     = app_win
        self.controller  = controller
        self.is_selected = False
        self.container   = container
        self.is_global   = is_global
        self.view_type   = view_type
        self.sent_stats  = sent_stats
        self.para_stats  = para_stats
        self.is_topic_cluster = is_topic_cluster

        self.anim_timer  = None


        font_size = views.default_ui_font_size
        
        self.setFixedHeight(TOPIC_HT)
        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        self.setStyleSheet("QFrame {background: transparent;" + \
                                   "border: none;" + \
                                   "border-right: 1px solid "  + views.default_ui_border_color + ";" + \
                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}")

        layout = QHBoxLayout()
        layout.setContentsMargins(0,0,0,0)
        layout.setSpacing(0)
        self.setLayout(layout)

        #
        # Label/button
        #

        temp_button = QPushButton(topic)
        font = temp_button.font()
        font.setBold(True)
        font.setPointSizeF(views.default_ui_font_size)        
        fmetrics = QFontMetrics(font)

        label = truncate_label(topic.replace('_', ' '), fmetrics, organization.LEFT_COLUMN_WIDTH - 26)
        self.button = QPushButton(label)
        self.button.setFlat(True)
        self.button.setFixedHeight(TOPIC_HT)
        self.button.clicked.connect(self.processClicked)
        self.button.pressed.connect(self.mousePressed)
        self.button.setToolTip(topic.replace('_', ' '))                            

        if is_topic_cluster:
            text_decoration = 'underline'
        else:
            text_decoration = 'none'        

        if is_global:
            self.button.setStyleSheet("QPushButton {font-weight: bold; color:" + views.global_topic_color + ";" + \
                                                   "font-size: {}pt;".format(round(font_size)) + \
                                                   "text-decoration: " + text_decoration + ";" + \
                                                   "background: transparent;" + \
                                                   "padding: 4px; padding-left: 8px; text-align: left;" + \
                                                   "border: none;" + \
                                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}" + \
                              "QPushButton:pressed {background-color: " + views.topic_pressed_color + ";" + \
                                                   "border: none;" + \
                                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}" + \
                                        "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                   "color: " + views.default_ui_text_color + ";" + \
                                                   "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                   "}")

        else: # loal only topic
            self.button.setStyleSheet("QPushButton {font-weight: bold; color: " + views.local_topic_color + ";" + \
                                                   "font-size: {}pt;".format(round(font_size)) + \
                                                   "text-decoration: " + text_decoration + ";" + \
                                                   "background: transparent;" + \
                                                   "padding: 4px; padding-left: 8px; text-align: left;" + \
                                                   "border: none;" + \
                                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}" + \
                              "QPushButton:pressed {background-color: " + views.topic_pressed_color + ";" + \
                                                   "border: none;" + \
                                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}" + \
                                        "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                   "color: " + views.default_ui_text_color + ";" + \
                                                   "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                   "}")
        layout.addWidget(self.button)

        #
        # info button
        #
        self.fade_in_anim_info = None
        if self.view_type == views.GLOBAL_VIEW:
            self.info_button = QToolButton(parent=self)
            icon = QIcon()
            icon.addPixmap(QPixmap(utils.resource_path('data/icons/info_icon.png')), QIcon.Normal, QIcon.Off)
            self.info_button.setIcon(icon)
            self.info_button.setCheckable(True)
            self.info_button.setFixedSize(15,15)
            self.info_button.setStyleSheet("QToolButton {background: transparent; border: none; padding-top: 0px;}")
            self.info_button.clicked.connect(self.showInfo)
            layout.addWidget(self.info_button)

            self.installEventFilter(self)

            self.eff_info = QGraphicsOpacityEffect(self)
            self.eff_info.setOpacity(0.0)

            self.fade_in_anim_info = QPropertyAnimation(self.eff_info, b"opacity")
            self.fade_in_anim_info.setDuration(600)
            self.fade_in_anim_info.setEndValue(1.0)
            self.fade_in_anim_info.setEasingCurve(QEasingCurve.OutQuad)

            self.info_button.setGraphicsEffect(self.eff_info)
            
            if self.controller.isTopicDetailsOn() == False:
                self.info_button.hide()

        #
        # expectations button
        #
        self.fade_in_anim_expectation = None
        if self.view_type == views.GLOBAL_VIEW and self.controller.isExpectationsPanel():
            
            self.expectations_button = QToolButton(parent=self)
            icon = QIcon()
            icon.addPixmap(QPixmap(utils.resource_path('data/icons/expectation_icon.png')), QIcon.Normal, QIcon.Off)
            self.expectations_button.setIcon(icon)
            self.expectations_button.setCheckable(True)
            self.expectations_button.setFixedSize(15,15)
            self.expectations_button.setStyleSheet("QToolButton {background: transparent; border: none; padding-top: 0px;}")
            self.expectations_button.clicked.connect(lambda state, arg=topic: self.controller.openRuleDescriptionDialog(arg))
            layout.addWidget(self.expectations_button)

            self.installEventFilter(self)

            self.eff_expectations = QGraphicsOpacityEffect(self)
            self.eff_expectations.setOpacity(0.0)

            self.fade_in_anim_expectation = QPropertyAnimation(self.eff_expectations, b"opacity")
            self.fade_in_anim_expectation.setDuration(600)
            self.fade_in_anim_expectation.setEndValue(1.0)
            self.fade_in_anim_expectation.setEasingCurve(QEasingCurve.OutQuad)

            self.expectations_button.setGraphicsEffect(self.eff_expectations)

        layout.addStretch()

        #
        # expand button
        #
        if self.view_type == views.GLOBAL_VIEW and self.controller.isCollocation():
            self.expand_button = QToolButton()
            icon = QIcon()

            if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
                down_icon_path = 'data/icons/down_icon.png'
                up_icon_path = 'data/icons/up_icon.png'
            else:
                down_icon_path = 'data/icons/down_dark_icon.png'
                up_icon_path = 'data/icons/up_dark_icon.png'

            icon.addPixmap(QPixmap(utils.resource_path(down_icon_path)), QIcon.Normal, QIcon.Off)
            icon.addPixmap(QPixmap(utils.resource_path(up_icon_path)), QIcon.Normal, QIcon.On)
            self.expand_button.setIcon(icon)
            self.expand_button.setCheckable(True)
            self.expand_button.setFixedSize(12,12)
            self.expand_button.setStyleSheet("QToolButton {background: transparent; border: none; border-radius: 4px;}" + \
                                     "QToolButton:hover   {background-color: " + views.default_ui_input_background_color + ";"  + \
                                                          "border: none;}" + \
                                     "QToolButton:pressed {background-color: " + views.default_ui_selected_color + ";"  + \
                                                          "border: none;}")

            self.expand_button.clicked.connect(self.container.toggleDSData)
            self.expand_button.pressed.connect(self.container.toggleDSDataPressed)

            layout.addWidget(self.expand_button)
            self.expand_button.hide()

            layout.addSpacing(15)
            # self.expand_button = None
        else:
            self.expand_button = None

    def fade_in_help(self):
        if self.fade_in_anim_info is not None:
            self.fade_in_anim_info.start()
        if self.fade_in_anim_expectation is not None:            
            self.fade_in_anim_expectation.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(250)

        elif event.type() == QEvent.Leave and self.anim_timer is not None:
            if self.anim_timer.timerId() >= 0:
                self.anim_timer.stop()

            if self.fade_in_anim_info is not None:
                self.fade_in_anim_info.stop()
                self.eff_info.setOpacity(0.0)
                
            if self.fade_in_anim_expectation is not None:            
                self.fade_in_anim_expectation.stop()
                self.eff_expectations.setOpacity(0.0)

        return super().eventFilter(object, event)

    def showInfo(self):
        html_str = self.generateInfoContent(self.sent_stats, self.para_stats)
        pos = self.mapToGlobal(self.info_button.pos())
        pos += QPoint(0,10)
        self.controller.showTopicInfo(html_str, self.topic.replace('_', ' '), views.global_title_bg_color, 
                                                            views.default_ui_text_color, pos)
                                                            # views.global_topic_color, pos)

    def resetExpandButton(self):
        if self.expand_button is not None:
            self.expand_button.setChecked(False)

    def mousePressEvent(self, event):
        self.mousePressed()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        super().mouseReleaseEvent(event)
        self.processClicked()

    def mousePressed(self):
        self.setStyleSheet("QWidget {background-color: " + views.topic_pressed_color + ";" + \
                                                          "border: none;" + \
                                                          "border-right: 1px solid " + views.default_ui_border_color + ";" + \
                                                          "border-bottom: 1px solid " + views.default_ui_border_color + ";}")
    def processClicked(self):

        if self.is_selected:
            self.unselect()
        else:
            self.select()

        self.container.processClicked()

    def lemma(self):
        return self.topic

    def select(self):
        self.is_selected = True
        self.highlight()
        if self.expand_button is not None:
            self.expand_button.show()

    def unselect(self):
        self.is_selected = False
        self.unhighlight()
        if self.expand_button is not None:
            self.expand_button.hide()
        self.container.toggleDSData(False)
        if self.expand_button is not None and self.expand_button.isChecked():
            self.expand_button.setChecked(False)

    def highlight(self):
        self.setStyleSheet("QFrame {background-color: " + views.topic_highlight_color + ";" + \
                                   "border: none;" + \
                                   "border-right: 1px solid " + views.default_ui_border_color + ";" + \
                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}")
    def unhighlight(self):
        self.setStyleSheet("QFrame {background-color: " + views.default_vis_background_color + ";" + \
                                   "border: none;" + \
                                   "border-right: 1px solid " + views.default_ui_border_color + ";" + \
                                   "border-bottom: 1px solid " + views.default_ui_border_color + ";}")
                 
    def generateInfoContent(self, sent_stats, para_stats):

        html_str = ""

        if sent_stats is not None and para_stats is not None:  

            # Paragraph Level Counts
            para_count     = para_stats['para_count']         # total # of paragraphs

            p_count          = para_stats['count']            # total # of paragraphs that include the topic
            p_coverage       = para_stats['coverage']

            p_left_count     = para_stats['left_count']
            p_left_coverage  = para_stats['left_coverage']

            p_right_count    = para_stats['right_count']
            p_right_coverage = 100 * (p_right_count / para_count)

            p_span           = para_stats['span']
            p_l_span         = para_stats['left_span']

            # Sentence Level Counts...
            sent_count      = sent_stats['sent_count']

            s_count         = sent_stats['count']    # given count
            s_coverage      = sent_stats['coverage']

            s_left_count    = sent_stats['left_count']
            s_left_coverage = sent_stats['left_coverage']

            s_right_count   = sent_stats['right_count']
            s_right_coverage= 100 * (s_right_count / sent_count)

            s_span          = sent_stats['span']
            s_l_span        = sent_stats['left_span']

            tip_template = "<p style=\"font-size: " + str(views.default_ui_font_size) + "pt;\">" + \
            "<table cellspacing='0'>" + \
            "<tr><td><b>Total Paragraphs:&nbsp;&nbsp;&nbsp;</b></td><td>{} ({:.2f}%)</td></tr>" + \
            "<tr><td>Left:              </td><td>{} ({:.2f}%)</td></tr>" + \
            "<tr><td>Right:             </td><td>{} ({:.2f}%)</td></tr>" + \
            "<tr><td>Span (L):          </td><td>{:.2f}%</td></tr>" + \
            "<tr><td>Span (L+R):        </td><td>{:.2f}%</td></tr>" + \
            "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>" + \
            "<tr><td><b>Total Sentences:&nbsp;&nbsp;&nbsp;</b></td><td>{} ({:.2f}%)</td></tr>" + \
            "<tr><td>Left:              </td><td>{} ({:.2f}%)</td></tr>" + \
            "<tr><td>Right:             </td><td>{} ({:.2f}%)</td></tr>" + \
            "<tr><td>Span (L):          </td><td>{:.2f}%</td></tr>" + \
            "<tr><td>Span (L+R):        </td><td>{:.2f}%</td></tr>" + \
            "</table></p>"

            html_str += tip_template.format(p_count, p_coverage,                 # p count (coverage)
                                            p_left_count,  p_left_coverage,      # p left (coverage)
                                            p_right_count, p_right_coverage,     # p right (coverage)
                                            p_l_span,
                                            p_span,
                                            s_count, s_coverage,
                                            s_left_count,  s_left_coverage,
                                            s_right_count, s_right_coverage,
                                            s_l_span,
                                            s_span)
        return html_str

class DSClusterLabelsView(QScrollArea):
    def __init__(self, adj_stats, topic_plot_view, topic_label_view, app_win=None, controller=None, parent=None):
        super(DSClusterLabelsView, self).__init__(parent)

        self.app_win          = app_win
        self.controller       = controller
        self.adj_stats        = adj_stats
        self.topic_plot_view  = topic_plot_view
        self.topic_label_view = topic_label_view

        self.cluster_buttons  = None
        self.selected_cluster = None

        self.no_scroll_propagation = False

        self.is_in_process = False

        # Setup the base scrollable container
        self.container_layout = QVBoxLayout()
        self.container_layout.setContentsMargins(0,CATEGORY_GAP,0,CATEGORY_GAP)
        self.container_layout.setSpacing(CATEGORY_GAP)

        container = QWidget()
        container.setLayout(self.container_layout)
        container.setStyleSheet("background: transparent;")

        self.setWidget(container)       
        self.setWidgetResizable(True)
        self.setAlignment(Qt.AlignLeft)
        self.setViewportMargins(0,0,0,0)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setStyleSheet("QScrollArea {background transparent; border: 0;}")

        # self.setFixedHeight((CATEGORY_HT + CATEGORY_GAP)*3) # 5/15
        self.setFixedHeight(CATEGORY_GAP + (CATEGORY_HT+CATEGORY_GAP)*3)
        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)
        self.v_scroll_bar = self.verticalScrollBar()
        self.v_scroll_bar.valueChanged.connect(self.labelScrollBarChanged)

        if self.adj_stats is not None:
            clust_counter, dim_counter, lat_counter = self.adj_stats.getStats(-1)

            self.cluster_buttons = dict()

            button_pos = 0
            for t in clust_counter.most_common():            # for each cluster
                clust = t[0]
                total_count = t[1]
                if clust not in ignored_categories:          # if 'clust' is not in the ignored cluster list
                    label  = ClusterLabel(clust, total_count, topic_plot_view, topic_label_view,
                                          container=self, 
                                          app_win=self.app_win, controller=self.controller)

                    self.cluster_buttons[clust] = (label, button_pos)
                    self.container_layout.addWidget(label)
                    button_pos += 1

        self.container_layout.addStretch()

    def isClusterIncluded(self, cluster):
        t = self.cluster_buttons.get(cluster, None)
        if t is None:
            return False
        else:
            return True

    def clearSelection(self, cluster):
        if self.is_in_process:
            return

        t = self.cluster_buttons.get(cluster, None)
        if t is not None:
            label = t[0]
            label.unselect()

        self.current_cluster = None
        self.selected_cluster = None

    def labelScrollBarChanged(self, val):
        if self.no_scroll_propagation == False:
            self.topic_plot_view.setVerticalScrollValue(val)

    def setVerticalScrollValue(self, val):
        self.v_scroll_bar.setValue(val)

    def scrollToCluster(self, cluster, is_selected):
        self.no_scroll_propagation = True

        t = self.cluster_buttons.get(cluster, None)
        if t is not None:
            label = t[0]
            if is_selected:
                label.select()
                self.selected_cluster = cluster
            else:
                label.unselect()
                self.selected_cluster = None

            button_pos = t[1]
            v_offset = (CATEGORY_HT+CATEGORY_GAP) * button_pos
            self.setVerticalScrollValue(v_offset)
        else:
            self.selected_cluster = None

        self.no_scroll_propagation = False

    def processClicked(self, cluster, is_header=False):

        self.is_in_process = True

        if self.selected_cluster is not None:
            # unhighlight/select the cluster that is currently selected/highlighted
            t = self.cluster_buttons.get(self.selected_cluster, None)
            if t is not None:
                prev_button = t[0]
                prev_button.unselect()
            self.controller.setSelectedDSCategory(None, None, None, panel='topics')

        res = True

        if self.selected_cluster != cluster:
            # highlight the selected cluster, and ask the controller to propagate the cluster selection action.
            self.selected_cluster = cluster
            t = self.cluster_buttons.get(cluster, None)
            if t is not None:
                button = t[0]
                button.select()
            else:
                res = False
            self.controller.setSelectedDSCategory(cluster,
                                         None,
                                         None,
                                         cluster_changed=False,
                                         refresh_editor=True)
        elif self.selected_cluster == cluster:
            self.selected_cluster = None
        else:
            self.selected_cluster = None
            res = False

        self.is_in_process = False

        return res

    def setSelectedCluster(self, cluster):
        self.selected_cluster = cluster

    def unselect(self):
        if self.selected_cluster is not None:
            t = self.cluster_buttons.get(self.selected_cluster, None)
            if t is not None:
                button = t[0]
                # button.unhighlight()
                button.unselect()
            self.selected_cluster = None

CLUSTER_BUTTON_STYLE_NORMAL   = "QPushButton {font-weight: bold; color:" + views.ds_text_label_color + ";" + \
                                                "background: transparent;" + \
                                             "border-radius: 4px;" + \
                                                   "padding: 0px;" + \
                                             "padding-right: 4px;" + \
                                                "text-align: left;" + \
                                                    "border: none;}" + \
                               "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                     "color: " + views.default_ui_text_color + ";" + \
                                                    "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                    "}"

CLUSTER_BUTTON_STYLE_SELECTED = "QPushButton {font-weight: bold; color:" + views.ds_text_label_highlight_color + ";" + \
                                                "background: transparent;" + \
                                             "border-radius: 4px;" + \
                                                   "padding: 0px;" + \
                                             "padding-right: 4px;" + \
                                                "text-align: left;" + \
                                                    "border: none;}" + \
                               "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                     "color: " + views.default_ui_text_color + ";" + \
                                                    "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                    "}"

DIMENSION_BUTTON_STYLE_NORMAL   = "QPushButton {font-weight: normal; color:" + views.ds_text_label_color + ";" + \
                                                "background: transparent;" + \
                                             "border-radius: 4px;" + \
                                                   "padding: 4px;" + \
                                              "padding-left: 18px;" + \
                                                "text-align: left;" + \
                                                    "border: none;}" + \
                               "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                     "color: " + views.default_ui_text_color + ";" + \
                                                    "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                    "}"

DIMENSION_BUTTON_STYLE_SELECTED = "QPushButton {font-weight: normal; color:" + views.ds_text_label_highlight_color + ";" + \
                                                "background: transparent;" + \
                                             "border-radius: 4px;" + \
                                                   "padding: 4px;" + \
                                              "padding-left: 18px;" + \
                                                "text-align: left;" + \
                                                    "border: none;}" + \
                               "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                                     "color: " + views.default_ui_text_color + ";" + \
                                                    "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                    "}"

class ClusterLabel(QFrame):
    """
    Cluster buttons used in the temporal view
    """

    def __init__(self, cluster, count, topic_plot_view, topic_label_view, is_header=False, container=None, app_win=None, controller=None, parent=None):
        super(ClusterLabel, self).__init__(parent)

        self.cluster     = cluster
        self.app_win     = app_win
        self.controller  = controller
        self.container   = container
        self.is_selected = False
        self.count       = count
        self.topic_plot_view  = topic_plot_view
        self.topic_label_view = topic_label_view
        self.is_header   = is_header
        self.anim_timer  = None

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        clust_label = self.controller.getClusterLabel(cluster)

        temp_button = QPushButton(cluster)
        font = temp_button.font()
        font.setBold(True)
        font.setPointSizeF(views.default_ui_font_size)        
        fmetrics = QFontMetrics(font)

        layout = QHBoxLayout()
        layout.setContentsMargins(6,0,0,0)
        layout.setSpacing(0)
        self.setLayout(layout)

        if platform.system() == 'Windows':
            label = truncate_label(clust_label, fmetrics, CATEGORY_LABEL_WD-(36+layout.spacing()))
        else:
            label = truncate_label(clust_label, fmetrics, CATEGORY_LABEL_WD-(12+layout.spacing()))

        self.setStyleSheet("ClusterLabel {background: transparent; " + \
                                             "border: none; border-right: 1px solid " + views.default_ui_border_color + ";}")

        #
        # expand button
        #
        self.expand_button = QToolButton()
        icon = QIcon()

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            expand_icon_path = 'data/icons/expand_icon.png'
            collapse_icon_path = 'data/icons/collapse_icon.png'
        else:
            expand_icon_path = 'data/icons/expand_dark_icon.png'
            collapse_icon_path = 'data/icons/collapse_dark_icon.png'

        icon.addPixmap(QPixmap(utils.resource_path(expand_icon_path)), QIcon.Normal, QIcon.Off)
        icon.addPixmap(QPixmap(utils.resource_path(collapse_icon_path)), QIcon.Normal, QIcon.On)
        self.expand_button.setIcon(icon)
        self.expand_button.setCheckable(True)
        self.expand_button.setFixedSize(12,12)
        self.expand_button.setStyleSheet("QToolButton {background: transparent; border: none;}")

        self.expand_button.clicked.connect(self.toggleDimension)

        if self.is_header:
            self.expand_button.setChecked(True)

        layout.addWidget(self.expand_button)

        #
        # Create a push button for the cluster
        #
        self.button = QPushButton(label)
        self.button.setStyleSheet(CLUSTER_BUTTON_STYLE_NORMAL)
        self.button.setFlat(True)
        self.button.setFixedHeight(CATEGORY_HT)
        self.button.setToolTip(clust_label)
        self.button.clicked.connect(self.processClicked)
        self.button.pressed.connect(self.mousePressed)

        layout.addWidget(self.button)

        #
        self.help_button = QToolButton()
        icon = QIcon()
        icon.addPixmap(QPixmap(utils.resource_path('data/icons/help_icon.png')), QIcon.Normal, QIcon.Off)
        self.help_button.setIcon(icon)
        self.help_button.setCheckable(True)
        self.help_button.setFixedSize(15,15)
        self.help_button.setStyleSheet("QToolButton {background: transparent; border: none; padding-top: 2px;}")
        self.help_button.clicked.connect(self.showHelp)
        layout.addWidget(self.help_button)

        self.installEventFilter(self)

        self.eff = QGraphicsOpacityEffect(self)
        self.eff.setOpacity(0.0)

        self.fade_in_anim = QPropertyAnimation(self.eff, b"opacity")
        self.fade_in_anim.setDuration(600)
        self.fade_in_anim.setEndValue(1.0)
        self.fade_in_anim.setEasingCurve(QEasingCurve.OutQuad)

        self.help_button.setGraphicsEffect(self.eff)

        #
        # count
        #
        layout.addStretch()

        self.count_box = QLabel("({})".format(count))
        self.count_box.setStyleSheet("color: " + views.default_ui_text_color + "; background: transparent;")
        layout.addWidget(self.count_box)

        layout.addSpacing(5)

        self.setMouseTracking(True)

    def getName(self):
        return self.cluster

    def fade_in_help(self):
        self.fade_in_anim.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            # self.anim_timer.setInterval(750)
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(250)

        elif event.type() == QEvent.Leave and self.anim_timer is not None:
            if self.anim_timer.timerId() >= 0:
                self.anim_timer.stop()
            self.fade_in_anim.stop()
            self.eff.setOpacity(0.0)

        return super().eventFilter(object, event)

    def showHelp(self):
        self.controller.showDSHelp('CLUSTER', self.cluster, self.mapToGlobal(self.help_button.pos()))

    def getClusterName(self):
        return self.cluster

    def toggleDimension(self, val):
        if self.is_header:
            self.topic_label_view.hideDimensions(self.cluster, self.is_selected)
            self.topic_plot_view.hideDimensions(self.cluster)
        else:
            self.expand_button.setChecked(False)
            self.topic_label_view.showDimensions(self.cluster, self.is_selected)
            self.topic_plot_view.showDimensions(self.cluster)

    def mousePressed(self):
        if self.is_selected == False:
            self.setStyleSheet("ClusterLabel {background-color: " + views.ds_cluster_highlight_color + ";" + \
                                                       "border: none;}")

            self.button.setStyleSheet(CLUSTER_BUTTON_STYLE_SELECTED)
            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background: transparent;")

        else:
            self.setStyleSheet("ClusterLabel {background-color: " + views.ds_cluster_highlight_color + ";" + \
                                                       "border: none;}")
            self.button.setStyleSheet(CLUSTER_BUTTON_STYLE_SELECTED)
            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background: transparent;")

    def mousePressEvent(self, event):
        self.mousePressed()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        if event.modifiers() & Qt.ShiftModifier:
            self.controller.setShiftKeyPressed(True)

        self.processClicked()

        self.controller.setShiftKeyPressed(False)

        super().mouseReleaseEvent(event)

    def isSelected(self):
        return self.is_selected

    def processClicked(self):
        res = self.container.processClicked(self.cluster, is_header=self.is_header)

        if self.is_header and res:
            if self.is_selected:
               self.unselect()
            else:
               self.select()

    def select(self):
        self.is_selected = True
        self.highlight()

    def unselect(self):
        self.is_selected = False
        self.unhighlight()

    def highlight(self):
        self.setStyleSheet("ClusterLabel {background-color: " + views.ds_cluster_highlight_color + ";" + \
                                                   "border: none;}")
        self.button.setStyleSheet(CLUSTER_BUTTON_STYLE_SELECTED)
        self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background: transparent;")

    def unhighlight(self):
        self.setStyleSheet("ClusterLabel {background: transparent;" + \
                                             "border: none;}")
        self.button.setStyleSheet(CLUSTER_BUTTON_STYLE_NORMAL)
        self.count_box.setStyleSheet("color: " + views.ds_text_label_color + "; background: transparent;")

class DSDimensionLabelsView(QScrollArea):
    def __init__(self, adj_stats, topic_plot_view, topic_label_view, app_win=None, controller=None, parent=None):
        super(DSDimensionLabelsView, self).__init__(parent)

        self.app_win      = app_win
        self.controller   = controller
        self.adj_stats    = adj_stats

        self.topic_plot_view  = topic_plot_view   # toic usage view
        self.topic_label_view = topic_label_view

        self.dimension_buttons  = None
        self.selected_dimension = None
        self.current_cluster    = None
        self.cluster_label      = None

        # Setup the base scrollable container
        self.container_layout = QVBoxLayout()
        self.container_layout.setContentsMargins(0,CATEGORY_GAP,0,CATEGORY_GAP)
        self.container_layout.setSpacing(CATEGORY_GAP)

        container = QWidget()
        container.setLayout(self.container_layout)
        container.setStyleSheet("background-color: " + views.default_vis_background_color + ";")

        self.setWidget(container)       
        self.setWidgetResizable(True)
        self.setAlignment(Qt.AlignLeft)
        self.setViewportMargins(0,0,0,0)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setStyleSheet("QScrollArea {background-color: " + views.default_vis_background_color + ";" + \
                                                  "border: none;}")

        # self.setFixedHeight((CATEGORY_HT + CATEGORY_GAP)*3) # 5/15
        self.setFixedHeight(CATEGORY_GAP + (CATEGORY_HT+CATEGORY_GAP)*3)
        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)
        self.v_scroll_bar = self.verticalScrollBar()
        self.v_scroll_bar.valueChanged.connect(self.labelScrollBarChanged)

        self.container_layout.addStretch()

    def clearSelection(self, cluster, dimension):

        if self.cluster_label is None:
            return

        # if self.current_cluster != cluster and self.cluster_label.isSelected():
        if self.cluster_label.isSelected():
            self.cluster_label.unselect()

        label = self.dimension_buttons.get(dimension, None)
        if label is not None:
            label.unselect()

        self.selected_dimension = None

    def setCluster(self, cluster, is_cluster_selected):

        self.current_cluster = cluster

        # remove the dimension labels, but don't remove the 'stretch' item
        for i in reversed(range(self.container_layout.count())):
            w = self.container_layout.itemAt(i)
            if type(w) == QWidgetItem:
                w.widget().deleteLater()
                w.widget().setParent(None)

        if self.adj_stats is not None:
            self.dimension_buttons = dict()

            clust_counter, dim_counter, lat_counter = self.adj_stats.getStats(-1)

            if dim_counter is not None:

                dimension_names = self.controller.getDimensionNames(cluster)
                ranked_dimensions = [t for t in dim_counter.most_common() if t[0] in dimension_names]

                # Add the cluster button
                total_count = clust_counter.get(cluster, -1)
                self.cluster_label  = ClusterLabel(cluster, total_count, self.topic_plot_view, self.topic_label_view,
                                      is_header=True,
                                      container=self, 
                                      app_win=self.app_win, 
                                      controller=self.controller)

                if is_cluster_selected:
                    self.cluster_label.select()

                self.dimension_buttons[cluster] = self.cluster_label
                self.container_layout.insertWidget(self.container_layout.count()-1, self.cluster_label)

                # Add dimension buttons if any
                self.dimension_buttons = dict()
                for t in ranked_dimensions:
                    dim = t[0]
                    total_count = t[1]

                    label  = DimensionLabel(dim, total_count, self.topic_plot_view, self.topic_label_view,
                                            container=self, 
                                            app_win=self.app_win, 
                                            controller=self.controller)

                    self.dimension_buttons[dim] = label
                    self.container_layout.insertWidget(self.container_layout.count()-1, label)

    def labelScrollBarChanged(self, val):
        self.topic_plot_view.setVerticalScrollValue(val)

    def setVerticalScrollValue(self, val):
        self.v_scroll_bar.setValue(val)

    def processClicked(self, category, is_header=False):

        res = True

        if is_header:
            # unselect the current selection 
            if self.selected_dimension is not None:
                prev_button = self.dimension_buttons.get(self.selected_dimension, None)
                if prev_button is not None:
                    prev_button.unhighlight()

                self.controller.setSelectedDSCategory(None, 
                                                      None, 
                                                      None,
                                                      panel='topics')

            if self.cluster_label.isSelected() == False:
                self.controller.setSelectedDSCategory(self.current_cluster,
                                                      None,
                                                      None,
                                                      cluster_changed=False,
                                                      refresh_editor=True)
            else:
                self.controller.setSelectedDSCategory(None,
                                                      None,
                                                      None,
                                                      panel='topics')
                res = False

            self.selected_dimension = None

        else:
            dimension = category
            prev_dimension = self.selected_dimension

            if self.cluster_label.isSelected():
                self.cluster_label.unselect()
                # self.controller.setSelectedDSCategory(None, None, None, panel='topics')

            if self.selected_dimension is not None:
                prev_button = self.dimension_buttons.get(self.selected_dimension, None)
                if prev_button is not None:
                    prev_button.unhighlight()
                self.controller.setSelectedDSCategory(None, 
                                                      None, 
                                                      None, 
                                                      panel='topics')

            if prev_dimension != dimension:
                self.selected_dimension = dimension
                button = self.dimension_buttons.get(dimension, None)

                if button is not None:
                    button.highlight()

                self.controller.setSelectedDSCategory(self.current_cluster,
                                                      dimension,
                                                      None,
                                                      cluster_changed=False,
                                                      refresh_editor=True)
            else:
                self.selected_dimension = None
                
        return res

    def unselect(self):
        if self.selected_dimension is not None:
            button = self.dimension_buttons.get(self.selected_dimension, None)
            if button is not None:
                # button.unhighlight()  # TESTING
                button.unselect()
            self.selected_dimension = None

class DimensionLabel(QFrame):
    """
    Cluster buttons used in the temporal view

    """
    def __init__(self, dimension, count, topic_plot_view, topic_label_view, container=None, app_win=None, controller=None, parent=None):
        super(DimensionLabel, self).__init__(parent)

        self.dimension   = dimension
        self.app_win     = app_win
        self.controller  = controller
        self.container   = container
        self.is_selected = False
        self.count       = count
        self.topic_plot_view  = topic_plot_view
        self.topic_label_view = topic_label_view
        self.anim_timer  = None

        self.setStyleSheet("DimensionLabel {background: transparent; " + \
                                             "border: none; border-right: 1px solid " + views.default_ui_border_color + ";}" + \
                        "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                              "color: " + views.default_ui_text_color + ";" + \
                                             "border: 1px solid " + views.default_ui_border_color + ";" + \
                                                "}")                      

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        dim_label = self.controller.getDimensionLabel(dimension)

        temp_button = QPushButton(dimension)
        font = temp_button.font()
        font.setPointSizeF(views.default_ui_font_size)        
        fmetrics = QFontMetrics(font)

        layout = QHBoxLayout()
        layout.setContentsMargins(0,0,0,0)
        layout.setSpacing(0)       
        self.setLayout(layout)

        if platform.system() == 'Windows':
            label = truncate_label(dim_label, fmetrics, CATEGORY_LABEL_WD-(64+layout.spacing()))
        else:
            label = truncate_label(dim_label, fmetrics, CATEGORY_LABEL_WD-(12+layout.spacing()))
        #
        # Create a push button for the cluster
        #
        self.button = QPushButton(label)
        self.button.setStyleSheet(DIMENSION_BUTTON_STYLE_NORMAL)

        self.button.setFlat(True)
        self.button.setFixedHeight(CATEGORY_HT)
        self.button.setToolTip(dim_label)
        self.button.clicked.connect(self.processClicked)
        self.button.pressed.connect(self.mousePressed)
        layout.addWidget(self.button)

        #
        # help button
        #
        self.help_button = QToolButton()
        icon = QIcon()
        icon.addPixmap(QPixmap(utils.resource_path('data/icons/help_icon.png')), QIcon.Normal, QIcon.Off)
        self.help_button.setIcon(icon)
        self.help_button.setCheckable(True)
        self.help_button.setFixedSize(15,15)
        self.help_button.setStyleSheet("QToolButton {background-color: transparent; border: none; padding-top: 2px;}")
        self.help_button.clicked.connect(self.showHelp)
        layout.addWidget(self.help_button)

        self.installEventFilter(self)

        self.eff = QGraphicsOpacityEffect(self)
        self.eff.setOpacity(0.0)

        self.fade_in_anim = QPropertyAnimation(self.eff, b"opacity")
        self.fade_in_anim.setDuration(600)
        self.fade_in_anim.setEndValue(1.0)
        self.fade_in_anim.setEasingCurve(QEasingCurve.OutQuad)

        self.help_button.setGraphicsEffect(self.eff)

        # count
        layout.addStretch()

        self.count_box = QLabel("({})".format(count))
        self.count_box.setStyleSheet("color: " + views.default_ui_text_color + "; background-color: transparent;")
        layout.addWidget(self.count_box)

        layout.addSpacing(5)

    def fade_in_help(self):
        self.fade_in_anim.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(250)

        elif event.type() == QEvent.Leave and self.anim_timer is not None:
            if self.anim_timer.timerId() >= 0:
                self.anim_timer.stop()
            self.fade_in_anim.stop()
            self.eff.setOpacity(0.0)

        return super().eventFilter(object, event)

    def showHelp(self):
        self.controller.showDSHelp('DIMENSION', self.dimension, self.mapToGlobal(self.help_button.pos()))

    def getDimensionName(self):
        return self.dimension

    def mousePressed(self):
        if self.is_selected == False:
            self.setStyleSheet("DimensionLabel {background-color: " + views.ds_dimension_highlight_color + ";}")
            self.button.setStyleSheet(DIMENSION_BUTTON_STYLE_SELECTED)
            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background-color: transparent;")

        else:
            self.setStyleSheet("DimensionLabel {background-color: " + views.ds_dimension_highlight_color + ";" + \
                                                         "border: 0px solid #fff;}")
            self.button.setStyleSheet(DIMENSION_BUTTON_STYLE_SELECTED)
            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background-color: transparent;")

    def mousePressEvent(self, event):
        self.mousePressed()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        self.processClicked()
        super().mouseReleaseEvent(event)

    def processClicked(self):
        if self.is_selected:
            self.unselect()
        else:
            self.select()

        self.container.processClicked(self.dimension)

    def unselect(self):
        self.is_selected = False
        self.unhighlight()

    def select(self):
        self.is_selected = True
        self.highlight()

    def highlight(self):
        self.setStyleSheet("DimensionLabel {background-color: " + views.ds_dimension_highlight_color + ";" + \
                                                     "border: 0px solid #fff;}")

        self.button.setStyleSheet(DIMENSION_BUTTON_STYLE_SELECTED)
        self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background-color: transparent;")

    def unhighlight(self):
        self.setStyleSheet("DimensionLabel {background-color: transparent;" + \
                                                     "border: 0px solid #fff;}")

        self.button.setStyleSheet(DIMENSION_BUTTON_STYLE_NORMAL)
        self.count_box.setStyleSheet("color: " + views.ds_text_label_color + "; background-color: transparent;")


######################################################################
#
# class TopicPlotView(QFrame):                   
#     class TopicPlot(QGraphicsView):            
#         class TopicDot(QGraphicsEllipseItem):   
#
#     class DSTemporalView(QGraphicsView):       
#         class ParaPoint(QGraphicsEllipseItem): 
#
######################################################################

class ParaPoint(QGraphicsEllipseItem):
    # def __init__(self, info, category_name, topic_filter=False, controller=None, parent=None):
    #     super(ParaPoint, self).__init__(info[0], parent)
    #     self.setPen(info[1])
    #     self.setBrush(info[2])
    #     self.setZValue(100)
    #     self.info = info

    #     self.html_str      = ''
    #     self.controller    = controller
    #     self.category_name = category_name
    #     self.topic_fitler  = topic_filter   # True if it is a data point filtered by a topic.

    #     self.hover_pen     = QPen(info[1])
    #     self.hover_pen.setWidthF(4.0)
    #     self.setAcceptHoverEvents(True)

    # def setHtml(self, html_str):
    #     self.html_str = html_str

    # def hoverEnterEvent(self, event):
    #     self.setPen(self.hover_pen)
    #     self.setBrush(self.info[2])

    # def hoverLeaveEvent(self, event):
    #     self.setPen(self.info[1])
    #     self.setBrush(self.info[2])

    # def mousePressEvent(self, event):
    #     pass

    # def mouseReleaseEvent(self, event):
    #     if self.html_str:
    #         pos = event.screenPos()
    #         self.controller.showTopicInfo(self.html_str, self.category_name, views.ds_cluster_highlight_color, "#000", pos)

    def __init__(self, info, category_name, controller=None, parent=None):
        super(ParaPoint, self).__init__(info[0], parent)
        self.setPen(info[1])
        self.setBrush(info[2])
        self.setZValue(100)

        self.info = info
        self.controller    = controller
        self.category_name = category_name

        self.hover_pen   = QPen(info[1])
        self.hover_pen.setWidthF(4.0)
        self.setAcceptHoverEvents(True)

        if info[3] is None:
            count = 0
        else:
            count = info[3]

        if count <= 1:
            self.html_str = u"\u00B6{}: <b>{}</b> pattern".format(info[4], count)
        else:
            self.html_str = u"\u00B6{}: <b>{}</b> patterns".format(info[4], count)

    def hoverEnterEvent(self, event):
        self.setPen(self.hover_pen)
        self.setBrush(self.info[2])

    def hoverLeaveEvent(self, event):
        self.setPen(self.info[1])
        self.setBrush(self.info[2])

    def mousePressEvent(self, event):
        pass

    def mouseReleaseEvent(self, event):
        pos = event.screenPos()
        y = pos.y() - 15
        self.controller.showDSCount(self.html_str, QPoint(pos.x(), y))


class TopicSentDot(QGraphicsEllipseItem):
    def __init__(self, rect, colors, parent=None):
        super(TopicSentDot, self).__init__(rect, parent)
        self.setPen(colors[0])
        self.setBrush(colors[1])
        self.colors = colors

class TopicDot(QGraphicsEllipseItem):
    def __init__(self, rect, colors, parent=None):
        super(TopicDot, self).__init__(rect, parent)
        self.setPen(colors[0])
        self.setBrush(colors[1])
        self.colors = colors

class TopicPlotView(QFrame):
    def __init__(self, topic_info, topic_data, sent_stats, para_stats, panel_view,
                 para_data, adj_stats,
                 is_global=True, view_type=None, is_non_local=False,
                 app_win=None, controller=None, parent=None):

        super(TopicPlotView, self).__init__(parent)    

        self.app_win     = app_win
        self.controller  = controller
        self.topic_info  = topic_info    
        self.topic_data  = topic_data
        self.is_global   = is_global
        self.view_type   = view_type
        self.panel_view  = panel_view
        self.para_data   = para_data
        self.adj_stats   = adj_stats

        self.scroll_container = None

        self.visible_width = -1
        self.panel_scrollbar_visible = False
        self.no_scroll_propagation = False

        self.is_selected = False

        self.ds_cluster_labels   = None
        self.ds_dimension_labels = None

        if topic_info is None:
            self.setFixedHeight(4)
        else:            
            self.setFixedHeight(TOPIC_HT)

        layout = QVBoxLayout()
        layout.setContentsMargins(0,0,0,0)
        layout.setSpacing(0)
        self.setLayout(layout)

        self.setStyleSheet("TopicPlotView {background-color: " + views.default_vis_background_color + ";" + \
                                           "border: 0;" + \
                                           "border-top: 1px solid " + views.default_ui_border_color + ";}")

        if topic_info is not None:

            self.topic_plot = TopicPlot(topic_info, topic_data, sent_stats, para_stats, self, para_data, adj_stats, 
                                        is_global=is_global, view_type=view_type, is_non_local=is_non_local,
                                        app_win=app_win, controller=controller, parent=parent)

            layout.addWidget(self.topic_plot)
            layout.addSpacing(2)


            topic = topic_info[ds_doc.LEMMA]

            # Scroll Area for the DS temporal views
            scroll_layout = QVBoxLayout()
            scroll_layout.setContentsMargins(0,0,0,0)
            scroll_layout.setSpacing(0)
            scroll_layout.setAlignment(Qt.AlignTop | Qt.AlignLeft)

            self.scroll_container = QWidget()
            self.scroll_container.setLayout(scroll_layout)
            self.scroll_container.setStyleSheet("QWidget {background-color: " + views.default_vis_background_color + ";" + \
                                                                   "border: 0;}")

            self.ds_scroll_area = QScrollArea()
            self.ds_scroll_area.setWidget(self.scroll_container)
            self.ds_scroll_area.setWidgetResizable(True)
            self.ds_scroll_area.setAlignment(Qt.AlignLeft)
            self.ds_scroll_area.setViewportMargins(0,0,0,0)
            self.ds_scroll_area.setStyleSheet("QScrollArea {border: 0;}")
            self.ds_scroll_area.setFixedHeight(CATEGORY_GAP + (CATEGORY_HT+CATEGORY_GAP)*3)
            self.ds_scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)

            self.ds_temporalview = DSTemporalView(self.para_data, self.adj_stats, [topic],
                                                  is_global=self.is_global, view_type=self.view_type,
                                                  app_win=self.app_win, controller=self.controller)

            self.ds_v_scroll_bar = self.ds_scroll_area.verticalScrollBar()
            self.ds_v_scroll_bar.valueChanged.connect(self.dsVScrollBarChanged)

            scroll_layout.addWidget(self.ds_temporalview)

            layout.addWidget(self.ds_scroll_area)

            h_bar_height = qApp.style().pixelMetric(QStyle.PM_ScrollBarExtent)  
            layout.addSpacing(h_bar_height)

            self.ds_scroll_area.hide()
        # else:
            # h_bar_height = qApp.style().pixelMetric(QStyle.PM_ScrollBarExtent)  
            # layout.addSpacing(h_bar_height)       
            # self.setFixedHeight(4 + h_bar_height)

    def setVerticalScrollValue(self, val):
        self.ds_v_scroll_bar.setValue(val)

    def getDSTemporalView(self):
        return self.ds_temporalview

    def setTopicLabelView(self, label_view):
        self.topic_label = label_view

    def setDSClusterLabelsView(self, view):
        self.ds_cluster_labels = view

    def setDSDimensionLabelsView(self, view):
        self.ds_dimension_labels = view

    def dsVScrollBarChanged(self, val):
        if self.no_scroll_propagation:
            return

        if self.ds_cluster_labels is not None and self.ds_cluster_labels.isVisible():
            self.ds_cluster_labels.setVerticalScrollValue(val)
        elif self.ds_dimension_labels is not None and self.ds_dimension_labels.isVisible():
            self.ds_dimension_labels.setVerticalScrollValue(val)

    def collapse(self):
        if self.ds_cluster_labels is not None:
            self.ds_cluster_labels.unselect()
        self.ds_scroll_area.hide()
        self.setFixedHeight(TOPIC_HT)        

    def toggleDSData(self, val):
        ret = True
        if val == True:                   # open
            if self.adj_stats is not None:
                self.setFixedHeight(TOPIC_HT + 3 + CATEGORY_GAP + (CATEGORY_HT + CATEGORY_GAP)*3)
                ht = self.ds_temporalview.update()
                self.scroll_container.setFixedHeight(ht)
                self.ds_scroll_area.show()
            else:
                ret = False
        else:                             # close
            if self.ds_cluster_labels is not None:
                self.ds_cluster_labels.unselect()
            self.ds_scroll_area.hide()
            self.setFixedHeight(TOPIC_HT)
            ret = True

        return ret

    def showDimensions(self, cluster): 
        ht = self.ds_temporalview.showDimensions(cluster)
        self.scroll_container.setFixedHeight(ht)

        self.no_scroll_propagation = True
        self.setVerticalScrollValue(0)
        self.no_scroll_propagation = False

    def hideDimensions(self, cluster):
        ht = self.ds_temporalview.hideDimensions(cluster)
        self.scroll_container.setFixedHeight(ht)
        self.scrollToCluster(cluster)

    def scrollToCluster(self, cluster):
        self.no_scroll_propagation = True

        clust_pos = self.ds_temporalview.getClusterPosition(cluster)
        v_offset = (CATEGORY_HT+CATEGORY_GAP) * clust_pos

        self.setVerticalScrollValue(v_offset)

        self.no_scroll_propagation = False

    def resizeDSTemporalView(self, width):
        if self.visible_width != width:
            self.ds_temporalview.setContainerWidth(width)
            self.ds_scroll_area.setFixedWidth(width)
            self.visible_width = width

    def offsetDSTemporalView(self, hoffset):
        width = self.visible_width + hoffset
        self.ds_temporalview.setContainerWidth(width)
        self.ds_scroll_area.setFixedWidth(width)

    def setController(self, c):
        self.controller = c

    def setAdjacencyStats(self, adj_stats):
        self.adj_stats = adj_stats
        self.ds_temporalview.setAdjacencyStats(adj_stats)

    def isSelected(self):
        return self.is_selected

    def isGlobal(self):
        return self.is_global

    def isEmpty(self):
        if self.topic_info is None:
            return True
        else:
            return False

    def lemma(self):
        return self.topic_info[ds_doc.LEMMA]

    # def unselect(self):
    #     self.is_selected = False
    #     self.controller.unselectTopic(self.topic_info)
    #     self.unhighlight()        

    def processClicked(self, select_label=True):

        if self.is_selected:
            self.is_selected = False
            self.controller.unselectTopic(self.topic_info, 
                                          is_global=self.is_global, 
                                          view_type=self.view_type)
            self.topic_plot.unhighlight()
            self.topic_label.unselect()

        else:  # not selected
            self.controller.setSelectedTopic(self.topic_info,
                                             is_global=self.is_global, 
                                             view_type=self.view_type)
            self.is_selected = True
            self.topic_plot.highlight()
            if select_label:
                self.topic_label.select()

    def update(self, selected_paragraphs=[], selected_sentences=[]):
        self.topic_plot.update(selected_paragraphs, selected_sentences)

    def redrawGraphs(self):
        if self.ds_scroll_area.isVisible():
            self.ds_temporalview.update()

    def select(self):
        self.is_selected = True
        self.highlight()

    def unselect(self):
        self.is_selected = False
        self.unhighlight()

    def unhighlight(self):
        self.topic_plot.unhighlight()

    def highlight(self):
        self.topic_plot.highlight()

class TopicPlot(QGraphicsView):
    def __init__(self, topic_info, topic_data, sent_stats, para_stats, topic_plot_view,
                 para_data, adj_stats,
                 is_global=True, view_type=None, is_non_local=False,
                 app_win=None, controller=None, parent=None):
        super(TopicPlot, self).__init__(parent)

        self.app_win      = app_win
        self.controller   = controller
        self.topic_info   = topic_info    
        self.topic_data   = topic_data
        self.topic_label  = None
        self.is_global    = is_global
        self.is_non_local = is_non_local
        self.view_type    = view_type
        self.is_selected  = False
        self.para_data    = para_data
        self.adj_stats    = adj_stats
        self.topic_plot_view  = topic_plot_view

        self.ds_cluster_labels       = None

        self.expand_button_pressed   = False
        self.category_button_pressed = False
        self.scrollbar_pressed       = False

        # font_scale     = self.app_win.getFontScale()

        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        self.setAlignment(Qt.AlignTop|Qt.AlignLeft)
        self.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform);
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setStyleSheet("TopicPlot {background-color: " + views.default_vis_background_color + ";" + \
                                      "border: 0;" + \
                                      "border-bottom: 1px solid " + views.default_ui_border_color + ";}")

        if topic_info is None:
            self.setFixedHeight(4)
        else:            
            self.setFixedHeight(TOPIC_HT)

        self.scene = QGraphicsScene()
        self.setScene(self.scene)
        # self.scene.setBackgroundBrush(Qt.white);
        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))

    def mousePressedEvent(self, event):
        self.highlight()

    def mouseReleaseEvent(self, event):
        self.topic_plot_view.processClicked()

    def clearPlots(self):
        items = self.scene.items()
        num_items = len(items)
        i = 0
        while i < num_items:
            item = items[i]
            if item.isWidget():
                pass
            else:
                self.scene.removeItem(item)
            i += 1

    def update(self, selected_paragraphs=[], selected_sentences=[]):

        if self.topic_info is None:
            return

        self.clearPlots()

        topic_sent_option = self.controller.getTopicSentOption()

        if self.is_global:
            topic_color         = views.global_topic_color
            topic_color_a       = views.global_topic_color_a
            topic_pressed_color = views.global_topic_pressed_color
        else:
            topic_color         = views.local_topic_color
            topic_color_a       = views.local_topic_color_a
            topic_pressed_color = views.local_topic_pressed_color

        pen_topic           = QPen(QColor(topic_color))
        pen_topic.setWidthF(0.5)

        pen_topic_faded     = QPen(QColor(topic_color_a))
        pen_topic_faded.setWidthF(0.5)

        pen_topic_pressed   = QPen(QColor(topic_pressed_color))
        pen_topic_pressed.setWidthF(0.5)

        brush_topic         = QBrush(QColor(topic_color))
        brush_topic_faded   = QBrush(QColor(topic_color_a))
        brush_topic_pressed = QBrush(QColor(topic_pressed_color))

        brush_clear         = QBrush(Qt.transparent)        

        xpos = (organization.PARA_BUTTON_WD/2) - TOPIC_DOT_SIZE/2

        if selected_paragraphs:
            b_opaque_label = False
        else:
            if selected_sentences:
                b_opaque_label = False
            else:
                b_opaque_label = True 

        selected_sent_positions = [t[2]+1 for t in selected_sentences]

        count =  1
        for d in self.topic_data:
            if d is not None:

                t = d['topic']

                if self.is_non_local:
                    size = TOPIC_DOT_SIZE-5
                    ypos = TOPIC_HT/2.0 - size/2.0                                        
                    r = QRectF(xpos, ypos, size, size)
                else:
                    ypos = TOPIC_HT/2.0 - TOPIC_DOT_SIZE/2.0                    
                    r = QRectF(xpos, ypos, TOPIC_DOT_SIZE, TOPIC_DOT_SIZE)                

                sent_id = t[ds_doc.SENT_POS]

                if selected_paragraphs:  # global topic view
                    if count in selected_paragraphs:
                        b_opaque_label = True
                        if t[ds_doc.ISLEFT]:
                            colors = (pen_topic, brush_topic, pen_topic_pressed, brush_topic_pressed)
                        else:
                            colors = (pen_topic, brush_clear, pen_topic_pressed, brush_clear)
                    else:
                        if t[ds_doc.ISLEFT]:
                            colors = (pen_topic_faded, brush_topic_faded, pen_topic_pressed, brush_topic_pressed)
                        else: 
                            colors = (pen_topic_faded, brush_clear, pen_topic, brush_clear) 

                else: # local topic view
                    if selected_sentences:
                        # if count == (selected_sentence[2]+1): # loal w/ a sentence selection Index = 2 = Positio
                        if count in selected_sent_positions:
                            # loal w/ a sentence selection Index = 2 = Position
                            b_opaque_label = True
                            if t[ds_doc.ISLEFT]:
                                colors = (pen_topic, brush_topic, pen_topic_pressed, brush_topic_pressed)
                            else: 
                                colors = (pen_topic, brush_clear, pen_topic_pressed, brush_clear)
                        else: # local w/ no sentence selection
                            if t[ds_doc.ISLEFT]:
                                colors = (pen_topic_faded, brush_topic_faded, pen_topic_pressed, brush_topic_pressed)
                            else: 
                                colors = (pen_topic_faded, brush_clear, pen_topic, brush_clear) 

                    else: # global w/ no paragraph selections
                        if t[ds_doc.ISLEFT]:
                            colors = (pen_topic, brush_topic, pen_topic_pressed, brush_topic_pressed)
                        else: 
                            colors = (pen_topic, brush_clear, pen_topic_pressed, brush_clear)

                dot = TopicDot(r, colors)
                self.scene.addItem(dot)

                if sent_id <= topic_sent_option:
                    if t[ds_doc.ISLEFT]:
                        dot_colors = (pen_topic, brush_topic, pen_topic_pressed, brush_topic_pressed)                        
                        ts_r = QRectF(xpos-1, ypos-1, 3, 3)
                        ts_dot = TopicSentDot(ts_r, colors)
                        self.scene.addItem(ts_dot)
                    else:
                        dot_colors = (pen_topic_faded, brush_topic_faded, pen_topic_faded, brush_topic_faded)
                        ts_r = QRectF(xpos-1, ypos-1, 3, 3)
                        ts_dot = TopicSentDot(ts_r, dot_colors)
                        self.scene.addItem(ts_dot)                    

            xpos += organization.PARA_BUTTON_WD + organization.PARA_BUTTON_GAP 
            count += 1

        if b_opaque_label:
            if self.is_global:
                text_color = views.global_topic_color
            else:
                text_color = views.local_topic_color
        else:
            if self.is_global:
                text_color = views.global_topic_color_a
            else:
                text_color = views.local_topic_color_a

        self.setSceneRect(0.0,0.0,xpos,TOPIC_HT)

        if self.is_selected:
            self.highlight()

    def highlight(self):
        self.scene.setBackgroundBrush(QBrush(QColor(views.topic_highlight_color)))

    def unhighlight(self):
        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))
        # self.scene.setBackgroundBrush(Qt.white)


# utility function
def format_tooltip(ranked_topics, topics, category_name, p_id, graphing_option):
    tr_template_bold = "<tr><td style=\"color: " + views.global_topic_color + "; font-weight: bold;\">{}</td>" + \
                           "<td align=\"center\" style=\"color: " + views.global_topic_color + "; font-weight: bold;\">{}</td>" + \
                       "</tr>"

    tr_template_normal = "<tr><td>{}</td>" + \
                             "<td align=\"center\">{}</td>" + \
                         "</tr>"

    tooltip_str = "<p>Ranking of the topics collocated with <b>{}</b> in Paragraph {}</p>".format(category_name, p_id)

    if ranked_topics:
        table = "<p><table>\n"
        table += "<tr><td style=\"border-bottom: 1px solid #ddd\"><b>Topic</b></td>" + \
                 "<td align=\"center\" style=\"border-bottom: 1px solid #ddd\"><b>Collocate Count</b></td></tr>\n"

        is_curr_cluster_included = False
        total = 0
        for info in ranked_topics:
            # info[0] is the value
            # info[1] is the topic
            if info[0] == 0 and info[1] != topics[0]:
                continue

            topic_str = info[1]
            val_str = str(info[0])

            if info[1] == topics[0]:
                table += tr_template_bold.format(topic_str, val_str)
                is_curr_cluster_included = True
            else:
                table += tr_template_normal.format(topic_str, val_str)

            total += info[0]

        if is_curr_cluster_included != True:
            table += tr_template_bold.format(topics[0], "n/a")

        table += "</table>"

        if total > 0:
            tooltip_str += table
            tooltip_str += "<p style=\"color: " + views.default_ui_text_color + "\">The right column shows the total number of patterns in"

            tooltip_str += " <b>{}</b> that are collocated with the topics in <b>Paragraph {}</b>.".format(category_name, p_id)

            tooltip_str += "</p>"
        else:
            tooltip_str +=  "<p style=\"color: " + views.default_ui_text_color + "\">No topics are collocated with <b>{}</b> in <b>Paragraph {}</b></p>".format(category_name, p_id)
    else:
        tooltip_str +=  "<p style=\"color: " + views.default_ui_text_color +  "\">No topics are collocated with <b>{}</b> in <b>Paragraph {}</b></p>".format(category_name, p_id)

    return tooltip_str


class DSTemporalView(QGraphicsView):
    """
    """
    # Filter
    COUNT     = 0
    FREQUENCY = 1
    LOG       = 2
    BINARY    = 3

    def __init__(self, para_data, adj_stats, topics,
                 is_global=True, view_type=None,
                 app_win=None, controller=None, parent=None):

        super(DSTemporalView, self).__init__(parent)

        self.app_win     = app_win
        self.controller  = controller

        self.para_data   = para_data
        self.adj_stats   = adj_stats
        self.topics      = topics
        self.axes        = []

        self.container_width  = -1
        self.current_cluster = None
        self.ranked_clusters = []
        self.mouse_pressed = False
        self.is_dimension_visble = False

        self.setStyleSheet("DSTemporalView {background-color: " + views.default_vis_background_color + ";" + \
                                                     "border: 0px; padding: 0px; margin: 0px;}")

        self.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform);

        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)

        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        self.scene = QGraphicsScene()
        self.setScene(self.scene)
        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))

    def setAdjacencyStats(self, adj_stats):
        self.adj_stats = adj_stats

    def setContainerWidth(self, width):
        if self.container_width != width:
            self.container_width = width 

            pen_very_light = QPen(QColor(222,222,222))
            pen_very_light.setWidthF(0.5)

            lines = list()

            yunit   = CATEGORY_HT + CATEGORY_GAP
            yoffset = CATEGORY_GAP
            yorig   = yoffset + CATEGORY_HT

            for axis in self.axes:
                self.scene.removeItem(axis)
                l = QLineF(0, yorig, width, yorig)
                axis = self.scene.addLine(l, pen_very_light)
                yorig += yunit
                lines.append(axis)

            self.axes = lines

    def showDimensions(self, cluster):
        self.is_dimension_visble = True
        self.current_cluster = cluster
        return self.update(cluster=cluster)

    def hideDimensions(self, cluster):
        self.is_dimension_visble = False
        self.current_cluster = None
        return self.update()

    def update(self, cluster=None):

        if self.is_dimension_visble and cluster is not None:
            ht = self.drawAClusterWithDimensions(cluster)
        elif self.is_dimension_visble and self.current_cluster is not None:
            ht = self.drawAClusterWithDimensions(self.current_cluster)
        else:
            ht = self.drawClusters()

        return ht

    def getClusterPosition(self, cluster):
        if cluster in self.ranked_clusters:
            return self.ranked_clusters.index(cluster)
        else:
            return 0

    def drawClusters(self):

        if self.adj_stats is not None:

            graphing_option = self.controller.getGraphingOption()

            freq_method = ds_stat.DSStat.DOC
            if graphing_option == DSTemporalView.LOG:
                freq_method = ds_stat.DSStat.LOG

            self.scene.clear()
            self.axes = list()
            clust_counter, dim_counter, lat_counter = self.adj_stats.getStats(-1)

            # set up visual variables
            # ------------------------------
            pen_clust = QPen(QColor(views.ds_cluster_graph_color))
            pen_clust.setWidthF(1.0)
            brush_clust = QBrush(QColor(views.ds_cluster_graph_color))

            pen_topic = QPen(QColor(views.ds_cluster_graph_color))
            pen_topic.setWidthF(1.15)
            brush_topic = QBrush(QColor(views.ds_cluster_graph_color))

            pen_axis = QPen(QColor(222,222,222))
            pen_axis.setWidthF(0.5)

            brush_white = QBrush(QColor(255,255,255))
            brush_clear = QBrush(Qt.transparent)

            vgap    = CATEGORY_GAP
            xunit   = organization.PARA_BUTTON_WD + organization.PARA_BUTTON_GAP
            yunit   = CATEGORY_HT + CATEGORY_GAP
            ymax_ht = CATEGORY_HT

            # ------------------------------
            # Find the max cluster count.
            # ------------------------------
            max_ccount = 0
            max_cfreq  = 0.0
            max_cfreqs  = dict()
            max_ccounts = dict()

            self.ranked_clusters = list()

            for t in clust_counter.most_common():            # for each cluster

                clust = t[0]
                if clust not in ignored_categories:          # if 'clust' is not in the ignored cluster list
                    self.ranked_clusters.append(clust)

                    for i in range(len(self.para_data)):     # for each paragraph
                        stats = self.para_data[i]
                        count = stats.getClusterCount(clust)
                        freq  = stats.getClusterFreq(clust, method=freq_method)
                        if count is not None:
                            if count > max_ccounts.get(clust, 0):
                                max_ccounts[clust] = count
                            if freq > max_cfreqs.get(clust, 0):
                                max_cfreqs[clust] = freq

                            if count > max_ccount:
                                max_ccount = count
                            if freq > max_cfreq:
                                max_cfreq = freq

            xoffset = organization.PARA_BUTTON_WD/2
            yoffset = CATEGORY_GAP

            num_paras = len(self.para_data)

            yorig = yoffset + CATEGORY_HT

            # Create path for drowing the main graph
            path = QPainterPath()
            path.moveTo(xoffset, yorig)

            # Create path for drowing the graph for the selected topic
            tpath = QPainterPath()
            tpath.moveTo(xoffset, yorig)

            line_wd = (num_paras-1) * xunit

            if line_wd < self.container_width:
                line_wd = self.container_width

            num_clusters = 0

            for t in clust_counter.most_common():            # for each cluster
                clust = t[0]
                total_count = t[1]

                if clust not in ignored_categories:          # if 'clust' is not in the ignored cluster list

                    xpos = xoffset
                    ypos = yorig

                    num_clusters += 1

                    l = QLineF(0, ypos, xoffset+line_wd, ypos)
                    self.axes.append(self.scene.addLine(l, pen_axis))

                    a_dots = list()
                    dots   = list()

                    if graphing_option == DSTemporalView.COUNT:

                        max_ccount = max_ccounts[clust]

                        for pcount in range(len(self.para_data)):     # for each paragraph
                            stats = self.para_data[pcount]
                            cc = stats.getClusterCount(clust) # get the count

                            # Count for the entire documnt (all topics)
                            ht = 0
                            if cc is not None and max_ccount > 0:
                                ht = ymax_ht * cc/max_ccount 
                            ypos = yorig - ht

                            if xpos > xoffset:
                                path.lineTo(xpos, ypos)
                            else:
                                path.moveTo(xpos, ypos)

                            r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                                       CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                            dots.append((r, pen_clust, brush_clust))

                            # Just for this topics
                            a_cc = self.adj_stats.getParaClusterCount(clust, pcount+1)

                            a_ht = 0
                            if a_cc is not None and max_ccount > 0:
                                a_ht = ymax_ht * a_cc/max_ccount 

                            a_ypos = yorig - a_ht

                            if xpos > xoffset:
                                tpath.lineTo(xpos, a_ypos)
                            else:
                                tpath.moveTo(xpos, a_ypos)

                            r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                                       CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                            if a_ht > 0:
                                a_dots.append((r, pen_topic, brush_topic, a_cc, pcount+1))
                            elif a_cc is None:    # gray + white
                                a_dots.append((r, pen_topic, brush_white, None, pcount+1))
                            elif a_cc == 0:       # blue
                                a_dots.append((r, pen_topic, brush_topic, 0, pcount+1))

                            xpos += xunit

                    elif graphing_option == DSTemporalView.BINARY:

                        max_ccount = max_ccounts[clust]

                        for pcount in range(len(self.para_data)):     # for each paragraph
                            stats = self.para_data[pcount]
                            cc = stats.getClusterCount(clust) # get the count

                            # if cc is not None and cc > 0:
                                # ypos = yorig - ymax_ht
                            # else:
                                # ypos = yorig

                            ypos = yorig-ymax_ht/2.0

                            # if xpos > xoffset:
                                # path.lineTo(xpos, ypos)
                            # else:
                                # path.moveTo(xpos, ypos)

                            # r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                                       # CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                            r = QRectF(xpos-BINARY_DOT_SIZE/2.0, ypos-BINARY_DOT_SIZE/2.0, 
                                       BINARY_DOT_SIZE, BINARY_DOT_SIZE)
                            dots.append((r, pen_clust, brush_clust))

                            # Just for this topics
                            a_cc = self.adj_stats.getParaClusterCount(clust, pcount+1)

                            # if a_cc is not None and a_cc > 0:
                                # a_ypos = yorig - ymax_ht
                            # else:
                                # a_ypos = yorig

                            a_ypos = yorig-ymax_ht/2.0

                            # if xpos > xoffset:
                                # tpath.lineTo(xpos, a_ypos)
                            # else:
                                # tpath.moveTo(xpos, a_ypos)

                            # r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                                       # CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                            r = QRectF(xpos-BINARY_DOT_SIZE/2.0, a_ypos-BINARY_DOT_SIZE/2.0, 
                                       BINARY_DOT_SIZE, BINARY_DOT_SIZE)                            
                            # if a_cc is None:    # gray + white
                            if a_cc is None or a_cc == 0:
                                # a_dots.append((r, pen_topic, brush_white))
                                pass
                            else:
                                a_dots.append((r, pen_topic, brush_topic, a_cc, pcount+1))

                            xpos += xunit

                    else:
                        max_cfreq = max_cfreqs[clust]
    
                        for pcount in range(len(self.para_data)):     # for each paragraph
                            stats = self.para_data[pcount]
                            cf = stats.getClusterFreq(clust, freq_method)         # get the cluster frequency (cf)

                            ht = 0
                            if cf is not None and max_cfreq > 0:
                                ht = ymax_ht * cf/max_cfreq
                            ypos = yorig - ht

                            if xpos > xoffset:
                                path.lineTo(xpos, ypos)
                            else:
                                path.moveTo(xpos, ypos)

                            r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                                       CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                            dots.append((r, pen_clust, brush_clust))

                            # Just for this topic
                            a_cf = self.adj_stats.getParaClusterFreq(clust, pcount+1, freq_method)

                            a_ht = 0
                            if a_cf is not None and max_cfreq > 0:
                                a_ht = ymax_ht * a_cf/max_cfreq 

                            a_ypos = yorig - a_ht

                            if xpos > xoffset:
                                tpath.lineTo(xpos, a_ypos)
                            else:
                                tpath.moveTo(xpos, a_ypos)

                            r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                                       CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                            if a_ht > 0:
                                a_dots.append((r, pen_topic, brush_topic, a_cf, pcount+1))
                            elif a_cf is None:    
                                a_dots.append((r, pen_topic, brush_white, None, pcount+1))
                            elif a_cf == 0:       # blue
                                a_dots.append((r, pen_topic, brush_topic, 0, pcount+1))

                            xpos += xunit

                    # COMMENTED OUT FOR NOW. We may recover this as an option.
                    # self.scene.addPath(path,  pen_clust, brush_clear)
                    self.scene.addPath(tpath, pen_topic, brush_clear)

                    # COMMENTED OUT FOR NOW. We may recover this as an option.
                    # for i in range(len(dots)):
                    #     pcount = i+1
                    #     info = dots[i]
                    #     point = ParaPoint(info, clust, controller=self.controller)
                    #     ranked_topics = self.controller.getRankedTopics(clust, pcount)
                    #     if ranked_topics is not None:
                    #        point.setHtml(format_tooltip(ranked_topics, self.topics, clust, pcount, graphing_option))
                    #     self.scene.addItem(point)

                    for i in range(len(a_dots)):
                        pcount = i+1
                        a_info = a_dots[i]
                        a_point = ParaPoint(a_info, clust, controller=self.controller)
                        # ranked_topics = self.controller.getRankedTopics(clust, pcount)
                        # if ranked_topics is not None:
                           # a_point.setHtml(format_tooltip(ranked_topics, self.topics, clust, pcount, graphing_option))
                        # a_point.setHtml("{} pattern(s)".format(a_info[3]))
                        self.scene.addItem(a_point)

                    yorig += yunit
                # each cluster

            ht = (num_clusters * (CATEGORY_GAP + CATEGORY_HT)) + CATEGORY_GAP*2
            self.setFixedHeight(ht)
            self.setSceneRect(0.0,0.0,xoffset+line_wd,ht)

            return ht

        return -1

    def drawAClusterWithDimensions(self, cluster):

        tr_template_bold = "<tr><td style=\"color: #0059ed; font-weight: bold;\">{}</td>" + \
                               "<td align=\"center\" style=\"color: #0059ed; font-weight: bold;\">{}</td>" + \
                           "</tr>"

        tr_template_normal = "<tr><td>{}</td>" + \
                                 "<td align=\"center\">{}</td>" + \
                             "</tr>"

        graphing_option = self.controller.getGraphingOption()

        if self.adj_stats is not None:

            self.scene.clear()
            self.axes = list()

            clust_counter, dim_counter, lat_counter = self.adj_stats.getStats(-1)

            freq_method = ds_stat.DSStat.DOC
            if graphing_option == DSTemporalView.LOG:
                freq_method = ds_stat.DSStat.LOG

            pen_topic = QPen(QColor(views.ds_cluster_graph_color))
            pen_topic.setWidthF(1.15)
            brush_topic = QBrush(QColor(views.ds_cluster_graph_color))

            pen_dim_topic = QPen(QColor(views.ds_cluster_graph_color))
            pen_dim_topic.setWidthF(0.80)
            brush_dim_topic = QBrush(QColor(views.ds_cluster_graph_color))

            pen_clust = QPen(QColor(views.ds_cluster_graph_color))
            pen_clust.setWidthF(1.0)
            brush_clust = QBrush(QColor(views.ds_cluster_graph_color))

            pen_light = QPen(QColor(222,222,222))
            pen_light.setWidthF(0.5)

            brush_white = QBrush(QColor(255,255,255))
            brush_clear = QBrush(Qt.transparent)

            pen_axis = QPen(QColor(200,200,200))
            pen_axis.setWidthF(0.5)

            vgap    = CATEGORY_GAP
            xunit   = organization.PARA_BUTTON_WD + organization.PARA_BUTTON_GAP
            yunit   = CATEGORY_HT + CATEGORY_GAP
            ymax_ht = CATEGORY_HT

            xoffset = organization.PARA_BUTTON_WD/2
            yoffset = CATEGORY_GAP

            num_paras = len(self.para_data)

            yorig = yoffset + CATEGORY_HT

            # Create path for drowing the main graph
            path = QPainterPath()
            path.moveTo(xoffset, yorig)

            # Create path for drowing the graph for the selected topic
            tpath = QPainterPath()
            tpath.moveTo(xoffset, yorig)

            line_wd = (num_paras-1) * xunit

            if line_wd < self.container_width:
                line_wd = self.container_width

            dimension_names = self.controller.getDimensionNames(cluster)
            ranked_dimensions = [t for t in dim_counter.most_common() if t[0] in dimension_names]

            #
            # Cluster graph
            #

            max_ccount = 0
            max_cfreq  = 0.0

            for i in range(len(self.para_data)):     # for each paragraph
                stats = self.para_data[i]
                count = stats.getClusterCount(cluster)
                freq  = stats.getClusterFreq(cluster, method=freq_method)
                if count is not None:
                    if count > max_ccount:
                        max_ccount = count
                    if freq > max_cfreq:
                        max_cfreq = freq

            total_count = clust_counter.get(cluster, -1)

            xpos = xoffset
            ypos = yorig

            line_wd = (num_paras-1) * xunit
            if line_wd < self.container_width:
                line_wd = self.container_width

            # horizontal line/axis
            l = QLineF(0, ypos, xoffset+line_wd, ypos)
            self.axes.append(self.scene.addLine(l, pen_axis))

            a_dots = list()
            dots   = list()

            if graphing_option == DSTemporalView.COUNT:
                for pcount in range(len(self.para_data)):     # for each paragraph
                    stats = self.para_data[pcount]
                    cc = stats.getClusterCount(cluster) 

                    # Count for the entire documnt (all topics)
                    ht = 0
                    if cc is not None and max_ccount > 0:
                        ht = ymax_ht * cc/max_ccount 
                    ypos = yorig - ht

                    if xpos > xoffset:
                        path.lineTo(xpos, ypos)
                    else:
                        path.moveTo(xpos, ypos)

                    r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                               CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                    dots.append((r, pen_clust, brush_clust))  

                    # Just for this cluster
                    a_cc = self.adj_stats.getParaClusterCount(cluster, pcount+1)

                    a_ht = 0
                    if a_cc is not None and max_ccount > 0:
                        a_ht = ymax_ht * a_cc/max_ccount 

                    a_ypos = yorig - a_ht

                    if xpos > xoffset:
                        tpath.lineTo(xpos, a_ypos)
                    else:
                        tpath.moveTo(xpos, a_ypos)

                    r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                               CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                    if a_ht > 0:
                        a_dots.append((r, pen_topic, brush_topic, a_cc, pcount+1))
                    elif a_cc is None:    # gray
                        a_dots.append((r, pen_topic, brush_white, None, pcount+1))
                    elif a_cc == 0:       # blue
                        a_dots.append((r, pen_topic, brush_topic, 0, pcount+1))

                    xpos += xunit
            elif graphing_option == DSTemporalView.BINARY:

                for pcount in range(len(self.para_data)):     # for each paragraph
                    stats = self.para_data[pcount]
                    cc = stats.getClusterCount(cluster) 

                    # if cc is not None and cc > 0:
                    #     ypos = yorig - ymax_ht
                    # else:
                    #     ypos = yorig

                    # if xpos > xoffset:
                    #     path.lineTo(xpos, ypos)
                    # else:
                    #     path.moveTo(xpos, ypos)

                    ypos = yorig - ymax_ht/2.0

                    r = QRectF(xpos-BINARY_DOT_SIZE/2.0, ypos-BINARY_DOT_SIZE/2.0, 
                               BINARY_DOT_SIZE, BINARY_DOT_SIZE)
                    dots.append((r, pen_clust, brush_clust))  

                    # Just for this cluster
                    a_cc = self.adj_stats.getParaClusterCount(cluster, pcount+1)

                    # if a_cc is not None and a_cc > 0:
                    #     a_ypos = yorig - ymax_ht
                    # else:
                    #     a_ypos = yorig

                    # if xpos > xoffset:
                    #     tpath.lineTo(xpos, a_ypos)
                    # else:
                    #     tpath.moveTo(xpos, a_ypos)

                    a_ypos = yorig -ymax_ht/2.0

                    r = QRectF(xpos-BINARY_DOT_SIZE/2.0, a_ypos-BINARY_DOT_SIZE/2.0, 
                               BINARY_DOT_SIZE, BINARY_DOT_SIZE)

                    if a_cc is None or a_cc <= 0:
                        # a_dots.append((r, pen_topic, brush_white))    
                        pass                                            
                    else:
                        a_dots.append((r, pen_topic, brush_topic, a_cc, pcount+1))

                    xpos += xunit
            else:
                for pcount in range(len(self.para_data)):     # for each paragraph
                    stats = self.para_data[pcount]
                    cf = stats.getClusterFreq(cluster, freq_method)         # get the cluster frequency (cf)

                    ht = 0
                    if cf is not None and max_cfreq > 0:
                        ht = ymax_ht * cf/max_cfreq
                    ypos = yorig - ht

                    if xpos > xoffset:
                        path.lineTo(xpos, ypos)
                    else:
                        path.moveTo(xpos, ypos)

                    r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                               CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                    dots.append((r, pen_clust, brush_clust))

                    # Just for this topic
                    a_cf = self.adj_stats.getParaClusterFreq(cluster, pcount+1, freq_method)

                    a_ht = 0
                    if a_cf is not None and max_cfreq > 0:
                        a_ht = ymax_ht * a_cf/max_cfreq 

                    a_ypos = yorig - a_ht

                    if xpos > xoffset:
                        tpath.lineTo(xpos, a_ypos)
                    else:
                        tpath.moveTo(xpos, a_ypos)

                    r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                               CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                    if a_ht > 0:
                        a_dots.append((r, pen_topic, brush_topic, a_cc, pcount+1))
                    elif a_cf is None:    # gray + white
                        a_dots.append((r, pen_topic, brush_white, None, pcount+1))
                    elif a_cf == 0:       # blue
                        a_dots.append((r, pen_topic, brush_topic, 0, pcount+1))

                    xpos += xunit


            # COMMENTED OUT FOR NOW. We may recover this as an option.
            # self.scene.addPath(path,  pen_clust, brush_clear)
            self.scene.addPath(tpath, pen_topic, brush_clear)

            # COMMENTED OUT FOR NOW. We may recover this as an option.
            # for i in range(len(dots)):
            #     pcount = i+1
            #     info = dots[i]
            #     point = ParaPoint(info, cluster, controller=self.controller)
            #     ranked_topics = self.controller.getRankedTopics(cluster, pcount)
            #     if ranked_topics is not None:
            #        point.setHtml(format_tooltip(ranked_topics, self.topics, cluster, pcount, graphing_option))
            #     self.scene.addItem(point)

            for i in range(len(a_dots)):
                pcount = i+1
                a_info = a_dots[i]
                a_point = ParaPoint(a_info, cluster, controller=self.controller)
                # ranked_topics = self.controller.getRankedTopics(cluster, pcount)
                # if ranked_topics is not None:
                    # a_point.setHtml(format_tooltip(ranked_topics, self.topics, cluster, pcount, graphing_option))
                # a_point.setHtml("{} pattern(s)".format(a_info[3]))                    
                self.scene.addItem(a_point)

            yorig += yunit

            # ------------------------------
            # Find the max dimension count/freq.
            # ------------------------------

            num_dimensions = 0

            for t in ranked_dimensions:
                dimension   = t[0]
                total_count = t[1]

                xpos = xoffset
                ypos = yorig

                num_dimensions += 1

                # horizontal line/axis
                l = QLineF(0, ypos, xoffset+line_wd, ypos)
                self.axes.append(self.scene.addLine(l, pen_axis))

                # Create path for drowing the main graph
                path = QPainterPath()
                path.moveTo(xoffset, yorig)

                # Create path for drowing the graph for the selected topic
                tpath = QPainterPath()
                tpath.moveTo(xoffset, yorig)

                a_dots = list()
                dots   = list()

                if graphing_option == DSTemporalView.COUNT:
                    for pcount in range(len(self.para_data)):     # for each paragraph

                        a_dc = self.adj_stats.getParaDimensionCount(dimension, pcount+1)

                        a_ht = 0
                        if a_dc is not None and max_ccount > 0:
                            a_ht = ymax_ht * a_dc/max_ccount 

                        a_ypos = yorig - a_ht

                        if xpos > xoffset:
                            tpath.lineTo(xpos, a_ypos)
                        else:
                            tpath.moveTo(xpos, a_ypos)

                        r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                                   CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                        if a_ht > 0:
                            a_dots.append((r, pen_dim_topic, brush_dim_topic, a_dc, pcount+1))
                        elif a_dc is None:    
                            a_dots.append((r, pen_dim_topic, brush_white, None, pcount+1))
                        elif a_dc == 0:       
                            a_dots.append((r, pen_dim_topic, brush_dim_topic, 0, pcount+1))

                        xpos += xunit

                elif graphing_option == DSTemporalView.BINARY:

                    for pcount in range(len(self.para_data)):     # for each paragraph

                        a_dc = self.adj_stats.getParaDimensionCount(dimension, pcount+1)

                        # if a_dc is not None and a_dc > 0:
                        #     a_ypos = yorig - ymax_ht
                        # else:
                        #     a_ypos = yorig

                        # if xpos > xoffset:
                        #     tpath.lineTo(xpos, a_ypos)
                        # else:
                        #     tpath.moveTo(xpos, a_ypos)

                        a_ypos = yorg - ymax_ht/2.0

                        r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                                   CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)

                        # if a_dc is None:    
                        if a_dc is None or a_dc == 0:
                            # a_dots.append((r, pen_dim_topic, brush_white))
                            pass
                        else:
                            a_dots.append((r, pen_dim_topic, brush_dim_topic, a_dc, pcount+1))

                        xpos += xunit
                else:
                    for pcount in range(len(self.para_data)):     # for each paragraph

                        a_df = self.adj_stats.getParaDimensionFreq(dimension, pcount+1, freq_method)

                        a_ht = 0
                        if a_df is not None and max_cfreq > 0:
                            a_ht = ymax_ht * a_df/max_cfreq

                        a_ypos = yorig - a_ht

                        if xpos > xoffset:
                            tpath.lineTo(xpos, a_ypos)
                        else:
                            tpath.moveTo(xpos, a_ypos)

                        r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, a_ypos-CATEGORY_DOT_SIZE/2.0, 
                                   CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                        if a_ht > 0:
                            a_dots.append((r, pen_dim_topic, brush_dim_topic, a_df, pcount+1))
                        elif a_df is None:    
                            a_dots.append((r, pen_dim_topic, brush_white, a_df, pcount+1))
                        elif a_df == 0:       
                            a_dots.append((r, pen_dim_topic, brush_dim_topic, a_df, pcount+1))

                        xpos += xunit

                # COMMENTED OUT FOR NOW. We may recover this as an option.
                # self.scene.addPath(path,  pen_clust,     brush_clear)
                self.scene.addPath(tpath, pen_dim_topic, brush_clear)

                # COMMENTED OUT FOR NOW. We may recover this as an option.
                # for i in range(len(dots)):
                #     pcount = i+1
                #     info = dots[i]
                #     point = ParaPoint(info, controller=self.controller)
                #     ranked_topics = self.controller.getRankedTopics(dimension, pcount)
                #     if ranked_topics is not None:
                #         point.setHtml(format_tooltip(ranked_topics, self.topics, dimension, pcount))
                #     self.scene.addItem(point)

                for i in range(len(a_dots)):
                    pcount = i+1
                    a_info = a_dots[i]
                    a_point = ParaPoint(a_info, dimension, controller=self.controller)
                    # ranked_topics = self.controller.getRankedTopics(dimension, pcount)
                    # if ranked_topics is not None:
                        # a_point.setHtml(format_tooltip(ranked_topics, self.topics, dimension, pcount, graphing_option))
                    # a_point.setHtml("{} patterns()".format(a_info[3])) 
                    self.scene.addItem(a_point)

                yorig += yunit

                # each dimension
            ht = ((num_dimensions+1) * (CATEGORY_GAP + CATEGORY_HT)) + CATEGORY_GAP
            self.setFixedHeight(ht)
            self.setSceneRect(0.0,0.0,xoffset+line_wd,ht)

            return ht
   
        return -1







