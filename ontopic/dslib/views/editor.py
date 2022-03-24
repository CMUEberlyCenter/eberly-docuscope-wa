#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
class DSTextEditor(QTextEdit):

"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

from PyQt5.QtCore    import Qt, QSizeF, pyqtSignal, pyqtSlot, QTimer, QObject, QEvent, QTextStream
from PyQt5.QtGui     import QTextCursor, QPainter, QFont, QColor, QPixmap, QPalette, QFontMetrics, QFontDatabase
from PyQt5.QtWidgets import QPushButton, QComboBox, QButtonGroup, QRadioButton
from PyQt5.QtWidgets import QApplication, QScrollArea, QDialog, QFileDialog, QTabWidget, QWidgetItem
from PyQt5.QtWidgets import QSlider, QCheckBox, QLabel, QWidget, QMessageBox, QSpacerItem
from PyQt5.QtWidgets import QMainWindow, QTextEdit, QPlainTextEdit, QLineEdit, QProgressDialog, QFrame, QSplashScreen
from PyQt5.QtWidgets import QHBoxLayout, QVBoxLayout, QGridLayout, QFormLayout
from PyQt5.QtWidgets import QAction, QStyleFactory, QSizePolicy, qApp, QStyle, QStyleOption

import threading
from bs4 import BeautifulSoup as bs  

import pprint
pp = pprint.PrettyPrinter(indent=4)

import dslib.views as views
import dslib.models as models
import dslib.models.dict as ds_dict
import dslib.models.document as ds_doc
import controller

