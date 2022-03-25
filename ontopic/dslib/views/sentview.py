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
from time import time


from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

from reportlab.platypus import Image

import controller
import dslib.views as views
import dslib.views.report as report
import dslib.models.document as ds_doc
import dslib.utils as utils
import dslib.views.topicview as topicview
import dslib.views.autofit_textedit as autofit_textedit
import dslib.views.info_container as info_container

# from dslib.views.utils import is_skip

import pprint
pp = pprint.PrettyPrinter(indent=4)

SENT_RECT_SIZE  = 10
SENT_RECT_HGAP  = 3
SENT_RECT_VGAP  = 2
SENT_VERB_SPACE = 10
PARA_LABEL_HEIGHT = 13

VERB_BAR_WIDTH  = 3
VERB_BAR_HEIGHT = SENT_RECT_SIZE

SENT_VIS_PANEL_WIDTH = 260


class SentVisPanel(QFrame):
    def __init__(self, app_win=None, parent=None):

        super(SentVisPanel, self).__init__(parent)
        
        self.app_win = app_win
        self.controller = None
        self.is_locked = False

        self.selected_sent_plot = None

        self.setStyleSheet("SentVisPanel {background-color: " + views.default_vis_background_color + ";" + \
                                         "border: none;}" +
                           "QFrame {background-color:" + views.default_vis_background_color + ";}" + \

                 "QScrollBar { background-color:"  + views.scrollbar_bg_color + ";" +
                                        "margin: 0;" +
                                        "border: 1px solid " + views.scrollbar_border_color + ";}" +

         "QScrollBar::handle { background-color:" + views.scrollbar_handle_bg_color + ";" +
                                 "border-radius: 6px;" +   
                                        "border: 1px solid " + views.scrollbar_border_color + ";}"
         
         "QScrollBar::add-line {height: 0; width 0; background: none; border: none;}" +
         "QScrollBar::sub-line {height: 0; width 0; background: none; border: none;}" +

         "QLabel {background: none;" +
                  "font-size: " + str(views.default_ui_font_size) + "pt;}" +
         "QToolTip { background-color: " + views.default_vis_background_color + ";" +
                               "color: " + views.default_ui_text_color + ";" +
                           "font-size: " + str(views.default_ui_font_size) + "pt;" +
                              "border: none;" +
                                   "}"         
         )                                       

        self.setMinimumWidth(SENT_VIS_PANEL_WIDTH+25)
        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)

        layout = QVBoxLayout()
        layout.setContentsMargins(0,0,0,0)
        layout.setSpacing(0)
        self.setLayout(layout)

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

        self.clarity_title = QLabel(views.CLARITY_TITLE)
        self.clarity_title.setStyleSheet("QLabel {font-size: " + str(views.default_ui_heading_font_size) + "pt; font-weight: bold; color: #e56600;}" +
                                         "QLabel:disabled {color: " + views.default_ui_text_inactive_color +";}")                        
        title_area_hbox.addWidget(self.clarity_title)

        title_area_hbox.addStretch()

        if self.app_win.areCommunicationValuesVisible():
            self.clarity_values_container = info_container.InfoContainer()
            values_hbox = QHBoxLayout()
            values_hbox.setContentsMargins(0,0,0,0)        
            self.clarity_values_container.setLayout(values_hbox)
            self.clarity_values_container.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

            if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
                cv_clear_icon_path = "data/icons/cv_clear_icon.png"
            else:
                cv_clear_icon_path = "data/icons/cv_clear_dark_icon.png"

            self.cv_clear_icon = QPushButton()
            self.cv_clear_icon.setFlat(True)  
            self.cv_clear_icon.setIconSize(QSize(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE))                                  
            self.cv_clear_icon.setStyleSheet("border: 0; padding: 0;")
            pic = QPixmap(utils.resource_path(cv_clear_icon_path))
            self.cv_clear_icon.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.cv_clear_icon.setToolTip("Clear")
            self.cv_clear_icon.clicked.connect(lambda state, arg=views.CLARITY: self.controller.openPanelDescription(arg))
            values_hbox.addWidget(self.cv_clear_icon)
            values_hbox.addSpacing(2)

            self.info_button = QToolButton(parent=self)
            icon = QIcon()
            pic = QPixmap(utils.resource_path('data/icons/info_icon.png'))        
            self.info_button.setIcon(QIcon(pic.scaled(14, 14, Qt.KeepAspectRatio, Qt.SmoothTransformation)))   
            self.info_button.setCheckable(True)
            self.info_button.setFixedSize(14,14)
            self.info_button.setStyleSheet("QToolButton {background: transparent; border: none; margin: 0; padding-top: 0px;}")
            self.info_button.setToolTip("Read about <b>Clarity</b>")
            self.info_button.clicked.connect(lambda state, arg=views.CLARITY: self.controller.openPanelDescription(arg))   
            values_hbox.addWidget(self.info_button)
            values_hbox.addSpacing(8)

            title_area_hbox.addWidget(self.clarity_values_container)

            eff = self.clarity_values_container.setupAnimation()
            self.info_button.setGraphicsEffect(eff)

        layout.addWidget(title_area_container) 

        # List of Views
        hbox = QHBoxLayout()

        self.sentences_layout = QVBoxLayout()
        self.sentences_layout.setContentsMargins(5,10,5,0)
        self.sentences_layout.setSpacing(SENT_RECT_VGAP)

        sentences_view = QWidget()
        sentences_view.setStyleSheet("QWidget {background-color: " + views.default_light_vis_background_color + ";" + \
                                                        "border: none;}")
        sentences_view.setLayout(self.sentences_layout)

        scroll_area = QScrollArea()
        scroll_area.setWidget(sentences_view)
        scroll_area.setWidgetResizable(True)
        scroll_area.setAlignment(Qt.AlignLeft)
        scroll_area.setViewportMargins(0,0,0,0)
        scroll_area.setMinimumWidth(SENT_VIS_PANEL_WIDTH+25)
        scroll_area.setSizePolicy(QSizePolicy.Minimum,QSizePolicy.MinimumExpanding)

        scroll_area.setStyleSheet("QScrollArea {background-color: " + views.default_vis_background_color + ";" + \
                                     "border: none; border-right: 1px solid " + views.default_ui_border_color + "}")


        hbox.addWidget(scroll_area)

        # Right Side
        vbox = QVBoxLayout()
        vbox.setContentsMargins(12,10,10,0)

        # Legend
        legend_hbox = QHBoxLayout()

        legend_hbox.addSpacing(3)
        np_icon = QWidget()
        np_icon.setFixedSize(SENT_RECT_SIZE, SENT_RECT_SIZE)
        np_icon.setStyleSheet("background-color: " + views.sent_topic_color + ";")

        verb_icon = QWidget()
        verb_icon.setFixedSize(VERB_BAR_WIDTH+1,VERB_BAR_HEIGHT)
        verb_icon.setStyleSheet("background-color: " + views.sent_verb_color + ";")

        be_verb_icon = QWidget()
        be_verb_icon.setFixedSize(VERB_BAR_WIDTH+1,VERB_BAR_HEIGHT)
        be_verb_icon.setStyleSheet("background-color: " + views.sent_be_verb_color + ";")
        np_label      = QLabel("  Noun Phrase")
        verb_label    = QLabel("  Active Verb")
        be_verb_label = QLabel("  Be Verb")

        legend_hbox.addWidget(np_icon)
        legend_hbox.addWidget(np_label)
        legend_hbox.addSpacing(15)
        legend_hbox.addWidget(verb_icon)
        legend_hbox.addWidget(verb_label)
        legend_hbox.addSpacing(15)        
        legend_hbox.addWidget(be_verb_icon)
        legend_hbox.addWidget(be_verb_label)
        legend_hbox.addStretch()

        vbox.addLayout(legend_hbox)

        line = QFrame()
        line.setFrameShape(QFrame.HLine);
        line.setStyleSheet("color: " + views.default_ui_border_color + ";")
        vbox.addWidget(line)

        self.instructions = autofit_textedit.AutoFitTextEdit()
        self.instructions.setStyleSheet("AutoFitTextEdit {background-color: " + views.default_ui_input_background_color + ";"
                                                                   "margin: 0; " + \
                                                                  "padding: 0; " + \
                                                               # "margin-top: 4px; " + \
                                                           # "padding-bottom: 18px; " + \
                                                                   "border: 0;" + \
                                                            "border-bottom: 1px solid " + views.default_ui_border_color + ";}")

        html_instructions = self.app_win.getInstruction('clarity')

        doc = self.instructions.document()
        doc.setDocumentMargin(8)
        doc.setDefaultStyleSheet(views.instructions_style)  
        self.instructions.setHtml(html_instructions)
        vbox.addWidget(self.instructions)

        if self.app_win.areInstructionsHidden():
            self.instructions.hide()

        # else:
        #     line = QFrame()
        #     line.setFrameShape(QFrame.HLine);
        #     line.setStyleSheet("color: " + views.default_ui_border_color + ";")
        #     vbox.addWidget(line)

        vbox.addSpacing(5)

        # Text Area
        self.textview = QTextEdit()
        self.textview.setMinimumHeight(200)
        self.textview.setStyleSheet("QTextEdit {background-color: " + views.default_ui_input_background_color + ";"
                                                         "margin-top: 0px; " + \
                                                         "border: none;}")
        self.textview_doc = self.textview.document()
        vbox.addWidget(self.textview)

        vbox.addStretch()

        hbox.addLayout(vbox)
        layout.addLayout(hbox)

    def fade_in_help(self):
        self.fade_in_anim.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(150)

        elif event.type() == QEvent.Leave:
            if self.anim_timer.timerId() >= 0:
                self.anim_timer.stop()
            self.fade_in_anim.stop()
            self.eff.setOpacity(0.5)

        return super().eventFilter(object, event)

    def getPixmap(self):
        pixmap = QPixmap(self.size())
        self.render(pixmap)        
        return pixmap

    def hideValuesIcons(self):
        if self.app_win.areCommunicationValuesVisible():
            self.clarity_values_container.hide()

    def setController(self, c):
        self.controller = c

    def setInstructionsVisible(self, is_visible):
        if is_visible:
            self.instructions.show()
        else:
            self.instructions.hide()

    def setLocked(self, val):

        if val == self.is_locked:
            return
        else:
            self.is_locked = val
            if val:  # locked == True
                self.setEnabled(False)
                op = QGraphicsOpacityEffect()
                op.setOpacity(0.6)      
                self.setGraphicsEffect(op)
            else:
                self.setGraphicsEffect(None)
                self.setEnabled(True)

    def clearSelection(self):
        if self.selected_sent_plot is not None:
            self.selected_sent_plot.unselect()
        self.textview.setHtml("")

    def reset(self):
        self.updateData([])

    def updateData(self, data):

        if data is None:
           return ValueError('sent_data is None.')

        nrows = len(data)  # number of rows = sentences + line breaks + headings + titles

        for i in reversed(range(self.sentences_layout.count())): 
            item = self.sentences_layout.itemAt(i)
            if type(item) == QWidgetItem:
                item.widget().deleteLater()
                item.widget().setParent(None)
            else:
                self.sentences_layout.removeItem(item)

        if nrows == 0:
            return

        first_word_pos = 0
        first_sent = True
        sent_pos = 0
        l_np_count_max = 0
        r_np_count_max = 0

        for sent_data in data:
            if type(sent_data[0]) == int:
                analysis   = sent_data[2]
                if l_np_count_max < analysis['L_NPS']:
                    l_np_count_max = analysis['L_NPS']
                if r_np_count_max < analysis['R_NPS']:
                    r_np_count_max = analysis['R_NPS']

        #   |--rect--|gap|--rect--| ... [--verb--] ... |--rect--|gap|--rect--|gap|--rect--|
        l_width = l_np_count_max * (SENT_RECT_SIZE+SENT_RECT_HGAP) - SENT_RECT_HGAP
        r_width = r_np_count_max * (SENT_RECT_SIZE+SENT_RECT_HGAP) - SENT_RECT_HGAP

        para_count = 0
        for i in range(len(data)-1):  # we'll always skip the last line
            sent_data = data[i]
            if type(sent_data[0]) != str and first_sent:
                sent_dict = sent_data[3]

                w = sent_dict['text_w_info'][0] # get the first word
                first_word_pos = w[ds_doc.WORD_POS]

            elif type(sent_data[0]) == str and sent_data[0] == '\n': 
                para_count += 1

            sp = SentencePlot(sent_data, sent_pos, first_word_pos, (l_width, r_width), para_count,
                                    app_win=self.app_win, controller=self.controller, container=self)
            self.sentences_layout.addWidget(sp)

            if type(sent_data[0]) == str and sent_data[0] == '\n':    # paragraph break
                first_sent = True
                sent_pos = 0
            else:
                first_sent = False
                sent_pos += 1

        self.sentences_layout.addStretch()

    # def mousePressed(self, event):
    #     self.highlight()
    #     super().mousePressEvent(event)

    def processClicked(self, selected_sent_plot):

        prev_selected_sent_plot = self.selected_sent_plot
        self.selected_sent_plot = selected_sent_plot

        # self.controller.unselectTopic(None, refresh_editor=False)
        # self.controller.unselectParagraph(None, refresh_editor=False)
        # self.controller.clearEditorHighlights(refresh_editor=False)
        # self.controller.resetGlobalTopics()

        self.textview_doc.setDefaultStyleSheet("p {font-size: " + str(views.editor_normal_font_size) + "pt;}")

        if prev_selected_sent_plot == selected_sent_plot:
            sent_pos = self.selected_sent_plot.getSentPos()
            self.controller.unselectSentence(sent_pos[0]-1, sent_pos[1]-1, sent_pos[1], refresh_editor=True)
            self.selected_sent_plot.unselect()
            self.selected_sent_plot = None
            self.textview.setHtml("")
        else:
            self.selected_sent_plot.select()
            topics = self.selected_sent_plot.getTopics()
            sent_pos = self.selected_sent_plot.getSentPos()
            self.controller.setSelectedSentence(sent_pos[0]-1, sent_pos[1]-1, sent_pos[1], refresh_editor=True)
            self.textview.setHtml(self.selected_sent_plot.getHtml())

        if prev_selected_sent_plot is not None:
            prev_selected_sent_plot.unselect()

