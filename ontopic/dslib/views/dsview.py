#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform
import math
import string
import random
from collections import Counter 
from time import time

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

from reportlab.platypus import Image

import controller
import dslib.views as views
import dslib.views.report as report
import dslib.views.organization as organization
import dslib.models.document as ds_doc
import dslib.models.stat as ds_stat
import dslib.utils as utils
import dslib.views.topicview as topicview

from dslib.views.topicview import DSTemporalView
from dslib.views.utils import is_skip, truncate_label

import pprint
pp = pprint.PrettyPrinter(indent=4)

# Measurements
CONTROL_HT         = 24
TOPIC_HT           = 30
TOPIC_LABEL_WD     = 150
TOPIC_DOT_SIZE     = 15

CATEGORY_HT        = 26
CATEGORY_LABEL_WD  = 200
CATEGORY_GAP       = 5
CATEGORY_DOT_SIZE  = 4

BINARY_DOT_SIZE    = 15

ignored_categories = ['SyntacticComplexity', 'Orphaned', 'Other']

class RxClusterLabelsView(QFrame):

    def __init__(self, tag_dicts, rx_plots_view, num_tokens, org_panel=None, app_win=None, controller=None, parent=None):
        super(RxClusterLabelsView, self).__init__(parent)

        self.app_win       = app_win
        self.controller    = controller
        self.org_panel     = org_panel
        self.rx_plots_view = rx_plots_view
        self.tag_dicts     = tag_dicts

        self.cluster_buttons  = None
        self.selected_cluster = None

        main_layout = QHBoxLayout()
        main_layout.setContentsMargins(0,0,0,0)
        self.setLayout(main_layout)

        container = QWidget()
        self.container_layout = QVBoxLayout()
        self.container_layout.setContentsMargins(0,11,0,0)
        self.container_layout.setSpacing(CATEGORY_GAP)
        container.setLayout(self.container_layout)

        scroll_area = QScrollArea()
        scroll_area.setWidget(container)
        scroll_area.setWidgetResizable(True)
        scroll_area.setAlignment(Qt.AlignLeft)
        scroll_area.setViewportMargins(0,0,0,0)
        scroll_area.setStyleSheet("QScrollArea {border: 0;}")

        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_area.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        self.v_scroll_bar = scroll_area.verticalScrollBar()
        self.v_scroll_bar.valueChanged.connect(self.org_panel.rxLabelVScrollBarChanged)

        main_layout.addWidget(scroll_area)

        self.setStyleSheet("RxClusterLabelsView {background-color: " + views.default_vis_background_color + "; " +
                                                             "color: " + views.default_text_color + ";" +
                                                          "border: 0;" +
                                                    "border-right: 1px solid " + views.default_ui_border_color + ";}")

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        self.clust_counter = Counter()
        self.dim_counter   = Counter()

        if self.tag_dicts is not None:
            for key, value in tag_dicts.items():
                cat_type = value.get('type', None)
                if cat_type == 'CLUSTER':
                    if value['num_tags'] > 0:
                        self.clust_counter[key] = value['num_tags']
                elif cat_type == 'DIMENSION':
                    if value['num_tags'] > 0:                    
                        self.dim_counter[key] = value['num_tags']

            self.cluster_buttons = dict()
            button_pos = 0

            for t in self.clust_counter.most_common():
                clust = t[0]
                total_count = t[1]
                if clust not in ignored_categories: 
                    label = RxClusterLabel(clust, total_count, rx_plots_view, num_tokens, org_panel=org_panel, 
                                           container=self, app_win=self.app_win, controller=self.controller)
                    self.cluster_buttons[clust] = (label, button_pos)
                    self.container_layout.addWidget(label)
                    button_pos += 1

            label  = RxClusterLabel(None, 0, None, 0, org_panel=org_panel, 
                                    container=self, app_win=self.app_win, controller=self.controller)
            self.cluster_buttons['spacer'] = (label, button_pos)
            self.container_layout.addWidget(label)

        self.container_layout.addStretch()

    def clearSelection(self, cluster):

        t = self.cluster_buttons.get(cluster, None)
        if t is not None:
            label = t[0]
            label.unselect()

        self.current_cluster = None
        self.selected_cluster = None

    def setVerticalScrollValue(self, val):
        self.v_scroll_bar.setValue(val)

    def scrollToCluster(self, cluster, is_selected):

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
            # self.setVerticalScrollValue(v_offset)
            return v_offset
        else:
            self.selected_cluster = None
            return 0

    def processClicked(self, cluster, is_header=False, force=False):
        # print("RxClusterLabelsView.processClicked() cluster =", cluster)
        # print("    self.selected_cluster =", self.selected_cluster)
        # print("    is_header =", is_header)

        # self.seleced_cluster is the one currently selected BEFORE 'cluster' is clicked
        if self.selected_cluster is not None:
            t = self.cluster_buttons.get(self.selected_cluster, None)
            if t is not None:
                prev_button = t[0]
                prev_button.unselect()
            self.controller.setSelectedDSCategory(None, None, None, panel='rx')

        res = True

        if self.selected_cluster != cluster:

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
                                         refresh_editor=True, 
                                         panel='rx')
        elif self.selected_cluster == cluster:
            if force:
                self.controller.setSelectedDSCategory(cluster,
                                             None,
                                             None,
                                             cluster_changed=False,
                                             refresh_editor=True, 
                                             panel='rx')
            self.selected_cluster = None
        else:
            self.selected_cluster = None
            res = False

        return res

    def setSelectedCluster(self, cluster):
        self.selected_cluster = cluster

    def unselect(self):
        if self.selected_cluster is not None:
            t = self.cluster_buttons.get(self.selected_cluster, None)
            if t is not None:
                button = t[0]
                button.unhighlight()
            self.selected_cluster = None