class DSTextEditor(QTextEdit):

    appendHtml = pyqtSignal(str)
    appendCompleted = pyqtSignal()

    def __init__(self, status_bar=None, app_win=None, parent=None):

        super(DSTextEditor, self).__init__(parent)

        self.app_win = app_win
        self.controller = None
        
        self.setMinimumWidth(400)
        self.setMinimumHeight(600)
        self.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)

        # Variables for the Text Editor 
        self.pageCount = 0
        self.pageCurr = 0
        self.lastDocumentHeight = 0
        self.documentMargin = 50
        self.filename = ""

        self.local_topics = []

        self.startSelection = -1
        self.endSelection   = -1
        self.selectedPara   = -1
        
        self.setFrameShape(QFrame.NoFrame)

        self.html_str  = None
        self.tags      = None
        self.highlight_nps = False

        self.num_topic_sentences = 0

        self.doc = self.document()     # QDocument

        self.key_para_topics = []
        self.local_only_topics = []
        self.topic_cluster_actions = []

        self.setStyleSheet("DSTextEditor { background-color:" + views.default_vis_background_color + ";" +
                                                 "font-size:" + str(views.editor_normal_font_size) + ";" +
                                           "selection-color: #000;" + 
                                "selection-background-color: " + views.text_highlight_color + ";" +
                                               "margin-left: 0;" +
                                                "margin-top: 0;" +
                                             "margin-bottom: 0;" +
                                              "margin-right: 0;}"

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
                                        "border: none;}"

                # "QScrollBar::down-arrow:vertical, QScrollBar::up-arrow:vertical" + 
                # "QScrollBar::left-arrow:vertical, QScrollBar::right-arrow:vertical" + 
                #                      "{border: none; background: none; color: none;}"

                    )

        self.ds_style    = ''
        self.topic_style = ''
        self.para_style  = ''
        self.sent_style  = ''
        self.impression_style = ''

        self.ds_category_type = 'cluster'
        self.ds_category_highlight_color   = views.ds_cluster_highlight_color
        self.ds_category_highlight_color_a = views.ds_cluster_highlight_color_a

        self.selected_paras       = []   # 1 ore more selected paragraphs
        self.adj_stats_list       = []   # 1 or more adj_stats data
        self.selected_topics      = []   # 1 or more topics
        self.selected_impressions = []
        self.selected_ds_category = []   # single category
        self.selected_sentences   = []   # one sentence only 
        self.selected_word        = None # one word

        self.saved_vscrollbar_pos = 0

        self.sent_counts = []

        self.b_editor_locked = False
        
        self.collocation_window = -1

        # actions
        self.selectionChanged.connect(self.selection)
        self.textChanged.connect(self.changed) 
        self.setUndoRedoEnabled(True)
        self.appendHtml.connect(self.appendHtmlAction)
        self.appendCompleted.connect(self.appendCompletedAction)

        # self.binary_menu_action    = self.app_win.binary_menu_action
        # self.binary_menu_action.triggered.connect(lambda state, 
            # arg=topicview.DSTemporalView.BINARY: self.graphingOptionChanged(arg))

    def updateContextMenu(self, topic_clusters):
        if topic_clusters is None:
            return

        self.topic_cluster_actions = list()
        for tc in topic_clusters:
            tc_label = tc.replace('_', ' ')
            action = QAction(tc_label, self)        
            action.triggered.connect(lambda state, arg=tc_label: self.addPhraseToTopicCluster(arg))
            self.topic_cluster_actions.append(action)
            
    def addPhraseToTopicCluster(self, topic_cluster):
        cursor = self.textCursor()
        selected_text = cursor.selectedText()
        self.controller.addPhraseToTopicCluster(topic_cluster, selected_text)

    def contextMenuEvent(self, event):
        menu = self.createStandardContextMenu()

        cursor = self.textCursor()
        selected_text = cursor.selectedText()
        if self.topic_cluster_actions != [] and selected_text:
            self.sub_menu = menu.addMenu("Add selection to Topic Cluster")
            for action in self.topic_cluster_actions:
                self.sub_menu.addAction(action)

        menu.exec(event.globalPos())

    ####################################
    # Events
    ####################################

    def getPixmap(self):
        pixmap = QPixmap(self.size())
        self.render(pixmap)        
        return pixmap

    def changed(self):
        if self.b_editor_locked == False:
            self.controller.setTextEdited(True)

    def mousePressEvent(self, e):
        self.controller.updateCategoryField(None)
        return super().mousePressEvent(e)

    def mouseDoubleClickEvent(self, e):
        """
        Select a docuscope pattern, and display its caregory (i.e., cluster, dimension, lat)
        in the UI (under the editor).
        """
        if self.tags is None:  # Most likely, the textual analysis has not been done yet.
            return super().mouseDoubleClickEvent(e)

        cursor = self.cursorForPosition(e.pos())
        cursor.select(QTextCursor.WordUnderCursor)
        para_pos = cursor.blockNumber()
        char_pos = cursor.positionInBlock() - 1

        is_shift_pressed = False
        if e.modifiers() & Qt.ShiftModifier:
            is_shift_pressed = True

        for tag in self.tags[para_pos]:

            pos = tag[0]            
            if pos[0] <= char_pos and char_pos <= pos[1]:

                if tag[2][0] == None:
                    # error
                    self.controller.updateCategoryField("<b>{}</b> is not in the dictionary.".format(tag[1]))
                    cursor.movePosition(QTextCursor.StartOfBlock)
                    cursor.movePosition(QTextCursor.Right, QTextCursor.MoveAnchor, pos[0])
                    cursor.movePosition(QTextCursor.Right, QTextCursor.KeepAnchor, pos[1]-pos[0])
                    self.setTextCursor(cursor)

                    return
                elif is_shift_pressed:
                    # if the shift key is pressed, reprot all 3 levels,
                    cat_string = "<b>{}</b> ({} > {} > {})".format(tag[1], tag[2][0], tag[2][1], tag[2][2])
                    self.controller.updateCategoryField(cat_string)
                    cursor.movePosition(QTextCursor.StartOfBlock)
                    cursor.movePosition(QTextCursor.Right, QTextCursor.MoveAnchor, pos[0])
                    cursor.movePosition(QTextCursor.Right, QTextCursor.KeepAnchor, pos[1]-pos[0])
                    self.setTextCursor(cursor)
                    return
                elif tag[2][0] in ds_dict.ignored_clusters:
                    # if the cluster is in the ignored_clusters list,
                    self.controller.updateCategoryField("<b>{}</b> is not in the dictionary.".format(tag[1]))
                    cursor.movePosition(QTextCursor.StartOfBlock)
                    cursor.movePosition(QTextCursor.Right, QTextCursor.MoveAnchor, pos[0])
                    cursor.movePosition(QTextCursor.Right, QTextCursor.KeepAnchor, pos[1]-pos[0])
                    self.setTextCursor(cursor)

                    return
                else:
                    c_label = self.controller.getClusterLabel(tag[2][0])
                    d_label = self.controller.getDimensionLabel(tag[2][1])
                    # cat_string = "<b>{}</b> ({} > {})".format(tag[1], tag[2][0], tag[2][1])
                    cat_string = "<b>{}</b> ({} > {})".format(tag[1], c_label, d_label)
                    self.controller.updateCategoryField(cat_string)
                    cursor.movePosition(QTextCursor.StartOfBlock)
                    cursor.movePosition(QTextCursor.Right, QTextCursor.MoveAnchor, pos[0])
                    cursor.movePosition(QTextCursor.Right, QTextCursor.KeepAnchor, pos[1]-pos[0])
                    self.setTextCursor(cursor)

                    return

        return super().mouseDoubleClickEvent(e)


    ####################################
    # Set methods
    ####################################   

    def setCollocationWindow(self, val):
        self.collocation_window = val

    def setSentCounts(self, counts):
        self.sent_counts = counts

    def setTopicSentenceHighlight(self, num):
        self.num_topic_sentences = num

    def setKeyParaTopics(self, topics):
        self.key_para_topics = topics

    ###
    def removeLocalTopics(self, removed_topics):
        for t in removed_topics:

            if t in self.local_topics:
                self.local_topics.remove(t)

            # if t in self.selected_topics:
                # self.selected_topics.remove(t)

    def addLocalTopics(self, added_topics):

        for t in added_topics:

            if t in self.local_topics:
                self.local_topics.append(t)

            # if t in self.selected_topics:
                # self.selected_topics.append(t)

    ###

    def setLocalTopics(self, topics):
        self.local_topics = topics   # these are local ONLY topics

    def setController(self, c):
        self.controller = c
        self.collocation_window = self.controller.getCollocationWindow()

    def setDictionary(self, d):
        self.dictionary = d

    @pyqtSlot()
    def appendCompletedAction(self):
        self.refresh()
        self.restoreVScrollBarPos()
        self.b_editor_locked = False

    @pyqtSlot(str)
    def appendHtmlAction(self, html_str):
        self.insertHtml(html_str)
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.End)

    def htmlUpdate(self, html_paras, i):
        if i < len(html_paras):
            self.appendHtml.emit(str(html_paras[i]))
            self.htmlUpdateThread = threading.Timer(0, self.htmlUpdate, [html_paras, i+1]).start()
        else:
            self.appendCompleted.emit()

    def setData(self, html_str, tags, thread=True, reset_styles=True):

        self.b_editor_locked = True

        self.html_str = html_str
        self.tags = tags

        self.selected_paras = []

        bParaCrossingPattern = False
        bTagOpen = False

        soup = bs(self.html_str, "html.parser")
        html_paras = soup.find_all('p')

        if reset_styles:
            self.resetStyles()   

        self.clear()
        if thread:
            self.htmlUpdateThread = threading.Timer(0, self.htmlUpdate, [html_paras, 0]).start()
        else:
            self.setHtml(html_str)

    def setDefaultStyleSheet(self, s):
        if self.doc is not None:
            self.doc.setDefaultStyleSheet(s)        

    def setFontSize(self, fsize):
        """
        Set the font size to 'fsize' selected by the user. All the paragraph highlights
        are cleared, but other highlights if any (i.e., the selected docuscope category and 
        the selected topic) are not changed.
        """
        views.setNormalFontSize(fsize)

    ####################################
    # set functions for stylesheet related data
    ####################################

    def setAdjacencyStatsList(self, adj_stats_list):
        self.adj_stats_list = adj_stats_list

    def setSelectedTopics(self, topics):
        self.selected_topics = topics

    def setSelectedDSCategory(self, clust_name, dim_name, lat_name):
        self.selected_ds_category = [clust_name, dim_name, lat_name]

    def setSelectedImpressions(self, impressions):
        self.selected_impressions = impressions

    def setSelectedParagraphs(self, paragraphs):
        self.selected_paras = paragraphs

    def setSelectedSentences(self, sentences, nps=False):
        self.selected_sentences = sentences
        self.highlight_nps = nps

    def setSelectedWord(self, word_data):
        self.selected_word = word_data      

    def setDSColors(self, category_type):

        if self.ds_category_type == category_type:
            return
        else: 
            if category_type == 'cluster':
                self.ds_category_highlight_color   = views.ds_cluster_highlight_color
                self.ds_category_highlight_color_a = views.ds_cluster_highlight_color_a
            elif category_type == 'dimension':
                self.ds_category_highlight_color   = views.ds_dimension_highlight_color
                self.ds_category_highlight_color_a = views.ds_dimension_highlight_color_a

            self.ds_category_type = category_type

        self.updateStylesheet()

    ####################################
    # get functions
    ####################################

    def getSelectedPara(self):
        return self.selectedPara

    def getSelection(self):
        return {"start": self.startSelection, "end": self.endSelection}

    ####################################
    # Geometry
    ####################################

    def updateMargins(self):
        doc = self.document()
        rootFrame = doc.rootFrame()
        fmt = rootFrame.frameFormat()
        fmt.setMargin(self.documentMargin)
        rootFrame.setFrameFormat(fmt)   

    ####################################
    # Scrolling
    ####################################

    def scrollToTop(self):
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.Start,      QTextCursor.MoveAnchor, 0)
        self.setTextCursor(cursor)

    def scrollToParagraph(self, para):
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.Start,      QTextCursor.MoveAnchor, 0)
        cursor.movePosition(QTextCursor.NextBlock,  QTextCursor.MoveAnchor, para-1)
        if para > 3:
            cursor.movePosition(QTextCursor.EndOfBlock, QTextCursor.MoveAnchor)
        # cursor.movePosition(QTextCursor.Down      , QTextCursor.MoveAnchor, 5)
        self.setTextCursor(cursor)

    ####################################
    # Select/Unselect a text segment
    ####################################

    def selection(self):
        cursor = self.textCursor()
        para = cursor.blockNumber() + 1

        start = cursor.selectionStart()            
        end   = cursor.selectionEnd()

        first_char = -1
        qtdoc = self.document()
        it = qtdoc.begin()
        while it != qtdoc.end():
            #para_str = it.text()
            if it.blockNumber()+1 == para:
                first_char = it.position()
                break
            it = it.next()
            
        if first_char >= 0:
            self.startSelection = start - first_char
            self.endSelection   = end - first_char
        else:
            self.startSelection = -1
            self.endSelection -1

        self.selectedPara = para

    def clearParagraphHighlights(self):
        self.selected_paras = []
        attr = 'background-color: transparent; color: {};'.format(views.default_text_color)
        self.para_style = 'p {' + attr + '}\n'
        self.selected_paras       = []

    def clearTopicHighlights(self):
        self.topic_style = ''
        self.sent_style  = ''
        self.adj_stats_list       = []
        self.selected_topics      = []
        self.impression_style = ''

    def clearDSHighlights(self):
        self.ds_style = ''
        self.selected_ds_category = []
        self.selected_impressions = []

    def clearHighlights(self):
        self.resetStyles()

    def refresh(self):
        """
        We don't need to call setHTML if styesheet hasn't been changed.
        """
        is_edited = self.controller.isTextEdited()
        self.setHtml(self.html_str)
        self.controller.setTextEdited(is_edited)

    def reset(self):
        self.clear()
        self.resetStyles()

        # reset the vvariables
        self.pageCount = 0
        self.pageCurr = 0
        self.lastDocumentHeight = 0
        self.documentMargin = 50
        self.filename = ""

        self.startSelection = -1
        self.endSelection   = -1
        self.selectedPara   = -1
        
        self.html_str  = None
        self.tags      = None
        self.highlight_nps = False

        self.key_para_topics = []

    def isEmpty(self):
        if self.b_editor_locked:
            return False

        text = self.toPlainText()
        text = text.strip()
        if text == '':
            return True
        else:
            return False

    ####################################
    # Highlighting
    ####################################

    def resetStyles(self):
        """
        Resets the paragraph style to the default settings, and clear all the 
        other styles (i.e., highlights). This method does NOT call setHtml() so
        it does NOT update the editor visually.
        """

        self.ds_style    = ''
        self.topic_style = ''
        self.impression_style = ''
        self.sent_style  = ''
        self.topic_sent_style  = ''

        self.selected_paras       = []
        self.adj_stats_list       = []
        self.selected_topics      = []
        self.selected_impressions = []
        self.selected_ds_category = []
        self.selected_sentences   = []
        self.selected_word        = None