class NPRect(QGraphicsRectItem):
    def __init__(self, rect, colors, np, parent=None):
        super(NPRect, self).__init__(rect, parent)
        self.setPen(colors[0])
        self.setBrush(colors[1])
        self.colors = colors
        self.np = np 

        self.setToolTip(np)

class SentencePlot(QGraphicsView):
    def __init__(self, sent_data, sent_pos, word_pos_offset, l_r_max_sizes, para_pos, 
                      app_win=None, controller=None, container=None, parent=None):
        super(SentencePlot, self).__init__(parent)

        # print("SentencePlot.__init__()")
        # print("    sent_data =", sent_data)

        self.is_selected = False

        self.setAlignment(Qt.AlignTop|Qt.AlignLeft)
        self.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform);
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setStyleSheet("SentencePlot {background-color: " + views.default_vis_background_color + ";" + 
                                         "border: none;}")

        self.app_win     = app_win
        self.controller  = controller
        self.container   = container

        self.sent_data   = sent_data
        self.word_pos_offset = word_pos_offset
        self.sent_pos    = sent_pos
        self.is_b_verb   = False

        # Create a graphics scene
        self.scene = QGraphicsScene()
        self.setScene(self.scene)

        pen_topic           = QPen(QColor(views.sent_topic_color))
        pen_topic.setWidthF(0.5)

        pen_clear           = QPen(Qt.transparent)        

        brush_topic         = QBrush(QColor(views.sent_topic_color))
        brush_clear         = QBrush(Qt.transparent)        

        brush_verb          = QBrush(QColor(views.sent_verb_color))
        brush_be_verb       = QBrush(QColor(views.sent_be_verb_color))

        # get the max size for the left and the right side.
        max_width = l_r_max_sizes[0] + l_r_max_sizes[1] + SENT_VERB_SPACE
        if max_width < SENT_VIS_PANEL_WIDTH: # if the max_width is less than the default, use the default.
            max_width = SENT_VIS_PANEL_WIDTH
            l_max_size = round(SENT_VIS_PANEL_WIDTH/3)
        else:
            l_max_size = l_r_max_sizes[0]

        # Set the fixed size.
        self.setFixedWidth(max_width)
        self.setFixedHeight(SENT_RECT_SIZE + 2)

        path = QPainterPath()
        path.moveTo(0, 0)
        path.lineTo(SENT_VIS_PANEL_WIDTH,0)
        self.scene.addPath(path, pen_clear, brush_clear)

        left_x_orig  = 0
        right_x_orig = l_max_size + SENT_VERB_SPACE

        self.l_np_count = 0
        self.r_np_count = 0

        self.is_para_break = False
        if type(sent_data[0]) == str and sent_data[0] == '\n':    # paragraph break
            self.scene.setBackgroundBrush(QBrush(QColor(views.default_ui_background_color)))
            self.setFixedHeight(PARA_LABEL_HEIGHT)

            font = self.font() 
            # if platform.system() == 'Windows':            
            #     font.setPointSizeF(8)
            # else:
            #     font.setPointSizeF(11)
            font_size = views.default_ui_font_size * 0.9
            font.setPointSizeF(font_size)

            brush_label = QBrush(QColor(views.default_ui_text_color))
            label = QGraphicsSimpleTextItem("\u00B6{}".format(para_pos))
            label.setPos(3,0)
            label.setBrush(brush_label)
            label.setFont(font)

            self.scene.addItem(label)
            self.is_para_break = True

        elif type(sent_data[0]) == str and sent_data[0] == 'heading':
            self.scene.setBackgroundBrush(Qt.yellow);
        elif type(sent_data[0]) == str and sent_data[0] == 'title':
            self.scene.setBackgroundBrush(Qt.yellow);
        elif type(sent_data[0]) == int:                   # sentence
            # self.scene.setBackgroundBrush(Qt.white);
            self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))

            if sent_data[4] == False:   # it's not a punctuation only sentence that must be skipped.

                analysis = sent_data[2] # get the resuults of the sentence analysis (DSDocument.analyzeSent())

                l_noun_count = len(analysis['L_NOUNS'])  # number of nouns on the left side of the main verb
                r_noun_count = len(analysis['R_NOUNS'])  # number of nouns on the right side of the main verb
                self.l_np_count   = analysis['L_NPS']
                self.r_np_count   = analysis['R_NPS']
                nps          = analysis['NPS']
                bBeVerb      = analysis['BE_VERB']
                mod_cl       = analysis['MOD_CL']

                np_count     = 0

                # LEFT
                if bBeVerb == True:
                    colors = (pen_topic, brush_topic)
                    # if mod_cl is not None and l_np_count < mod_cl[3]:
                    #     print("be + mod_cl")
                    # else:
                    #     print("be")
                    self.is_b_verb = True
                else:
                    colors = (pen_topic, brush_topic)
                    # if mod_cl is not None and r_np_count < mod_cl[3]:
                    #     print("modcl")
                    # else:
                    #     print("normal np")

                np_index = 0
                # xpos = left_x_orig + round(SENT_VIS_PANEL_WIDTH/3) - (SENT_RECT_SIZE+SENT_RECT_HGAP)*l_np_count
                xpos = left_x_orig + l_max_size - (SENT_RECT_SIZE+SENT_RECT_HGAP)*self.l_np_count + SENT_RECT_HGAP
                for i in range(self.l_np_count):
                    r = QRectF(xpos, 1, SENT_RECT_SIZE, SENT_RECT_SIZE)
                    dot = NPRect(r, colors, nps[np_index])
                    self.scene.addItem(dot)
                    xpos += (SENT_RECT_SIZE + SENT_RECT_HGAP)
                    np_index += 1

                np_index = self.l_np_count
                xpos = right_x_orig
                for i in range(self.r_np_count):
                    r = QRectF(xpos, 1, SENT_RECT_SIZE, SENT_RECT_SIZE)
                    dot = NPRect(r, colors, nps[np_index])
                    self.scene.addItem(dot)
                    xpos += (SENT_RECT_SIZE + SENT_RECT_HGAP)
                    np_index += 1

                center_x = right_x_orig - SENT_VERB_SPACE/2.0
                dot_size = 4
                r = QRectF(center_x - VERB_BAR_WIDTH/2.0, 1, VERB_BAR_WIDTH, VERB_BAR_HEIGHT)
                # dot = QGraphicsEllipseItem(r)
                dot = QGraphicsRectItem(r)
                dot.setPen(pen_clear)

                if bBeVerb:
                    dot.setBrush(brush_be_verb)
                else:
                    dot.setBrush(brush_verb)

                self.scene.addItem(dot)

    def mousePressEvent(self, event):
        if self.is_para_break == False:
            self.highlight()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        if self.is_para_break == False:
            self.container.processClicked(self)
        super().mouseReleaseEvent(event)

    def select(self):
        self.is_selected = True
        self.highlight()

    def unselect(self):
        self.is_selected = False
        self.unhighlight()

    def highlight(self):
        self.scene.setBackgroundBrush(QBrush(QColor(views.topic_highlight_color)))

    def unhighlight(self):
        # self.scene.setBackgroundBrush(Qt.white);
        self.scene.setBackgroundBrush(QBrush(QColor(views.default_vis_background_color)))

    def getTopics(self):
        analysis = self.sent_data[2]
        topics = [t[ds_doc.LEMMA] for t in analysis['L_NOUNS'] + analysis['R_NOUNS']]
        return topics

    def getSentPos(self):
        return (self.sent_data[0], self.sent_data[1])

    def getNPCounts(self):
        retrun (self.l_np_count, self.r_np_count)

    def getHtml(self):
        np_positions = list()

        def getNPTag(wpos):
            # print("getNPTag() wpos =", wpos)
            # print("     np_positions =", np_positions)
            for pos in np_positions:
                if wpos == pos[0]:
                    if self.is_b_verb:
                            return "<b style =\"color: " +  views.sent_topic_text_color + ";\">"
                    else:
                        return "<b style =\"color: " +  views.sent_topic_text_color + ";\">"
                elif wpos == pos[1]:
                    return "</b>"
            return ""

        analysis = self.sent_data[2]

        for np in analysis['NOUN_CHUNKS']:
            # print("np.text  =", np.text)
            # print("np.start =", np.start)
            # print("np.end   =", np.end)
            # print("--")
            np_positions.append((np.start, np.end))

        wpos = 0
        sent_dict = self.sent_data[3]

        html_str = "<p style=\"color: " + views.default_text_color + ";\">"

        if self.is_b_verb:
            verb_color = views.sent_be_verb_color
        else:
            verb_color = views.sent_verb_color

        for w in sent_dict['text_w_info']:
            wpos = w[ds_doc.WORD_POS] - self.word_pos_offset - self.sent_pos
            word = w[ds_doc.WORD]

            if word in ds_doc.right_quotes or word in ds_doc.end_puncts:
                html_str = html_str[:-1]
            elif word == "%":
                html_str = html_str[:-1]                

            html_str += getNPTag(wpos)
            if w[ds_doc.DEP] == 'ROOT':
                html_str += "<span style=\"color: " + verb_color + ";\"><b><u>{}</u></b></span>".format(w[ds_doc.WORD])
            else:
                html_str += word

            if word not in ds_doc.left_quotes and word not in ds_doc.hyphen_slash:
                html_str += " "

            wpos += 1            

        html_str += "</p>"

        # print("html_str =", html_str)
        return html_str