class RxClusterLabel(QFrame):    
    """
    Cluster buttons used in the temporal view

    """
    def __init__(self, cluster, count, rx_plots_view, num_tokens, org_panel=None,
                     is_header=False, container=None, app_win=None, controller=None, parent=None):
        super(RxClusterLabel, self).__init__(parent)

        self.cluster       = cluster
        self.app_win       = app_win
        self.controller    = controller
        self.container     = container
        self.org_panel     = org_panel
        self.num_tokens    = num_tokens

        self.is_selected   = False
        self.count         = count
        self.is_header     = is_header
        self.rx_plots_view = rx_plots_view
        self.org_panel     = org_panel

        clust_label = self.controller.getClusterLabel(cluster)


        self.setStyleSheet("RxClusterLabel {background-color: transparent; " + \
                                                     "border: none;}")

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)
        if cluster is None:
            self.setFixedHeight(CATEGORY_HT)
            return

        layout = QHBoxLayout()
        layout.setContentsMargins(6,0,0,0)
        layout.setSpacing(0)
        self.setLayout(layout)

        #####
        # expand button
        #####
        self.expand_button = QToolButton()
        icon = QIcon()

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            expand_icon_path   = 'data/icons/expand_icon.png'
            collapse_icon_path = 'data/icons/collapse_icon.png'
        else:
            expand_icon_path   = 'data/icons/expand_dark_icon.png'
            collapse_icon_path = 'data/icons/collapse_dark_icon.png'


        icon.addPixmap(QPixmap(utils.resource_path(expand_icon_path)), QIcon.Normal, QIcon.Off)
        icon.addPixmap(QPixmap(utils.resource_path(collapse_icon_path)), QIcon.Normal, QIcon.On)
        self.expand_button.setIcon(icon)
        self.expand_button.setCheckable(True)
        self.expand_button.setFixedSize(12,12)
        self.expand_button.setStyleSheet("QToolButton {background-color: transparent; border: none;}")

        self.expand_button.clicked.connect(self.toggleDimension)

        if self.is_header:
            self.expand_button.setChecked(True)

        layout.addWidget(self.expand_button)

        #
        # Create a push button for the cluster
        #
        temp_button = QPushButton(clust_label)
        font = temp_button.font()
        font.setBold(True)
        font.setPointSizeF(views.default_ui_font_size)
        fmetrics = QFontMetrics(font)

        label = truncate_label(clust_label, fmetrics, CATEGORY_LABEL_WD-(36+layout.spacing()))

        self.button = QPushButton(label)
        self.button.setStyleSheet("QPushButton {font-weight: bold; color: " + views.ds_text_label_color + ";" + \
                                               "background-color: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding 0px; padding-right: 4px;"
                                               "text-align: left;" + \
                                               "border: 0px solid #fff;}" + \
                                    "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                               "color: " + views.default_text_color +";" + \
                                               "border: 1px solid " + views.default_ui_border_color + ";" + \
                                               "}")

        self.button.setFlat(True)
        self.button.setFixedHeight(CATEGORY_HT)
        # self.button.setFixedWidth(CATEGORY_LABEL_WD)
        self.button.setToolTip(cluster)

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
        self.help_button.setFixedSize(14,14)
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

        #
        # count
        #
        layout.addStretch()

        self.count_box = QLabel("({}/{:.2f})".format(count, 100*(count/num_tokens)))
        self.count_box.setStyleSheet("color: "  + views.ds_text_label_color + "; background-color: transparent;")
        layout.addWidget(self.count_box)

        layout.addSpacing(5)

    def fade_in_help(self):
        self.fade_in_anim.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(350)

        elif event.type() == QEvent.Leave:
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
            self.org_panel.collapseCluster(self.cluster, self.is_selected)
        else:
            self.expand_button.setChecked(False)
            self.org_panel.expandCluster(self.cluster, self.is_selected)

    def mousePressed(self):
        if self.is_selected == False:
            self.setStyleSheet("RxClusterLabel {background-color: " + views.ds_cluster_highlight_color + ";" + \
                                                          "color: " + views.default_text_color + ";" + \
                                                         "border: none;}")

            self.button.setStyleSheet("QPushButton {font-weight: bold; color:" + views.ds_text_label_highlight_color + ";" + \
                                              "background-color: transparent;" + \
                                                 "border-radius: 4px;" + \
                                                       "padding: 0px; padding-right: 4px;"
                                                    "text-align: left;" + \
                                                        "border: 0px solid #fff;}")

            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background-color: transparent;")

        else:
            self.setStyleSheet("RxClusterLabel {background-color: " + views.ds_cluster_highlight_color + ";" + \
                                                          "color: " + views.default_text_color + ";" + \
                                                         "border: none;}")
            self.button.setStyleSheet("QPushButton {font-weight: bold; color:" + views.ds_text_label_highlight_color + ";" + \
                                              "background-color: transparent;" + \
                                                 "border-radius: 4px;" + \
                                                       "padding: 0px; padding-right: 4px;"
                                                    "text-align: left;" + \
                                                        "border: 0px solid #fff;}")
            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background-color: transparent;")

    def mousePressEvent(self, event):
        self.mousePressed()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        # print("mouseReleaseEvent()")
        self.processClicked()
        super().mouseReleaseEvent(event)

    def isSelected(self):
        return self.is_selected

    def processClicked(self):
        # print("RxClusterLabel.processClicked()")
        # print("    self.cluster    =", self.cluster)
        # print("    self.is_hearder =", self.is_header)
        self.container.processClicked(self.cluster, is_header=self.is_header)
        if self.is_header:
            if self.is_selected:
                self.unselect()
            else:
                self.select()

    def highlight(self):
        self.setStyleSheet("RxClusterLabel {background-color: " + views.ds_cluster_highlight_color + ";" + \
                                                      "color: " + views.default_text_color + ";" + \
                                                     "border: none;}" )
        self.button.setStyleSheet("QPushButton {font-weight: bold; color:" + views.ds_text_label_highlight_color + ";" + \
                                          "background-color: transparent;" + \
                                             "border-radius: 4px;" + \
                                                   "padding: 0px; padding-right: 4px;"
                                                "text-align: left;" + \
                                                    "border: 0px solid #fff;}")
        self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background-color: transparent;")

    def select(self):
        # print("RxClusterLabel.select()")
        self.is_selected = True
        self.highlight()

    def unselect(self):
        # print("RxClusterLabel.unselect()")
        self.is_selected = False
        self.unhighlight()

    def unhighlight(self):
        self.setStyleSheet("RxClusterLabel {background-color: transparent;" + \
                                                      "color: " + views.default_text_color + ";" + \
                                                     "border: none;}" )
        self.button.setStyleSheet("QPushButton {font-weight: bold; color:" + views.ds_text_label_color + ";" + \
                                               "background-color: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding 0px; padding-right: 4px;"
                                               "text-align: left;" + \
                                               "border: 0px solid #fff;}")
        self.count_box.setStyleSheet("color: " + views.ds_text_label_color + "; background-color: transparent;")