#        attr = 'background-color: transparent; color: {}; font-size: {}pt;'.format(views.default_text_color, views.editor_normal_font_size)
        attr = 'background-color: transparent; color: {};'.format(views.default_text_color)
        self.para_style = 'p {' + attr + '}\n'

        style = self.para_style + self.sent_style + self.ds_style + self.topic_style + self.topic_sent_style + self.impression_style + '\n'

        # print('resetStyles()')
        # print("    style = \n", style)
        # print("\n")

        self.doc.setDefaultStyleSheet(style)

    def updateStylesheet(self):
        """
        This method highlights one or more paragraphs that are currently selected by the user.
        """
        # print("\n----------------------------------------")
        # print("DSTextEditor.updateStylesheet()")
        # print("    self.selected_paras      =", self.selected_paras)
        # print("    self.selected_sentences  =", self.selected_sentences)
        # print("    self.selected_topics     =", self.selected_topics)
        # print("    self.selected_impressions=", self.selected_impressions)
        # print("    self.local_topics        =", self.local_topics)  # local only topics
        # print("    self.num_topic_sentences =", self.num_topic_sentences)

        is_shift_pressed = self.controller.isShiftKeyPressed()
        if is_shift_pressed:
            self.controller.setMessage("Collocation window is ignored.")            
        else:
            self.controller.setMessage('')            
        # --------------------------------------------
        # Paragraph
        # --------------------------------------------
        s = ''
        if self.selected_paras:
            # one or more paragraphs are selected.
            attr = 'background-color: transparent; color: {};'.format(views.default_text_color_a)
            s = 'p {' + attr + '}\n'

            if self.selected_sentences == []:
                for para_id in self.selected_paras:
                    s += 'p.p{},'.format(para_id)

                if s and s[-1] == ',':
                    s = s[:-1]

                s += " {"
                s += 'background-color: transparent; color: {};'.format(views.default_text_color)
                s += "}\n"
        else:
            # no paragraphs are selected
            attr = 'background-color: transparent; color: {};'.format(views.default_text_color)
            s = 'p {' + attr + '}\n'

        self.para_style = s

        # --------------------------------------------
        # Topics
        # --------------------------------------------
        s = ''
        if self.selected_topics:      # At least one topic is selected.
            ks = '' # key topics
            ns = '' # non key topics

            if self.selected_paras:   # at least one paragraph is selected, ...
                # Make all the topic words to be faded, to start with.
                for topic in self.selected_topics:
                    if topic in self.local_topics:
                        ks +=  't.{},'.format(topic.replace('.', ''))   # ks = local topic
                    else:
                        ns +=  't.{},'.format(topic.replace('.', ''))   # ns = global topic

                if ns and ns[-1] == ',':
                    ns = ns[:-1]

                if ks and ks[-1] == ',':
                    ks = ks[:-1]

                if ns:
                    ns += ' {'
                    ns += 'font-weight: bold; color: {}; '.format(views.global_topic_color_a)
                    ns += '}\n'                

                if ks:
                    ks += ' {'
                    ks += 'font-weight: bold; color: {}; '.format(views.local_topic_color_a)
                    ks += '}\n' 

                # Overwrite topic words that are in the selecte paragraphs...
                # This section highlights the topic words
                b_ks_overwrite = False
                b_ns_overwrite = False
                for adj_stats in self.adj_stats_list:
                    topic_paras, topic_sents = adj_stats.getParaSentIDs()
                    topic = adj_stats.getTopic()
                    for t in topic_sents: 
                        para_pos = t[0]
                        sent_pos = t[1]

                        if self.selected_sentences == [] and para_pos in self.selected_paras:
                            # no selected sentence. it's a selected para
                            if topic in self.local_topics:
                                ks += 'p.p{} sent.p{}.s{} t.{},'.format(para_pos, para_pos, sent_pos, topic.replace('.', ''))
                                b_ks_overwrite = True
                            else:
                                ns += 'p.p{} sent.p{}.s{} t.{},'.format(para_pos, para_pos, sent_pos, topic.replace('.', ''))
                                b_ns_overwrite = True

                        elif para_pos in self.selected_paras:
                            b_selected = False
                            for sent_info in self.selected_sentences:
                                if sent_info[2]+1 == sent_pos:
                                    b_selected = True
                            if b_selected:
                                # there is a selected sentenc and we are in the selected paragraph
                                if topic in self.local_topics:
                                    ks += 'p.p{} sent.p{}.s{} t.{},'.format(para_pos, para_pos, sent_pos, topic.replace('.', ''))
                                    b_ks_overwrite = True
                                else:
                                    ns += 'p.p{} sent.p{}.s{} t.{},'.format(para_pos, para_pos, sent_pos, topic.replace('.', ''))
                                    b_ns_overwrite = True

                if b_ns_overwrite:
                    if ns and ns[-1] == ',':
                        ns = ns[:-1]

                    ns += ' {'
                    ns += 'font-weight: bold; color: {}; '.format(views.global_topic_color)
                    ns += '}\n'                

                if b_ks_overwrite:
                    if ks and ks[-1] == ',':
                        ks = ks[:-1]

                    ks += ' {'
                    ks += 'font-weight: bold; color: {}; '.format(views.local_topic_color)
                    ks += '}\n' 

                #
                # This section highlights the sentences with collocations
                #

                # find the sentences that include the selected cluster
                category_sents = []
                # if self.selected_ds_category and self.selected_ds_category[0] is not None:
                #     selected_cluster = self.selected_ds_category[0]                  
                #     cluster_sents = self.controller.getSentencesWithCluster(selected_cluster)

                if self.selected_ds_category and self.selected_ds_category[0] is not None:
                    selected_cluster = self.selected_ds_category[0]                   
                    selected_dimension = self.selected_ds_category[1]
                    if selected_dimension is None:
                        category_sents = self.controller.getSentencesWithCluster(selected_cluster)
                    elif selected_dimension is not None:
                        category_sents = self.controller.getSentencesWithDimension(selected_cluster, selected_dimension)

                a = ''
                if self.selected_sentences != []:
                    for sent_info in self.selected_sentences:
                        if sent_info[0] in self.selected_paras:
                            if category_sents != [] and sent_info not in category_sents:
                                para_pos = sent_info[0]
                                sent_pos = sent_info[1]
                                a =  'p.p{} sent.p{}.s{}'.format(para_pos, para_pos, sent_pos)
                                a += ' {' 
                                a += 'color: {}; background-color: {};'.format(views.sent_text_color, 
                                                                              views.default_vis_background_color)
                                a += '}\n'
                            else:        # ..
                                para_pos = sent_info[0]
                                sent_pos = sent_info[1]
                                a =  'p.p{} sent.p{}.s{}'.format(para_pos, para_pos, sent_pos)
                                a += ' {' 
                                a += 'color: {}; background-color: {};'.format(views.sent_text_color, 
                                                                              views.sent_highlight_color)
                                a += '}\n'

                s += ns + ks + a

            else: # no paragraphs are selected
                if self.num_topic_sentences == 0:
                    # the topic sentence option is OFF
                    # ns: global topic
                    # ks: local topic
                    for topic in self.selected_topics:
                        if topic in self.local_topics:
                            ks +=  't.{},'.format(topic.replace('.', ''))
                        else:
                            ns +=  't.{},'.format(topic.replace('.', ''))

                    if ks and ks[-1] == ',':
                        ks = ks[:-1]

                    if ns and ns[-1] == ',':
                        ns = ns[:-1]

                    if ns:
                        ns += ' {'
                        ns += 'font-weight: bold; color: {}; '.format(views.global_topic_color)
                        ns += '}\n'                

                    if ks:
                        ks += ' {'
                        if self.controller.persistentTopicsHighlighted():
                            ks += 'font-weight: bold; color: {}; '.format(views.local_topic_color)
                        else:
                            ks += 'font-weight: bold; color: {}; '.format(views.local_topic_color)
                        ks += '}\n' 

                    s += ks + ns

                else:
                    # the topic sentence option is ON (1 or 2)
                    ks_t = ''
                    ns_t = ''

                    for topic in self.selected_topics:
                        if topic in self.local_topics:
                            ks +=  't.{},'.format(topic.replace('.', ''))
                        else:
                            ns +=  't.{},'.format(topic.replace('.', ''))

                    num_paras = len(self.sent_counts)
                    for p_id in range(num_paras):
                        for s_id in range(self.sent_counts[p_id]):
                            if s_id >= self.num_topic_sentences:
                                for topic in self.selected_topics:
                                    if topic in self.local_topics:
                                        ks_t += 't.{}.p{}.s{},'.format(topic.replace('.', ''), p_id+1, s_id+1)
                                    else:
                                        ns_t += 't.{}.p{}.s{},'.format(topic.replace('.', ''), p_id+1, s_id+1)

                    if ks_t and ks_t[-1] == ',':
                        ks_t = ks_t[:-1]

                    if ns_t and ns_t[-1] == ',':
                        ns_t = ns_t[:-1]

                    if ns_t:
                        ns_t += ' {'
                        ns_t += 'font-weight: bold; color: {}; '.format(views.global_topic_color_a)
                        ns_t += '}\n'                

                    if ks_t:
                        ks_t += ' {'
                        ks_t += 'font-weight: bold; color: {}; '.format(views.local_topic_color_a)
                        ks_t += '}\n' 

                    if ks and ks[-1] == ',':
                        ks = ks[:-1]

                    if ns and ns[-1] == ',':
                        ns = ns[:-1]

                    if ns:
                        ns += ' {'
                        ns += 'font-weight: bold; color: {}; '.format(views.global_topic_color)
                        ns += '}\n'                

                    if ks:
                        ks += ' {'
                        ks += 'font-weight: bold; color: {}; '.format(views.local_topic_color)
                        ks += '}\n' 

                    s += ks + ns + ks_t + ns_t

        elif self.selected_word is not None:
            # A single word is selected (?? Is it used?)

            s =  't.{}.p{}.s{} '.format(self.selected_word[ds_doc.LEMMA].replace('.',''), 
                                        self.selected_word[ds_doc.PARA_POS], 
                                        self.selected_word[ds_doc.SENT_POS])
            s += '{'
            if self.selected_paras:
                if self.selected_word[ds_doc.PARA_POS] in self.selected_paras:
                    s += 'font-weight: bold; color: {};'.format(views.global_topic_color)
                else:
                    s += 'font-weight: bold; color: {};'.format(views.global_stopic_color_a)
            else:
                s += 'font-weight: bold; color: {};'.format(views.global_topic_color)                
            s += '}'

        self.topic_style = s

        # --------------------------------------------
        # Sent / Highlight Sentences
        # --------------------------------------------
        s = ''
        if self.selected_topics and self.adj_stats_list:
            # At least one topic is selected by the user.

            if self.selected_paras:
                # if at least oen paragraph is selected, ...

                # find a list of sentences that includes the selected cluster
                category_sents = []

                if self.selected_ds_category and self.selected_ds_category[0] is not None:
                    selected_cluster = self.selected_ds_category[0]                   
                    selected_dimension = self.selected_ds_category[1]
                    if selected_dimension is None:
                        category_sents = self.controller.getSentencesWithCluster(selected_cluster)
                    elif selected_dimension is not None:
                        category_sents = self.controller.getSentencesWithDimension(selected_cluster, selected_dimension)
                        
                    if category_sents != []:
                        for adj_stats in self.adj_stats_list:                    
                            # We are only highlighitng the sentences that include the selected cluster,
                            # which is within an 'n' distance from the topic.
                            topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos)
                            for t in topic_positions:
                                # for each sentence where the topic appears.

                                b_match = False
                                for category_sent in category_sents:
                                    # for each sentence with the selected cluster, check if the current topic is in it.
                                    if t[:2] == category_sent[:2]: 
                                        b_match = True
                                        matched_sent = category_sent
                                        break

                                if b_match == False:
                                    continue

                                topic_pos = t[2]            # position of the topic within the sentence
                                exper_pos = matched_sent[2] # position of the DS pattern within the sentence

                                if is_shift_pressed == False and self.collocation_window > 0:   
                                    # if the collocation window is valid, we only highlight if the experience patter
                                    # is within the window. Otherwise, we highlight all the matches in the sentence.
                                    if  (topic_pos - self.collocation_window) > exper_pos or \
                                         exper_pos > (topic_pos + self.collocation_window):
                                        continue

                                para_pos = t[0]
                                sent_pos = t[1]
                                s += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                        if s and s[-1] == ',':
                            s = s[:-1]

                        s  += " {"
                        s += 'background-color: {};'.format(views.sent_highlight_color_a)
                        s  += "}\n"


                        # Overwrite the style for the sentences in the selected paragraph(s)
                        count = 0
                        ts = ''
                        for para_id in self.selected_paras:

                            for adj_stats in self.adj_stats_list:

                                topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos) 
                                for t in topic_positions:    # for each sentence that includes the topic.
                                    b_match = False
                                    for category_sent in category_sents:
                                        # for each sentence with the selected cluster, check if the current topic is in it.
                                        if t[:2] == category_sent[:2]: 
                                            b_match = True
                                            matched_sent = category_sent
                                            break

                                    if b_match == False:
                                        continue

                                    topic_pos = t[2]            # position of the topic within the sentence
                                    exper_pos = matched_sent[2] # position of the DS pattern within the sentence

                                    if is_shift_pressed == False and self.collocation_window > 0:   
                                        # if the collocation window is valid, we only highlight if the experience patter
                                        # is within the window. Otherwise, we highlight all the matches in the sentence.
                                        if  (topic_pos - self.collocation_window) > exper_pos or \
                                             exper_pos > (topic_pos + self.collocation_window):
                                            continue

                                    para_pos = t[0]
                                    sent_pos = t[1]

                                    if self.selected_sentences == [] and para_pos in self.selected_paras:
                                        ts += 'p.p{} sent.p{}.s{},'.format(para_id, para_pos, sent_pos)
                                        count += 1
                                    elif para_pos in self.selected_paras:
                                        for sent_info in self.selected_sentences:
                                            if sent_info[1] == sent_pos:
                                                ts += 'p.p{} sent.p{}.s{},'.format(para_id, para_pos, sent_pos)
                                                count += 1

                        if count > 0:
                            if ts and ts[-1] == ',':
                                ts = ts[:-1]

                            s += ts    
                            s += " {"
                            s += 'color: {}; background-color: {};'.format(views.sent_text_color, 
                                                                           views.sent_highlight_color)
                            # s += 'background-color: {};'.format(views.sent_highlight_color)
                            s += "}\n"

                else:
                    # no ds categories are selected
                    for adj_stats in self.adj_stats_list:                    
                        topic_paras, topic_sents = adj_stats.getParaSentIDs()
                        for t in topic_sents: 
                            para_pos = t[0]
                            sent_pos = t[1]
                            s += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                    if s and s[-1] == ',':
                        s = s[:-1]

                    s  += " {"
                    s += 'background-color: {};'.format(views.sent_highlight_color_a)
                    s  += "}\n"

                    # Overwrite the style for the sentences in the selected paragraph(s)
                    count = 0
                    ts = ''
                    for para_id in self.selected_paras:
                        for adj_stats in self.adj_stats_list:
                            topic_paras, topic_sents = adj_stats.getParaSentIDs()
                            for t in topic_sents: 
                                para_pos = t[0]
                                sent_pos = t[1]

                                if self.selected_sentences == [] and para_pos in self.selected_paras:
                                    ts += 'p.p{} sent.p{}.s{},'.format(para_id, para_pos, sent_pos)
                                    count += 1
                                elif para_pos in self.selected_paras:
                                    for sent_info in self.selected_sentences:
                                        if sent_info[1] == sent_pos:
                                            ts += 'p.p{} sent.p{}.s{},'.format(para_id, para_pos, sent_pos)
                                            count += 1

                    if count > 0:
                        if ts and ts[-1] == ',':
                            ts = ts[:-1]

                        s += ts    
                        s += " {"
                        s += 'color: {}; background-color: {};'.format(views.sent_text_color, 
                                                                       views.sent_highlight_color)
                        # s += 'background-color: {};'.format(views.sent_highlight_color)
                        s += "}\n"


            elif self.num_topic_sentences > 0:
                # No paragraphs are selected; but topic sentences are highlighted. 
                # So, we need to fade no topic sentences.

                s_fade = ''
                for adj_stats in self.adj_stats_list:
                    topic_paras, topic_sents = adj_stats.getParaSentIDs()
                    for t in topic_sents: 
                        para_pos = t[0]
                        sent_pos = t[1]

                        if sent_pos <= self.num_topic_sentences:
                            s += 'sent.p{}.s{},'.format(para_pos, sent_pos)
                        else:
                            s_fade += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                if s and s[-1] == ',':
                   s = s[:-1]

                if s_fade and s_fade[-1] == ',':
                   s_fade = s_fade[:-1]

                if s:
                    s += " {"
                    s += 'background-color: {};'.format(views.sent_highlight_color)
                    s += "}\n"

                if s_fade:
                    s_fade += " {"
                    s_fade += 'background-color: {};'.format(views.sent_highlight_color_a)
                    s_fade += "}\n"

                s = s + s_fade

            elif self.selected_impressions:
                # if there are any selected impressions
                # highlight the senteces that includes both the topics and impressions
                impression = self.selected_impressions[0]
                impression_sents = self.controller.getSentencesWithImpression(impression)

                if self.selected_topics and self.adj_stats_list:
                    # a topic is selected
                    for adj_stats in self.adj_stats_list:
                        topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos)

                        for t in topic_positions:
                            b_match = False
                            for impression_sent in impression_sents:
                                # for each sentence with the selected impression, check if the current topic is in it.
                                if t[:2] == impression_sent[:2]: 
                                    b_match = True
                                    matched_sent = impression_sent
                                    break

                            if b_match == False:
                                continue

                            sent_pos  = matched_sent[1]
                            para_pos  = matched_sent[0]
                            s += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                if s and s[-1] == ',':
                    s = s[:-1]

                if s:
                    s  += " {"
                    s += 'background-color: {};'.format(views.sent_highlight_color)
                    s  += "}\n"

            else:
                # No paragraphs are selected. So, we won't worry about fading sentences.
                # find a list of sentences that includes the selected cluster
                if self.selected_ds_category and self.selected_ds_category[0] is not None:
                    category_sents = []
                    selected_cluster = self.selected_ds_category[0]
                    category_sents = self.controller.getSentencesWithCluster(selected_cluster)

                    if category_sents != []:
                        for adj_stats in self.adj_stats_list:

                            # We are only highlighitng the sentences that include the selected cluster,
                            # which is within an 'n' distance from the topic.
                            topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos)
                            for t in topic_positions:
                                # for each sentence where the topic appears.

                                b_match = False
                                for category_sent in category_sents:
                                    # for each sentence with the selected cluster, check if the current topic is in it.
                                    if t[:2] == category_sent[:2]: 
                                        b_match = True
                                        matched_sent = category_sent
                                        break

                                if b_match == False:
                                    continue

                                topic_pos = t[2]            # position of the topic within the sentence
                                exper_pos = matched_sent[2] # position of the DS pattern within the sentence

                                if is_shift_pressed == False and self.collocation_window > 0:   
                                    # if the collocation window is valid, we only highlight if the experience patter
                                    # is within the window. Otherwise, we highlight all the matches in the sentence.
                                    if  (topic_pos - self.collocation_window) > exper_pos or \
                                         exper_pos > (topic_pos + self.collocation_window):
                                        continue

                                para_pos = t[0]
                                sent_pos = t[1]
                                s += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                        if s and s[-1] == ',':
                           s = s[:-1]
                        s  += " {"
                        s += 'background-color: {};'.format(views.sent_highlight_color)  #### EXPERIMENT TEMPORARY
                        s  += "}\n"

                else:
                    for adj_stats in self.adj_stats_list:
                        selected_cluster = None

                        # We are only highlighitng the sentences that include the selected cluster.
                        topic_paras, topic_sents = adj_stats.getParaSentIDs(clust_filter=selected_cluster)

                        for t in topic_sents: 
                            para_pos = t[0]
                            sent_pos = t[1]
                            s += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                    if s and s[-1] == ',':
                       s = s[:-1]
                    s  += " {"
                    s += 'background-color: {};'.format(views.sent_highlight_color)  #### EXPERIMENT TEMPORARY
                    s  += "}\n"

        elif self.selected_sentences:
            # No topics are selected, but at least one sentence is selected.
            for sent_info in self.selected_sentences:
                s += 'sent.p{}.s{} '.format(sent_info[0], sent_info[1])

                s += ' {'

                if self.selected_paras: # there are selected paragraphs
                    if sent_info[0] in self.selected_paras:
                        s += 'color: {}; background-color: {};'.format(views.sent_text_color, 
                                                                       views.sent_highlight_color)
                    else:
                        s += 'color: {}; background-color: {};'.format(views.sent_text_color_a, 
                                                                       views.sent_highlight_color_a)

                else: # no paragraphs are selected
                    s += 'color: {}; background-color: {};'.format(views.sent_text_color, 
                                                                   views.sent_highlight_color)
                s += '}\n'

            if self.highlight_nps:
                for sent_info in self.selected_sentences:
                    s += 'sent.p{}.s{} np'.format(sent_info[0], sent_info[1])
                    s += '{'
                    s += 'font-weight: bold; color: {};'.format(views.np_color)
                    s += '}\n'

                    s += 'sent.p{}.s{} root'.format(sent_info[0], sent_info[1])
                    s += '{'
                    s += 'font-weight: bold; color: {};'.format(views.root_verb_color)
                    s += '}\n'

        elif self.selected_word is not None:
            # A word is selected.
            s += 'sent.p{}.s{}'.format(self.selected_word[ds_doc.PARA_POS], self.selected_word[ds_doc.SENT_POS])
            s += '{'
            if self.selected_paras:
                if self.selected_word[ds_doc.PARA_POS] in self.selected_paras:
                    s += 'background-color: {};'.format(views.sent_highlight_color)
                else:
                    s += 'background-color: {};'.format(views.sent_highlight_color_a)
            else:
               s += 'background-color: {};'.format(views.sent_highlight_color)

            s += '}\n'

        if self.selected_topics == [] \
            and self.selected_ds_category and self.selected_ds_category[0] is not None:

            selected_cluster = self.selected_ds_category[0]
            sents = self.controller.getSentencesWithCluster(selected_cluster)

            if sents is not None:
                for t in sents: 
                    para_pos = t[0]
                    sent_pos = t[1]
                    s += 'sent.p{}.s{},'.format(para_pos, sent_pos)

                if s and s[-1] == ',':
                   s = s[:-1]
                s  += " {"
                s += 'background-color: {};'.format(views.sent_highlight_color)  #### EXPERIMENT TEMPORARY
                s  += "}\n"

        self.sent_style = s

        # --------------------------------------------
        # Unhighlight Non-Topic Sentences
        # --------------------------------------------
        s = ''
        if self.num_topic_sentences > 0:
            count = 0
            num_paras = len(self.sent_counts)
            for p_id in range(num_paras):
                for s_id in range(self.sent_counts[p_id]):
                    if s_id >= self.num_topic_sentences:
                        s += 'sent.p{}.s{},'.format(p_id+1, s_id+1)
                        count += 1

            if count > 0:
                if s and s[-1] == ',':
                    s = s[:-1]

                s += " {"
                s += 'color: {};'.format(views.default_text_color_a)
                s += "}\n"

        self.topic_sent_style = s

        # --------------------------------------------
        # DocuScope Categories
        # --------------------------------------------
        s = ''
        if self.selected_ds_category:

            category_sents = []
            selected_cluster = self.selected_ds_category[0]
            category_sents = self.controller.getSentencesWithCluster(selected_cluster)

            if category_sents != [] and self.selected_paras:
                clust_name = self.selected_ds_category[0]
                dim_name   = self.selected_ds_category[1]
                lat_name   = self.selected_ds_category[2]

                if self.selected_topics and self.adj_stats_list:   # at least one topic is selected
                    s_count = 0
                    fs_count = 0
                    s = ''
                    fs = ''

                    # unselected para (faded)
                    for adj_stats in self.adj_stats_list: 
                            topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos)
                            for t in topic_positions:
                                # ------------------------------------------
                                # for each sentence where the topic appears.
                                b_match = False
                                for category_sent in category_sents:
                                    # for each sentence with the selected cluster, check if the current topic is in it.
                                    if t[:2] == category_sent[:2]: 
                                        b_match = True
                                        matched_sent = category_sent
                                        break

                                if b_match == False:
                                    continue

                                topic_pos = t[2]            # position of the topic within the sentence
                                exper_pos = matched_sent[2] # position of the DS pattern within the sentence

                                if is_shift_pressed == False and self.collocation_window > 0:   
                                    # if the collocation window is valid, we only highlight if the experience patter
                                    # is within the window. Otherwise, we highlight all the matches in the sentence.
                                    if  (topic_pos - self.collocation_window) > exper_pos or \
                                         exper_pos > (topic_pos + self.collocation_window):
                                        continue
                            # ------------------------------------------

                                para_pos = t[0]
                                sent_pos = t[1]

                                if para_pos not in self.selected_paras:   # the entire paragraph is faded
                                    if lat_name is not None:
                                        fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                    elif dim_name is not None:
                                        fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                    elif clust_name is not None:
                                        fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                    fs_count += 1

                                elif self.selected_sentences:
                                    b_selected = False
                                    for sent_info in self.selected_sentences:

                                        if sent_info[0] == para_pos and sent_info[1] == sent_pos: 
                                            b_selected = True
                                            break

                                    if b_selected:
                                        # we don't fade the sentence that's selected

                                        if self.num_topic_sentences != 0 and sent_pos <= self.num_topic_sentences:
                                            # if the topic sentence highlight is on and if sent_pos is a topic sentence,
                                            if lat_name is not None:
                                                s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                            elif dim_name is not None:
                                                s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                            elif clust_name is not None:
                                                s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                            s_count += 1
                                        elif self.num_topic_sentences != 0 and sent_pos > self.num_topic_sentences:
                                            if lat_name is not None:
                                                fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                            elif dim_name is not None:
                                                fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                            elif clust_name is not None:
                                                fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                            fs_count += 1                                        
                                        else:
                                            if lat_name is not None:
                                                s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                            elif dim_name is not None:
                                                s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                            elif clust_name is not None:
                                                s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                            s_count += 1
                                    else:
                                        if lat_name is not None:
                                            fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                        elif dim_name is not None:
                                            fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                        elif clust_name is not None:
                                            fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                        fs_count += 1
                                else: 
                                    if self.num_topic_sentences != 0 and sent_pos <= self.num_topic_sentences:
                                        if lat_name is not None:
                                            fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                        elif dim_name is not None:
                                            fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                        elif clust_name is not None:
                                            fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                            fs_count += 1
                                    else:
                                        # don't fade -- no sentences are selected
                                        if lat_name is not None:
                                            s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                        elif dim_name is not None:
                                            s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                        elif clust_name is not None:
                                            s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                        s_count += 1

                    if fs_count > 0:
                        if fs and fs[-1] == ',':
                            fs = fs[:-1]

                        if fs:
                            fs += ' {'
                            fs += 'color: {}; background-color: {};'.format(views.ds_text_color_a, self.ds_category_highlight_color_a)
                            fs += '}\n'

                    if s_count > 0:
                        if s and s[-1] == ',':
                            s = s[:-1]

                        if s:
                            s += ' {'
                            s += 'color: {}; background-color: {};'.format(views.ds_text_color, self.ds_category_highlight_color)
                            s += '}\n'

                    s = fs + s

                else:             # no topics   
                    s = ''
                    fs = ''
                    if lat_name is not None:
                        s += 'ds.{}'.format(lat_name)
                    elif dim_name is not None:
                        s += 'ds.{}'.format(dim_name)
                    elif clust_name is not None:
                        s += 'ds.{}'.format(clust_name)

                    s += ' {'
                    s += 'color: {}; background-color: {};'.format(views.ds_text_color_a, self.ds_category_highlight_color_a)
                    s += '}\n'

                    if self.selected_sentences:
                        for para_id in self.selected_paras:
                            for sent_info in self.selected_sentences:
                                if lat_name is not None:
                                    s += 'sent.p{}.s{} ds.{},'.format(para_id, sent_info[1], lat_name)
                                elif dim_name is not None:
                                    s += 'sent.p{}.s{} ds.{},'.format(para_id, sent_info[1], dim_name)
                                elif clust_name is not None:
                                    s += 'sent.p{}.s{} ds.{},'.format(para_id, sent_info[1], clust_name)
                    else:
                        for para_id in self.selected_paras:
                            if lat_name is not None:
                                s += 'p.p{} ds.{},'.format(para_id, lat_name)
                            elif dim_name is not None:
                                s += 'p.p{} ds.{},'.format(para_id, dim_name)
                            elif clust_name is not None:
                                s += 'p.p{} ds.{},'.format(para_id, clust_name)

                    if s and s[-1] == ',':
                        s = s[:-1]

                    if s:
                        s += ' {'
                        s += 'color: {}; background-color: {};'.format(views.ds_text_color, self.ds_category_highlight_color)
                        s += '}\n'

            # else: # no selected paras
            elif category_sents != []:
                clust_name = self.selected_ds_category[0]
                dim_name   = self.selected_ds_category[1]
                lat_name   = self.selected_ds_category[2]

                # find the sentences that includes a pattern from 'cluster_name'
                category_sents = self.controller.getSentencesWithCluster(clust_name)

                fs = ''
                s = ''
                if self.selected_topics and self.adj_stats_list:
                    # a topic is selected
                    for adj_stats in self.adj_stats_list:
                        # ----------------------------
                        topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos)
                        for t in topic_positions:
                            b_match = False
                            for category_sent in category_sents:
                                # for each sentence with the selected cluster, check if the current topic is in it.
                                if t[:2] == category_sent[:2]: 
                                    b_match = True
                                    matched_sent = category_sent
                                    break

                            if b_match == False:
                                continue

                            topic_pos = t[2]             # position of the topic within the sentence
                            exper_pos = matched_sent[2]  # position of the DS pattern within the sentence

                            if  is_shift_pressed == False and self.collocation_window > 0:
                                if (topic_pos - self.collocation_window) > exper_pos or \
                                    exper_pos > (topic_pos + self.collocation_window):
                                    continue
                        # ----------------------------
                            para_pos = t[0]
                            sent_pos = t[1]

                            if self.num_topic_sentences != 0 and sent_pos <= self.num_topic_sentences:
                                if lat_name is not None:
                                    fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                elif dim_name is not None:
                                    fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                elif clust_name is not None:
                                    fs += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)
                                    fs_count += 1
                            else:
                                if lat_name is not None:
                                    s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, lat_name)
                                elif dim_name is not None:
                                    s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, dim_name)
                                elif clust_name is not None:
                                    s += 'sent.p{}.s{} ds.{},'.format(para_pos, sent_pos, clust_name)                                
                else:
                    # no topic is selected (i.e., Reader Experience Panel)
                    s = ''
                    fs = ''
                    if lat_name is not None:
                        s += 'ds.{}'.format(lat_name)
                    elif dim_name is not None:
                        s += 'ds.{}'.format(dim_name)
                    elif clust_name is not None:
                        s += 'ds.{}'.format(clust_name)
                    if self.num_topic_sentences > 0:
                        count = 0
                        num_paras = len(self.sent_counts)
                        for p_id in range(num_paras):
                            for s_id in range(self.sent_counts[p_id]):
                                if s_id >= self.num_topic_sentences:
                                    if lat_name is not None:
                                        fs += 'sent.p{}.s{} ds.{},'.format(p_id+1, s_id+1, lat_name)
                                    elif dim_name is not None:
                                        fs += 'sent.p{}.s{} ds.{},'.format(p_id+1, s_id+1, dim_name)
                                    elif clust_name is not None:
                                        fs += 'sent.p{}.s{} ds.{},'.format(p_id+1, s_id+1, clust_name)
                                    count+= 1

                if s and s[-1] == ',':
                    s = s[:-1]

                if s:
                    s += ' {'
                    s += 'color: {}; background-color: {};'.format(views.ds_text_color, self.ds_category_highlight_color)
                    s += '}\n'

                if fs and fs[-1] == ',':
                    fs = fs[:-1]

                if fs:
                    fs += ' {'
                    fs += 'color: {}; background-color: {};'.format(views.ds_text_color_a, self.ds_category_highlight_color_a)
                    fs += '}\n'

                    s = s + fs

        self.ds_style = s

        s = ''
        if self.selected_impressions:

            impression = self.selected_impressions[0]
            impression_sents = self.controller.getSentencesWithImpression(impression)

            if self.selected_topics and self.adj_stats_list:
                # a topic is selected
                for adj_stats in self.adj_stats_list:
                    topic_positions = adj_stats.getTopicPositions()  # (p_id, s_id, w_pos)

                    for t in topic_positions:
                        b_match = False
                        for impression_sent in impression_sents:
                            # for each sentence with the selected impression, check if the current topic is in it.
                            if t[:2] == impression_sent[:2]: 
                                b_match = True
                                matched_sent = impression_sent
                                break

                        if b_match == False:
                            continue

                        topic_pos = matched_sent[2]
                        sent_pos  = matched_sent[1]
                        para_pos  = matched_sent[0]

                        s += 't.{}.p{}.s{},'.format(impression, para_pos, sent_pos)

            if s and s[-1] == ',':
                s = s[:-1]

            if s:
                s += ' {'
                s += 'color: {}; background-color: {};'.format(views.ds_text_color, self.ds_category_highlight_color)
                s += '}\n'

        self.impression_style = s

        #

        style = self.para_style + self.sent_style + self.ds_style + self.topic_style + self.topic_sent_style + self.impression_style + '\n'
        # print(">>>>>>>>>>: self.topic_style")
        # print(self.ds_style)
        # print("<<<<<<<<<<")
        # print("-------------")
        # print(style)
        # print("-------------")

        self.doc.setDefaultStyleSheet(style)


    def printVScrollBarPos(self, txt):
        vscrollbar = self.verticalScrollBar()        

    def saveVScrollBarPos(self):
        vscrollbar = self.verticalScrollBar()        
        self.saved_vscrollbar_pos = vscrollbar.value()
        return self.saved_vscrollbar_pos

    def restoreVScrollBarPos(self):
        vscrollbar = self.verticalScrollBar()              
        vscrollbar.setValue(self.saved_vscrollbar_pos)

    def getVScroolBarPos(self):
        vscrollbar = self.verticalScrollBar()
        return 

    def setVScrollBarPos(self, vpos):
        vscrollbar.setValue(vpos)