class RxDimensionLabelsView(QFrame):

    def __init__(self, tag_dicts, rx_plots_view, num_tokens, org_panel=None, app_win=None, controller=None, parent=None):
        super(RxDimensionLabelsView, self).__init__(parent)

        self.app_win       = app_win
        self.controller    = controller
        self.org_panel     = org_panel
        self.rx_plots_view = rx_plots_view
        self.tag_dicts     = tag_dicts
        self.num_tokens    = num_tokens

        self.dimension_buttons  = None
        self.selected_dimension = None
        self.current_cluster    = None
        self.cluster_label      = None

        main_layout = QHBoxLayout()
        main_layout.setContentsMargins(0,0,0,0)        
        self.setLayout(main_layout)

        container = QWidget()
        self.container_layout = QVBoxLayout()
        self.container_layout.setContentsMargins(0,11,0,0)
        self.container_layout.setSpacing(CATEGORY_GAP)
        container.setLayout(self.container_layout)

        scroll_area = QScrollArea()
        scroll_area.setWidget(container)
        scroll_area.setWidgetResizable(True)
        scroll_area.setAlignment(Qt.AlignLeft)
        scroll_area.setViewportMargins(0,0,0,0)
        scroll_area.setStyleSheet("QScrollArea {border: 0;}")

        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)

        self.v_scroll_bar = scroll_area.verticalScrollBar()

        main_layout.addWidget(scroll_area)

        self.setStyleSheet("RxDimensionLabelsView {background-color: " + views.default_vis_background_color + " ;" +
                                                             "color: " + views.default_text_color + ";" +
                                                            "border: 0;" +
                                                      "border-right: 1px solid " + views.default_ui_border_color + ";}")

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)

        self.clust_counter = Counter()
        self.dim_counter   = Counter()

        if self.tag_dicts is not None:
            for key, value in tag_dicts.items():
                cat_type = value.get('type', None)
                if cat_type == 'CLUSTER':
                    if value['num_tags'] > 0:                    
                        self.clust_counter[key] = value['num_tags']
                elif cat_type == 'DIMENSION':
                    if value['num_tags'] > 0:                    
                        self.dim_counter[key] = value['num_tags']

        self.container_layout.addStretch()

    def clearSelection(self, cluster, dimension):
        # print("RxDimensionLabelsView.clearSelection()")
        # print("    {}, {}".format(cluster, dimension))

        if self.cluster_label is None:
            return

        # if self.current_cluster != cluster and self.cluster_label.isSelected():
        self.cluster_label.unselect()

        label = self.dimension_buttons.get(dimension, None)
        if label is not None:
            label.unselect()

        self.selected_dimension = None

    def setVerticalScrollValue(self, val):
        self.v_scroll_bar.setValue(val)

    def setCluster(self, cluster, is_cluster_selected):

        self.current_cluster = cluster

        for i in reversed(range(self.container_layout.count())):
            w = self.container_layout.itemAt(i)
            if type(w) == QWidgetItem:
                w.widget().deleteLater()
                w.widget().setParent(None)

        self.dimension_buttons = dict()
        if self.dim_counter is not None:

            dimension_names = self.controller.getDimensionNames(cluster)
            ranked_dimensions = [t for t in self.dim_counter.most_common() if t[0] in dimension_names]

            # Add the cluster button
            total_count = self.clust_counter.get(cluster, -1)
            self.cluster_label  = RxClusterLabel(cluster, total_count, self.rx_plots_view, self.num_tokens, 
                                                 org_panel=self.org_panel, is_header=True,
                                                 container=self, app_win=self.app_win, controller=self.controller)

            if is_cluster_selected:
                self.cluster_label.select()

            self.dimension_buttons[cluster] = self.cluster_label
            self.container_layout.insertWidget(self.container_layout.count()-1, self.cluster_label)

            # Add dimension buttons if any
            self.dimension_buttons = dict()
            for t in ranked_dimensions:
                dim = t[0]
                total_count = t[1]

                label  = RxDimensionLabel(dim, total_count, self.rx_plots_view, self.num_tokens, org_panel=self.org_panel,
                                        container=self, app_win=self.app_win, controller=self.controller)
                self.dimension_buttons[dim] = label
                self.container_layout.insertWidget(self.container_layout.count()-1, label)

            label  = RxDimensionLabel(None, 0, None, 0, org_panel=self.org_panel, 
                                    container=self, app_win=self.app_win, controller=self.controller)
            self.dimension_buttons['spacer'] = label
            self.container_layout.addWidget(label)

    def processClicked(self, category, is_header=False):
        # print("RxDimensionLabelsView.processClicked() cluster =", category)
        # print("    self.selected_dimension =", self.selected_dimension)
        # print("    is_header =", is_header)
        # print("    self.cluster_label.isSelected() =", self.cluster_label.isSelected())

        if is_header:
            # unselect the current selection 
            if self.selected_dimension is not None:
                prev_button = self.dimension_buttons.get(self.selected_dimension, None)
                if prev_button is not None:
                    prev_button.unhighlight()
                # self.controller.setSelectedDSCategory(None, None, None, panel='rx')
                                                
            # select the cluster (header)
            if self.cluster_label.isSelected():
                pass
                # self.controller.setSelectedDSCategory(None, None, None, panel='rx')
            else:
                self.controller.setSelectedDSCategory(self.current_cluster,
                                                 None,
                                                 None,
                                                 cluster_changed=False,
                                                 refresh_editor=True, panel='rx')
            self.selected_dimension = None
        else:
            dimension = category
            if self.cluster_label.isSelected():
                self.cluster_label.unselect()
                # self.controller.setSelectedDSCategory(None, None, None, panel='rx')

            if self.selected_dimension is not None:
                prev_button = self.dimension_buttons.get(self.selected_dimension, None)
                if prev_button is not None:
                    prev_button.unhighlight()
                self.controller.setSelectedDSCategory(None, None, None, panel='rx')

            if self.selected_dimension != dimension:
                self.selected_dimension = dimension
                button = self.dimension_buttons.get(dimension, None)
                if button is not None:
                    button.highlight()
                self.controller.setSelectedDSCategory(self.current_cluster,
                                             dimension,
                                             None,
                                             cluster_changed=False,
                                             refresh_editor=True, panel='rx')
            else:
                self.selected_dimension = None

    def unselect(self):
        if self.selected_dimension is not None:
            button = self.dimension_buttons.get(self.selected_dimension, None)
            if button is not None:
                button.unhighlight()
            self.selected_dimension = None

class RxDimensionLabel(QFrame):
    """
    Cluster buttons used in the temporal view

    """
    def __init__(self, dimension, count, rx_plots_view, num_tokens, org_panel=None, 
                is_header=False, container=None, app_win=None, controller=None, parent=None):
        super(RxDimensionLabel, self).__init__(parent)

        self.dimension   = dimension
        self.app_win     = app_win
        self.controller  = controller
        self.container   = container
        self.org_panel   = org_panel
        self.is_selected = False
        self.count       = count

        self.setStyleSheet("background-color: transparent; border: 0px;")

        self.setFixedWidth(organization.LEFT_COLUMN_WIDTH)
        if dimension is None:
            self.setFixedHeight(CATEGORY_HT)
            return

        layout = QHBoxLayout()
        layout.setContentsMargins(0,0,0,0)
        layout.setSpacing(0)       
        self.setLayout(layout)

        #
        # Create a push button for the dimesion/cluster
        #
        temp_button = QPushButton(dimension)
        font = temp_button.font()
        font.setBold(True)
        font.setPointSizeF(views.default_ui_font_size)
        fmetrics = QFontMetrics(font)

        if platform.system() == 'Windows':
            label = truncate_label(dimension, fmetrics, CATEGORY_LABEL_WD-(36+layout.spacing()))
        else:
            label = truncate_label(dimension, fmetrics, CATEGORY_LABEL_WD-(layout.spacing()))

        self.button = QPushButton(label)
        self.button.setStyleSheet("QPushButton {font-weight: normal; color: " + views.ds_text_label_color + ";" + \
                                               "background-color: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding: 4px; padding-left: 16px;" + \
                                               "text-align: left;" + \
                                               "border: 0px; solid #fff;}" + \
                                    "QToolTip { background-color: " + views.default_vis_background_color + ";" + \
                                               "color: " + views.default_text_color +";" + \
                                               "border: 1px solid " + views.default_ui_border_color + ";" + \
                                               "}")
        self.button.setFlat(True)
        self.button.setFixedHeight(CATEGORY_HT)
        # self.button.setFixedWidth(CATEGORY_LABEL_WD)
        self.button.setToolTip(dimension)
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
        self.help_button.setFixedSize(14,14)
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

        self.count_box = QLabel("({}/{:.2f})".format(count, 100*(count/num_tokens)))
        self.count_box.setStyleSheet("color: " + views.ds_text_label_color + "; background-color: transparent;")
        layout.addWidget(self.count_box)

        layout.addSpacing(5)

    def fade_in_help(self):
        self.fade_in_anim.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(350)

        elif event.type() == QEvent.Leave:
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
            self.setStyleSheet("RxDimensionLabel {background-color: " + views.ds_dimension_highlight_color + ";" + \
                                             "border: 0px solid #fff;}")

            self.button.setStyleSheet("QPushButton {font-weight: normal; color:" + views.ds_text_label_highlight_color + ";" + \
                                               "background: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding: 4px; padding-left: 16px;" + \
                                               "text-align: left;" + \
                                               "border: 0px;}")

            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background: transparent;")            
        else:
            self.setStyleSheet("RxDimensionLabel {background-color: " + views.ds_dimension_highlight_color + ";" + \
                                             "border: 0px solid #fff;}")

            self.button.setStyleSheet("QPushButton {font-weight: normal; color:" + views.ds_text_label_highlight_color + ";" + \
                                               "background: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding: 4px; padding-left: 16px;" + \
                                               "text-align: left;" + \
                                               "border: 0px;}")

            self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background: transparent;")            

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
        self.setStyleSheet("RxDimensionLabel {background-color: " + views.ds_dimension_highlight_color + ";" + \
                                           "border: 0px solid #fff;}")

        self.button.setStyleSheet("QPushButton {font-weight: normal; color:" + views.ds_text_label_highlight_color + ";" + \
                                               "background: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding: 4px; padding-left: 16px;" + \
                                               "text-align: left;" + \
                                               "border: 0px;}")

        self.count_box.setStyleSheet("color: " + views.ds_text_label_highlight_color + "; background: transparent;")

    def unhighlight(self):
        self.setStyleSheet("RxDimensionLabel {background-color: transparent;" + \
                                           "border: 0px solid #fff;}")
        self.button.setStyleSheet("QPushButton {font-weight: normal; color:" + views.ds_text_label_color + ";" + \
                                               "background: transparent;" + \
                                               "border-radius: 4px;" + \
                                               "padding: 4px; padding-left: 16px;" + \
                                               "text-align: left;" + \
                                               "border: 0px;}")
        self.count_box.setStyleSheet("color: " + views.ds_text_label_color + "; background: transparent;")

class RxParaPoint(QGraphicsEllipseItem):
    def __init__(self, info, category_name, controller=None, parent=None):
        super(RxParaPoint, self).__init__(info[0], parent)
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

class RxTemporalView(QGraphicsView):
    """
    """
    # Filter
    COUNT     = 0
    FREQUENCY = 1
    LOG       = 2
    BINARY    = 3

    def __init__(self, tag_dicts, para_data, org_panel=None, app_win=None, controller=None, parent=None):
        super(RxTemporalView, self).__init__(parent)

        self.app_win     = app_win
        self.controller  = controller
        self.org_panel   = org_panel
        self.tag_dicts   = tag_dicts
        self.para_data   = para_data

        self.clust_counter = Counter()
        self.dim_counter   = Counter()

        for key, value in self.tag_dicts.items():
            cat_type = value.get('type', None)
            if cat_type == 'CLUSTER':
                if value['num_tags'] > 0:
                    self.clust_counter[key] = value['num_tags']
            elif cat_type == 'DIMENSION':
                if value['num_tags'] > 0:
                    self.dim_counter[key] = value['num_tags']

        self.axes        = []

        self.container_width  = -1
        self.current_cluster = None

        self.ranked_clusters = []

        self.mouse_pressed = False
        self.is_dimension_visble = False

        self.setStyleSheet("RxTemporalView {border: 0px; padding: 0px; margin: 0px;}")

        self.setAlignment(Qt.AlignTop|Qt.AlignLeft)
        self.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform);

        self.h_scrollbar = self.horizontalScrollBar()
        self.h_scrollbar.valueChanged.connect(self.org_panel.rxVisHScrollBarChanged)
        self.v_scrollbar = self.verticalScrollBar()
        self.v_scrollbar.valueChanged.connect(self.org_panel.rxVisVScrollBarChanged)

        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        self.scene = QGraphicsScene()
        self.setScene(self.scene)

        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))

    def setVerticalScrollValue(self, val):
        self.v_scrollbar.setValue(val)

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

    def clearScene(self):
        self.scene.clear()

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

        self.scene.clear()

        graphing_option = self.controller.getGraphingOption()

        freq_method = ds_stat.DSStat.DOC
        if graphing_option == DSTemporalView.LOG:
            freq_method = ds_stat.DSStat.LOG

        self.axes = list()

        pen_light = QPen(QColor(222,222,222))
        pen_light.setWidthF(0.5)

        # Clusters
        pen_clust = QPen(QColor(views.ds_cluster_graph_color))
        pen_clust.setWidthF(1.15)
        brush_clust = QBrush(QColor(views.ds_cluster_graph_color))

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

        for t in self.clust_counter.most_common():            # for each cluster
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

        for t in self.clust_counter.most_common():            # for each cluster
            clust = t[0]
            total_count = t[1]

            if clust not in ignored_categories:          # if 'clust' is not in the ignored cluster list

                xpos = xoffset
                ypos = yorig

                num_clusters += 1

                # horizontal line/axis
                l = QLineF(0, ypos, xoffset+line_wd, ypos)
                self.axes.append(self.scene.addLine(l, pen_light))

                # a_dots = list()
                dots   = list()

                if graphing_option == DSTemporalView.COUNT:

                    # max_ccount = max_ccounts[clust]
                    max_ccount  = max_ccounts.get(clust, 0)

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
                        dots.append((r, pen_clust, brush_clust, cc, pcount+1))

                        xpos += xunit

                elif graphing_option == DSTemporalView.BINARY:

                    # max_ccount = max_ccounts[clust]
                    max_ccount  = max_ccounts.get(clust, 0)

                    for pcount in range(len(self.para_data)):     # for each paragraph
                        stats = self.para_data[pcount]
                        cc = stats.getClusterCount(clust) # get the count

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
    
                        if cc is None or cc == 0:
                            # dots.append((r, pen_clust, brush_white, cc, pcount+1))  
                            pass
                        else:
                            dots.append((r, pen_clust, brush_clust, cc, pcount+1))

                        xpos += xunit

                else:
                    max_cfreq = max_cfreqs[clust]

                    for pcount in range(len(self.para_data)):           # for each paragraph
                        stats = self.para_data[pcount]
                        cf = stats.getClusterFreq(clust, freq_method)   # get the cluster frequency (cf)

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
                        dots.append((r, pen_clust, brush_clust, cf, pcount+1))

                        xpos += xunit

                self.scene.addPath(path, pen_clust, brush_clear)
                for i in range(len(dots)):
                    pcount = i+1
                    info = dots[i]
                    point = RxParaPoint(info, clust, controller=self.controller)
                    self.scene.addItem(point)

                yorig += yunit
            # each cluster

        ht = (num_clusters * (CATEGORY_GAP + CATEGORY_HT)) + CATEGORY_GAP*2 + 11
        # self.setFixedHeight(ht)
        # self.setSceneRect(0.0,0.0, xoffset+line_wd, ht)
        self.setSceneRect(0.0,0.0, xpos, ht)
        return ht

    def drawAClusterWithDimensions(self, cluster):

        if self.tag_dicts is not None:

            self.scene.clear()
            self.axes = list()
            graphing_option = self.controller.getGraphingOption()

            freq_method = ds_stat.DSStat.DOC
            if graphing_option == DSTemporalView.LOG:
                freq_method = ds_stat.DSStat.LOG

            pen_axis = QPen(QColor(200,200,200))
            pen_axis.setWidthF(0.5)

            brush_white = QBrush(QColor(255,255,255))
            brush_clear = QBrush(Qt.transparent)

            pen_clust = QPen(QColor(views.ds_cluster_graph_color))
            pen_clust.setWidthF(1.15)
            brush_clust = QBrush(QColor(views.ds_cluster_graph_color))

            pen_dim = QPen(QColor(views.ds_dimension_graph_color))
            pen_dim.setWidthF(0.8)
            brush_dim = QBrush(QColor(views.ds_dimension_graph_color))

            vgap    = CATEGORY_GAP
            xunit   = organization.PARA_BUTTON_WD + organization.PARA_BUTTON_GAP
            yunit   = CATEGORY_HT + CATEGORY_GAP
            ymax_ht = CATEGORY_HT

            xoffset = organization.PARA_BUTTON_WD/2
            yoffset = CATEGORY_GAP

            num_paras = len(self.para_data)

            yorig = yoffset + CATEGORY_HT     # (5 + 26)

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
            ranked_dimensions = [t for t in self.dim_counter.most_common() if t[0] in dimension_names]

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

            total_count = self.clust_counter.get(cluster, -1)

            xpos = xoffset
            ypos = yorig

            line_wd = (num_paras-1) * xunit
            if line_wd < self.container_width:
                line_wd = self.container_width

            # horizontal line/axis
            l = QLineF(0, ypos, xoffset+line_wd, ypos)
            self.axes.append(self.scene.addLine(l, pen_axis))

            # a_dots = list()
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

                    dots.append((r, pen_clust, brush_clust, cc, pcount+1))  

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

                    if cc is None or cc == 0:
                        # dots.append((r, pen_clust, brush_white, cc, pcount+1))  
                        pass
                    else:
                        dots.append((r, pen_clust, brush_clust, cc, pcount+1))  

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
                    dots.append((r, pen_clust, brush_clust, cf, pcount+1))

                    xpos += xunit

            self.scene.addPath(path, pen_clust, brush_clear)
            for i in range(len(dots)):
                pcount = i+1
                info = dots[i]
                point = RxParaPoint(info, cluster, controller=self.controller)
                self.scene.addItem(point)

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

                # a_dots = list()
                dots   = list()

                if graphing_option == DSTemporalView.COUNT:
                    for pcount in range(len(self.para_data)):     # for each paragraph

                        stats = self.para_data[pcount]
                        dc = stats.getDimensionCount(dimension) 

                        ht = 0
                        if dc is not None and max_ccount > 0:
                            ht = ymax_ht * dc/max_ccount 

                        ypos = yorig - ht

                        if xpos > xoffset:
                            tpath.lineTo(xpos, ypos)
                        else:
                            tpath.moveTo(xpos, ypos)

                        r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                                   CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                        if ht > 0:
                            dots.append((r, pen_dim, brush_dim, dc, pcount+1))
                        elif dc is None:    
                            dots.append((r, pen_dim, brush_white, dc, pcount+1))
                        elif dc == 0:       
                            dots.append((r, pen_dim, brush_dim, dc, pcount+1))

                        xpos += xunit

                elif graphing_option == DSTemporalView.BINARY:
                    for pcount in range(len(self.para_data)):     # for each paragraph

                        stats = self.para_data[pcount]
                        dc = stats.getDimensionCount(dimension) 

                        # if dc is not None and dc > 0:
                        #     ypos = yorig - ymax_ht
                        # else:
                        #     ypos = yorig

                        # if xpos > xoffset:
                        #     tpath.lineTo(xpos, ypos)
                        # else:
                        #     tpath.moveTo(xpos, ypos)

                        ypos = yorig - ymax_ht/2.0

                        r = QRectF(xpos-BINARY_DOT_SIZE/2.0, ypos-BINARY_DOT_SIZE/2.0, 
                                   BINARY_DOT_SIZE, BINARY_DOT_SIZE)

                        if dc is None:    
                            # dots.append((r, pen_dim, brush_white, dc, pcount+1))
                            pass
                        else:
                            dots.append((r, pen_dim, brush_dim, dc, pcount+1))

                        xpos += xunit
                else:
                    for pcount in range(len(self.para_data)):     # for each paragraph

                        stats = self.para_data[pcount]
                        df = stats.getDimensionFreq(dimension) 

                        ht = 0
                        if df is not None and max_cfreq > 0:
                            ht = ymax_ht * df/max_cfreq

                        ypos = yorig - ht

                        if xpos > xoffset:
                            tpath.lineTo(xpos, ypos)
                        else:
                            tpath.moveTo(xpos, ypos)

                        r = QRectF(xpos-CATEGORY_DOT_SIZE/2.0, ypos-CATEGORY_DOT_SIZE/2.0, 
                                   CATEGORY_DOT_SIZE, CATEGORY_DOT_SIZE)
                        if ht > 0:
                            dots.append((r, pen_dim, brush_dim, df, pcount+1))
                        elif df is None:    
                            dots.append((r, pen_dim, brush_white, df, pcount+1))
                        elif df == 0:       
                            dots.append((r, pen_dim, brush_dim, df, pcount+1))

                        xpos += xunit

                self.scene.addPath(path, pen_clust, brush_clear)
                self.scene.addPath(tpath, pen_dim, brush_clear)

                for i in range(len(dots)):
                    pcount = i+1
                    info = dots[i]
                    point = RxParaPoint(info, dimension, controller=self.controller)
                    self.scene.addItem(point)

                yorig += yunit

                # each dimension
            ht = ((num_dimensions+1) * (CATEGORY_GAP + CATEGORY_HT)) + CATEGORY_GAP
            #self.setFixedHeight(ht)
            self.setSceneRect(0.0,0.0,xoffset+line_wd,ht)

            return ht