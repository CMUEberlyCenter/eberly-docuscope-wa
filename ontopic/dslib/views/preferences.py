#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
class PreferencesDialog(QDialog):

"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform
import configparser

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

import dslib.views           as views
import dslib.utils           as utils
import dslib.models.document as ds_doc
import dslib.views.dialogs   as dialogs
import dslib.views.autofit_textedit as autofit_textedit

default_dict_msg = "A text type or a dictionary has already been loaded, " + \
                   "you must restart DocuScope before the change(s) will take effect."

# custom_dict_msg  = "Select a custom dictionary. If a dictionary is already loaded, " + \
                   # "you must restart DocuScope."
# 
color_change_msg = "You must restart DocuScope to change the color scheme. " + \
                   "Click OK to quit DocuScope."

def createDefaultPreferencesFile(prefs_path, version):
    """
    This helper function is used to create a default prefertences file.
    """
    config = configparser.ConfigParser()
    config['STUDENT_DEFAULT'] = { 'VERSION':                  version,
                              'MIN_TOPICS':               2,
                              'COLLOCATION_WINDOW':       -1,
                              'MAX_PARAS':                100,
                              'SKIP_PARAS':               0,
                              'DICT_PATH':                "",
                              'CONTENT_PATH':             "",
                              'NLP_MODEL':                ds_doc.NLP_MODEL_DEFAULT,
                              'COLOR_SCHEME':             views.COLOR_SCHEME_DEFAULT,
                              'RES_LOADED_NOTIFICATION':  True,
                              'POST_MAIN_VERB_TOPICS':    True,
                              'TOPIC_CLUSTERS_ONLY':      True,
                              'EXCLUDE_NON_LOCAL_TOPICS': False,
                              'SHOW_TOPIC_DETAILS':       False,                
                              'MULTIWORD_TOPICS_EDITOR':  False,
                              'HIDE_GETTING_STARTED':     False,
                              'HIDE_INSTRUCTIONS':        False,
                              'SHOW_COMM_VALUES':         False,
                              'COLLOCATION':              False,
                              'DS_CATEGORY_FIELD':        False,
                              'MODE':                     views.STUDENT_MODE
                              }

    config['WRITER_DEFAULT'] = { 'VERSION':                  version,
                              'MIN_TOPICS':               2,
                              'COLLOCATION_WINDOW':       -1,
                              'MAX_PARAS':                100,
                              'SKIP_PARAS':               0,
                              'DICT_PATH':                "",
                              'CONTENT_PATH':             "",
                              'NLP_MODEL':                ds_doc.NLP_MODEL_DEFAULT,
                              'COLOR_SCHEME':             views.COLOR_SCHEME_DEFAULT,
                              'RES_LOADED_NOTIFICATION':  True,
                              'POST_MAIN_VERB_TOPICS':    True,
                              'TOPIC_CLUSTERS_ONLY':      False,              # writer only - false
                              'EXCLUDE_NON_LOCAL_TOPICS': True,               # writer only - true
                              'SHOW_TOPIC_DETAILS':       False,                              
                              'MULTIWORD_TOPICS_EDITOR':  True,               # writer only - true
                              'HIDE_GETTING_STARTED':     True,               # writer only - true
                              'HIDE_INSTRUCTIONS':        True,               # writer only - true
                              'SHOW_COMM_VALUES':         False,
                              'COLLOCATION':              False,
                              'DS_CATEGORY_FIELD':        False,
                              'MODE':                     views.WRITER_MODE
                              }

    config['USER'] = {    'VERSION':                  config['STUDENT_DEFAULT']['VERSION'],
                          'MIN_TOPICS':               config['STUDENT_DEFAULT']['MIN_TOPICS'],
                          'COLLOCATION_WINDOW':       config['STUDENT_DEFAULT']['COLLOCATION_WINDOW'],
                          'MAX_PARAS':                config['STUDENT_DEFAULT']['MAX_PARAS'],
                          'SKIP_PARAS':               config['STUDENT_DEFAULT']['SKIP_PARAS'],
                          'DICT_PATH':                config['STUDENT_DEFAULT']['DICT_PATH'],
                          'CONTENT_PATH':             config['STUDENT_DEFAULT']['CONTENT_PATH'],
                          'NLP_MODEL':                config['STUDENT_DEFAULT']['NLP_MODEL'],
                          'COLOR_SCHEME':             config['STUDENT_DEFAULT']['COLOR_SCHEME'],
                          'RES_LOADED_NOTIFICATION':  config['STUDENT_DEFAULT']['RES_LOADED_NOTIFICATION'],
                          'POST_MAIN_VERB_TOPICS':    config['STUDENT_DEFAULT']['POST_MAIN_VERB_TOPICS'],
                          'TOPIC_CLUSTERS_ONLY':      config['STUDENT_DEFAULT']['TOPIC_CLUSTERS_ONLY'],
                          'EXCLUDE_NON_LOCAL_TOPICS': config['STUDENT_DEFAULT']['EXCLUDE_NON_LOCAL_TOPICS'],
                          'SHOW_TOPIC_DETAILS':       config['STUDENT_DEFAULT']['SHOW_TOPIC_DETAILS'],
                          'MULTIWORD_TOPICS_EDITOR':  config['STUDENT_DEFAULT']['MULTIWORD_TOPICS_EDITOR'],
                          'HIDE_GETTING_STARTED':     config['STUDENT_DEFAULT']['HIDE_GETTING_STARTED'],
                          'HIDE_INSTRUCTIONS':        config['STUDENT_DEFAULT']['HIDE_INSTRUCTIONS'],
                          'SHOW_COMM_VALUES':         config['STUDENT_DEFAULT']['SHOW_COMM_VALUES'],
                          'COLLOCATION':              config['STUDENT_DEFAULT']['COLLOCATION'],
                          'DS_CATEGORY_FIELD':        config['STUDENT_DEFAULT']['DS_CATEGORY_FIELD'],
                          'MODE':                     config['STUDENT_DEFAULT']['MODE']
                          }

    with open(prefs_path, 'w') as configfile:
        config.write(configfile)

class PreferencesDialog(QDialog):

    def __init__(self, prefs_path, config=None, compact=False, parent=None):

        super(PreferencesDialog, self).__init__(parent)
     
        self.setWindowTitle("Preferences")
     
        self.setModal(True)

        self.config  = config
        self.controller = None
        self.prefs_path = prefs_path

        self.is_compact = compact

        self.setMinimumWidth(600)
        self.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.MinimumExpanding)

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            check_icon_path = "data/icons/check_icon.png"
            radio_icon_path = "data/icons/radio_icon.png"
        else:
            check_icon_path = "data/icons/check_dark_icon.png"
            radio_icon_path = "data/icons/radio_dark_icon.png"

        self.setStyleSheet("PreferencesDialog {background-color: " + views.default_ui_background_color + ";}" +
            
                                            "QWidget {font-size: " + str(views.default_ui_font_size) + "pt;}" +            

                                                 "QLabel {color: " + views.default_ui_text_color + ";}" +

                                   "QLineEdit {background-color:" + views.default_ui_input_background_color + ";" +
                                                         "color:" + views.default_ui_text_color + ";}" +


                          "QLineEdit:disabled {background-color:" + views.default_ui_button_disabled_color + ";}" +

                             "QPlainTextEdit {background-color: " + views.default_ui_input_background_color + ";" +
                                                        "color: " + views.default_ui_text_color + ";}" +

                                 "QPushButton {background-color: " + views.default_ui_input_background_color + ";" +
                                                         "color: " + views.default_ui_text_color + ";}" +

                                              "QCheckBox {color: " + views.default_ui_text_color + ";}" +

                                  "QCheckBox::indicator {border: 1px solid " + views.default_ui_border_color + ";" +
                                           "width: 12px; height: 12px;" + \
                                              "background-color: " + views.default_ui_input_background_color + ";}" +

                          "QCheckBox::indicator:checked {border: 1px solid " + views.default_ui_border_color + ";" +
                                                         "image: url(" + utils.resource_path(check_icon_path) + ");" + 
                                                        "}" +

                                           "QRadioButton {color: " + views.default_ui_text_color + ";" +
                                              "background-color: " + views.default_ui_background_color + ";}" +

                                  "QRadioButton:disabled {color: " + views.default_ui_text_inactive_color + ";}" +

                                "QRadioButton::indicator {width: 12px; height: 12px;" +
                                                 "border-radius: 6px;" + 
                                              "background-color: " + views.default_ui_input_background_color + ";}" + 

                            "QRadioButton::indicator:checked {image: url(" + utils.resource_path(radio_icon_path) + ");" + 
                                                        "}"
                                                      )

        self.config.read(self.prefs_path)
        prefs = self.config['USER']
                     
        layout = QVBoxLayout()           # the layout for the OptionsForm object.
     
        self.default_path_text = "Use the built-in dictionary."
        self.default_content_path_text = "Select a text type folder."

    ################################################
    #
    # TextView Options Area
    #
    ################################################  

        # Analytics
        title  = QLabel(" Language Resources")
        title.setFixedHeight(26)
        title.setStyleSheet("background-color: " + views.default_vis_background_color + "; font-weight: bold;")      
        layout.addWidget(title)         # add the title to the main layout

        # container
        res_options_container = QWidget()    # the container of the Options buttons
        res_options_layout = QFormLayout()   # create a form layout for the options
        res_options_layout.setFormAlignment(Qt.AlignLeft | Qt.AlignTop)      
        res_options_layout.setVerticalSpacing(0)      
        res_options_layout.setContentsMargins(5,0,5,5)
        res_options_container.setLayout(res_options_layout)
     
        ################################################
        # Analytics  options
        ################################################      
     
        hbox = QHBoxLayout()
        model = prefs.getboolean('NLP_MODEL')
        self.nlp_default_button = QRadioButton("Default")
        hbox.addWidget(self.nlp_default_button) 
        hbox.addSpacing(10)   

        self.nlp_large_button = QRadioButton("Large (currently unavailable)")
        self.nlp_large_button.setDisabled(True)
        hbox.addWidget(self.nlp_large_button)  

        if model == ds_doc.NLP_MODEL_LARGE:
            self.nlp_large_button.setChecked(True)
            self.nlp_default_button.setChecked(False)
        else:
            self.nlp_large_button.setChecked(False)
            self.nlp_default_button.setChecked(True)

        hbox.addStretch()
        res_options_layout.addRow(QLabel("NLP Model:   "), hbox)

        res_options_layout.addRow(QLabel(""), None)

        hbox = QHBoxLayout()
        vbox = QVBoxLayout()
        path = prefs.get('DICT_PATH', '')
        if path == '':
            path = self.default_path_text

        self.dictpath_field = QPlainTextEdit(path)
        self.dictpath_field.setReadOnly(True)
        self.dictpath_field.setMinimumHeight(60)
        self.dictpath_field.setMaximumHeight(60)
        self.dictpath_field.setFocusPolicy(Qt.ClickFocus | Qt.TabFocus)      
        vbox.addWidget(self.dictpath_field) 
        vbox.addSpacing(4)
        hbox.addLayout(vbox)
        hbox.addSpacing(4)

        vbox = QVBoxLayout()
        vbox.setContentsMargins(0,0,0,0)
        dict_button = QPushButton("Select")
        dict_button.clicked.connect(self.selectDictPath)
        dict_button.setFocusPolicy(Qt.NoFocus)
        vbox.addWidget(dict_button)
        vbox.addStretch()
        hbox.addLayout(vbox)
        res_options_layout.addRow(QLabel("Dictionary:  "), hbox)

        hbox = QHBoxLayout()
        vbox = QVBoxLayout()
        path = prefs.get('CONTENT_PATH', '')
        if path == '':
            path = self.default_content_path_text

        self.content_path_field = QPlainTextEdit(path)
        self.content_path_field.setReadOnly(True)
        self.content_path_field.setMinimumHeight(60)
        self.content_path_field.setMaximumHeight(60)
        self.content_path_field.setFocusPolicy(Qt.ClickFocus | Qt.TabFocus)      
        vbox.addWidget(self.content_path_field) 

        msg = default_dict_msg
        self.dict_note = autofit_textedit.AutoFitTextEdit()        

        self.dict_note.setStyleSheet("AutoFitTextEdit {background-color: " + views.default_ui_background_color + ";"
                                                   "border: 0;}" )
        self.dict_note.setPlainText(msg)     

        # self.dict_note = QPlainTextEdit(msg)
        # self.dict_note.setStyleSheet("QPlainTextEdit {border: 0; background-color: " + views.default_ui_background_color + "}")
        self.dict_note.setReadOnly(True)
        # self.dict_note.setMaximumHeight(42)
        vbox.addWidget(self.dict_note)
        hbox.addLayout(vbox)
        hbox.addSpacing(4)

        vbox = QVBoxLayout()
        vbox.setContentsMargins(0,0,0,0)
        content_button = QPushButton("Select")
        content_button.clicked.connect(self.selectContentPath)
        content_button.setFocusPolicy(Qt.NoFocus)
        vbox.addWidget(content_button)
        vbox.addStretch()
        hbox.addLayout(vbox)

        res_options_layout.addRow(QLabel("Text Type:  "), hbox)

        layout.addWidget(res_options_container)

        ################################################   
        #
        # Topic Settings
        #
        ################################################   

        title  = QLabel(" Topic Settings")
        title.setFixedHeight(26)
        title.setStyleSheet("background-color: " + views.default_vis_background_color + "; font-weight: bold;")      
        layout.addWidget(title)         # add the title to the main layout

        topics_options_container = QWidget()    # the container of the Options buttons
        topics_options_layout = QFormLayout()   # create a form layout for the options
        topics_options_layout.setFormAlignment(Qt.AlignLeft | Qt.AlignTop)      
        topics_options_layout.setVerticalSpacing(0)      
        topics_options_layout.setContentsMargins(5,0,5,5)
        topics_options_container.setLayout(topics_options_layout)
     
        hbox = QHBoxLayout()
        self.min_topics_field = QLineEdit(prefs['MIN_TOPICS'])
        self.min_topics_field.setFixedWidth(40)
        self.min_topics_field.setFocusPolicy(Qt.ClickFocus | Qt.TabFocus)      
        hbox.addWidget(self.min_topics_field) 
        topics_options_layout.addRow(QLabel("Min. Topics:  "), hbox)

        layout.addWidget(topics_options_container)          # add the containers to the main options layout

        hbox = QHBoxLayout()            
        self.collocation_window_checkbox = QCheckBox('Use Collocation Window:')

        collocation_window = prefs.getint('COLLOCATION_WINDOW',-1)
        hbox.addWidget(self.collocation_window_checkbox)
        if collocation_window >= 0:
            self.collocation_window_checkbox.setChecked(True)        
            self.collocation_window_field = QLineEdit(str(collocation_window))
        else:
            self.collocation_window_checkbox.setChecked(False)
            self.collocation_window_field = QLineEdit('')
            self.collocation_window_field.setDisabled(True)

        self.collocation_window_checkbox.stateChanged.connect(self.toggleCollocationWindow)

        self.collocation_window_field.setFixedWidth(40)
        self.collocation_window_field.setFocusPolicy(Qt.ClickFocus | Qt.TabFocus)
        hbox.addWidget(self.collocation_window_field) 
        hbox.addStretch()

        layout.addLayout(hbox)

        self.post_main_verb_checkbox = QCheckBox("Include Post-Main-Verb Subjects")
        self.post_main_verb_checkbox.setChecked(prefs.getboolean('POST_MAIN_VERB_TOPICS'))
        layout.addWidget(self.post_main_verb_checkbox)

        self.topic_clusters_only_checkbox = QCheckBox("Show only Topic Clusters in the Coherence Panel")
        self.topic_clusters_only_checkbox.setChecked(prefs.getboolean('TOPIC_CLUSTERS_ONLY', True))
        layout.addWidget(self.topic_clusters_only_checkbox)

        self.exclude_non_local_topics_checkbox = QCheckBox("Exclude Non-local Topics")
        self.exclude_non_local_topics_checkbox.setChecked(prefs.getboolean('EXCLUDE_NON_LOCAL_TOPICS', True))
        layout.addWidget(self.exclude_non_local_topics_checkbox)        

        layout.addSpacing(8) 

        # hbox = QHBoxLayout()
        # hbox.setContentsMargins(3,3,3,3)              
        # options_widget = QFrame()
        # options_widget.setLayout(hbox)
        # options_widget.setStyleSheet("QFrame {border: 1px solid #ccc; border-radius: 10px;}")
        # vbox = QVBoxLayout()
        # vbox.setContentsMargins(0,0,0,0)              
        # vbox.setSpacing(0)

        # noun_subject_options_list = noun_subject_options.split()

        # self.subj_checkbox     = QCheckBox("INoun Subject ")        # nsubj, nsubjpass, csubj, csubjpass
        # if 'nsubj' in noun_subject_options_list:
        #     self.subj_checkbox.setChecked(True)
        # else:
        #     self.subj_checkbox.setChecked(False)
        # self.subj_checkbox.setProperty('name', 'nsubj nsubjpass csubj csubjpass')
        # vbox.addWidget(self.subj_checkbox)

        # self.attr_checkbox      = QCheckBox("Attributive")          # attr
        # if 'attr' in noun_subject_options_list:
        #     self.attr_checkbox.setChecked(True)
        # else:
        #     self.attr_checkbox.setChecked(False)
        # self.attr_checkbox.setProperty('name', 'attr')
        # vbox.addWidget(self.attr_checkbox)

        # self.agent_checkbox     = QCheckBox("Agent")                # agent
        # if 'agent' in noun_subject_options_list:
        #     self.agent_checkbox.setChecked(True)
        # else:
        #     self.agent_checkbox.setChecked(False)
        # self.agent_checkbox.setProperty('name', 'agent')
        # vbox.addWidget(self.agent_checkbox)

        # self.expl_checkbox      = QCheckBox("It/There Expletive")   # expl
        # if 'expl' in noun_subject_options_list:
        #     self.expl_checkbox.setChecked(True)
        # else:
        #     self.expl_checkbox.setChecked(False)
        # self.expl_checkbox.setProperty('name', 'expl')
        # vbox.addWidget(self.expl_checkbox)

        # hbox.addLayout(vbox)

        # vbox = QVBoxLayout()
        # vbox.setContentsMargins(0,0,0,0)              
        # vbox.setSpacing(0)

        # self.pobj_checkbox      = QCheckBox("Prepositional Object") # pobj
        # if 'pobj' in noun_subject_options_list:
        #     self.pobj_checkbox.setChecked(True)
        # else:
        #     self.pobj_checkbox.setChecked(False)
        # self.pobj_checkbox.setProperty('name', 'pobj')
        # vbox.addWidget(self.pobj_checkbox)

        # self.dobj_checkbox      = QCheckBox("Direct Object")        # dobj
        # if 'dobj' in noun_subject_options_list:
        #     self.dobj_checkbox.setChecked(True)
        # else:
        #     self.dobj_checkbox.setChecked(False)
        # self.dobj_checkbox.setProperty('name', 'dobj')
        # vbox.addWidget(self.dobj_checkbox)

        # self.compound_checkbox  = QCheckBox("Noun Compounds")       # compound
        # if 'compound' in noun_subject_options_list:
        #     self.compound_checkbox.setChecked(True)
        # else:
        #     self.compound_checkbox.setChecked(False)
        # self.compound_checkbox.setProperty('name', 'compound')
        # vbox.addWidget(self.compound_checkbox)

        # vbox.addStretch()

        # if b_enabled == False:
        #     self.subj_checkbox.setEnabled(False)
        #     self.attr_checkbox.setEnabled(False)
        #     self.agent_checkbox.setEnabled(False)
        #     self.expl_checkbox.setEnabled(False)
        #     self.pobj_checkbox.setEnabled(False)
        #     self.dobj_checkbox.setEnabled(False)
        #     self.compound_checkbox.setEnabled(False)

        # hbox.addLayout(vbox)
        # noun_options_vbox.addWidget(options_widget)

        # layout.addWidget(noun_options_container)

        ################################################   
        #
        # Paragraph Settings
        #
        ################################################   

        title  = QLabel(" Paragraph Settings")
        title.setFixedHeight(26)
        title.setStyleSheet("background-color: " + views.default_vis_background_color + "; font-weight: bold;")      
        layout.addWidget(title)         # add the title to the main layout
     
        paragaph_filters_container = QWidget()    # the container of the Options buttons
        paragaph_filters_layout = QFormLayout()   # create a form layout for the options
        paragaph_filters_layout.setFormAlignment(Qt.AlignLeft | Qt.AlignTop)      
        paragaph_filters_layout.setVerticalSpacing(0)      
        paragaph_filters_layout.setContentsMargins(5,0,5,5)
        paragaph_filters_container.setLayout(paragaph_filters_layout)
     
        hbox = QHBoxLayout()
        self.max_paras_field = QLineEdit(prefs.get('MAX_PARAS', "50"))
        self.max_paras_field.setFixedWidth(40)
        self.max_paras_field.setFocusPolicy(Qt.ClickFocus | Qt.TabFocus)      
        hbox.addWidget(self.max_paras_field) 
        paragaph_filters_layout.addRow(QLabel("Max Paragraphs:  "), hbox)

        hbox = QHBoxLayout()
        self.skip_paras_field = QLineEdit(prefs.get('SKIP_PARAS', "0"))
        self.skip_paras_field.setFixedWidth(40)
        self.skip_paras_field.setFocusPolicy(Qt.ClickFocus | Qt.TabFocus)
        self.skip_paras_field.setDisabled(True)
        hbox.addWidget(self.skip_paras_field) 
        paragaph_filters_layout.addRow(QLabel("Skip Paragraphs:  "), hbox)

        layout.addWidget(paragaph_filters_container)    # add the containers to the main options layout

        layout.addSpacing(4)

        ################################################   
        # Tools
        ################################################   

        title  = QLabel(" Tools")
        title.setFixedHeight(26)
        title.setStyleSheet("background-color: " + views.default_vis_background_color + "; font-weight: bold;")      
        layout.addWidget(title)         # add the title to the main layout

        self.show_topic_details_checkbox = QCheckBox("Show Topic Details")
        self.show_topic_details_checkbox.setChecked(prefs.getboolean('SHOW_TOPIC_DETAILS', False))
        layout.addWidget(self.show_topic_details_checkbox)

        self.multiword_topics_checkbox = QCheckBox("Show Multiword Topics Editor")
        self.multiword_topics_checkbox.setChecked(prefs.getboolean('MULTIWORD_TOPICS_EDITOR', False))
        layout.addWidget(self.multiword_topics_checkbox)

        self.getting_started_checkbox = QCheckBox("Don't show \u201CGetting Started\u201D at Startup")
        self.getting_started_checkbox.setChecked(prefs.getboolean('HIDE_GETTING_STARTED', False))
        layout.addWidget(self.getting_started_checkbox)

        self.hide_instructions_checkbox = QCheckBox("Hide Instructions")
        self.hide_instructions_checkbox.setChecked(prefs.getboolean('HIDE_INSTRUCTIONS', False))
        layout.addWidget(self.hide_instructions_checkbox)

        self.show_comm_values_checkbox = QCheckBox("Show Communication Values")
        self.show_comm_values_checkbox.setChecked(prefs.getboolean('SHOW_COMM_VALUES', False))
        layout.addWidget(self.show_comm_values_checkbox)

        self.collocation_checkbox = QCheckBox("Show Collocation Tools")
        self.collocation_checkbox.setChecked(prefs.getboolean('COLLOCATION', False))
        layout.addWidget(self.collocation_checkbox)

        self.ds_category_checkbox = QCheckBox("Show DocuScope Categories in Editor")
        self.ds_category_checkbox.setChecked(prefs.getboolean('DS_CATEGORY_FIELD', False))
        layout.addWidget(self.ds_category_checkbox)        

        layout.addSpacing(8)       

        ################################################   
        # Color Scheme
        ################################################   

        # Analytics
        title  = QLabel(" Color Scheme")
        title.setFixedHeight(26)
        title.setStyleSheet("background-color: " + views.default_vis_background_color + "; font-weight: bold;")      
        layout.addWidget(title)         # add the title to the main layout

        # container
        color_options_container = QWidget()    
        color_options_layout = QFormLayout()  
        color_options_layout.setFormAlignment(Qt.AlignLeft | Qt.AlignTop)      
        color_options_layout.setVerticalSpacing(0)      
        color_options_layout.setContentsMargins(5,0,5,10)      
        color_options_container.setLayout(color_options_layout)
     
        ################################################
        # Color  options
        ################################################      
     
        hbox = QHBoxLayout()
        color_scheme = prefs.getint('COLOR_SCHEME')
        self.color_default_button = QRadioButton("Default (Light)")
        hbox.addWidget(self.color_default_button) 
        hbox.addSpacing(10)   

        self.color_dark_button = QRadioButton("Dark")
        hbox.addWidget(self.color_dark_button)  

        if color_scheme == views.COLOR_SCHEME_DARK:
            self.color_dark_button.setChecked(True)
            self.color_default_button.setChecked(False)
        elif color_scheme == views.COLOR_SCHEME_DEFAULT:
            self.color_dark_button.setChecked(False)
            self.color_default_button.setChecked(True)

        hbox.addStretch()
        color_options_layout.addRow(QLabel("Color Scheme:   "), hbox)

        layout.addWidget(color_options_container)

        ################################################   
        # SAVE button
        ################################################   
          
        buttons = QWidget()
        hbox = QHBoxLayout()
     
        reset_button = QPushButton("   Revert to Default   ")
        reset_button.clicked.connect(self.resetPreferences)
        reset_button.setFocusPolicy(Qt.NoFocus)
        hbox.addWidget(reset_button)      
     
        hbox.addStretch()
          
        cancel_button = QPushButton("Cancel")
        cancel_button.setFixedWidth(80)
        cancel_button.clicked.connect(self.cancel)
        cancel_button.setFocusPolicy(Qt.NoFocus)      
        hbox.addWidget(cancel_button)
     
        hbox.addSpacing(5)
     
        save_button = QPushButton("Save")
        save_button.setFixedWidth(80)
        save_button.setFocusPolicy(Qt.NoFocus)      
        save_button.clicked.connect(self.savePreferences)
        save_button.setDefault(True)
        hbox.addWidget(save_button)

        buttons.setLayout(hbox)
        layout.addWidget(buttons)

        layout.addStretch()
        self.setLayout(layout)   
        self.show()

        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
        centerPoint = screen_rect.center()
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft())   
        self.hide()    

    def cancel(self):
 
        self.config.read(self.prefs_path)
        prefs = self.config['USER']
         
        self.min_topics_field.setText(prefs['MIN_TOPICS'])

        collocation_window = prefs.getint('COLLOCATION_WINDOW',-1)
        if collocation_window >= 0:
            self.collocation_window_checkbox.setChecked(True)        
            self.collocation_window_field.setText(str(collocation_window))
        else:
            self.collocation_window_checkbox.setChecked(False)
            self.collocation_window_field.setText('')
            self.collocation_window_field.setDisabled(True)

        self.post_main_verb_checkbox.setChecked(prefs.getboolean('POST_MAIN_VERB_TOPICS'))

        self.max_paras_field.setText(prefs['MAX_PARAS'])

        # self.impressions_panel_checkbox.setChecked(prefs.getboolean('IMPRESSIONS_PANEL'))
        self.topic_clusters_only_checkbox.setChecked(prefs.getboolean('TOPIC_CLUSTERS_ONLY'))
        self.exclude_non_local_topics_checkbox.setChecked(prefs.getboolean('EXCLUDE_NON_LOCAL_TOPICS'))
        self.show_topic_details_checkbox.setChecked(prefs.getboolean('SHOW_TOPIC_DETAILS'))
        self.multiword_topics_checkbox.setChecked(prefs.getboolean('MULTIWORD_TOPICS_EDITOR'))
        self.getting_started_checkbox.setChecked(prefs.getboolean('HIDE_GETTING_STARTED'))
        self.hide_instructions_checkbox.setChecked(prefs.getboolean('HIDE_INSTRUCTIONS'))
        self.show_comm_values_checkbox.setChecked(prefs.getboolean('SHOW_COMM_VALUES'))
        self.collocation_checkbox.setChecked(prefs.getboolean('COLLOCATION'))
        self.ds_category_checkbox.setChecked(prefs.getboolean('DS_CATEGORY_FIELD'))

        path = prefs.get('DICT_PATH', '')
        if path == '':
            path = self.default_path_text
        self.dictpath_field.setPlainText(path)

        path = prefs.get('CONTENT_PATH', '')
        if path == '':
            path = self.default_content_path_text
        self.content_path_field.setPlainText(path)

        self.hide()

    def setController(self, c):
        self.controller = c

    def makeNounSubjectOptionString(self):
        options = ""

        if self.subj_checkbox.isChecked():
            options += self.subj_checkbox.property('name')
            options += " "

        if self.attr_checkbox.isChecked():
            options += self.attr_checkbox.property('name')
            options += " "

        if self.agent_checkbox.isChecked():
            options += self.agent_checkbox.property('name')
            options += " "

        if self.expl_checkbox.isChecked():
            options += self.expl_checkbox.property('name')
            options += " "

        if self.pobj_checkbox.isChecked():
            options += self.pobj_checkbox.property('name')
            options += " "

        if self.dobj_checkbox.isChecked():
            options += self.dobj_checkbox.property('name')
            options += " "

        if self.compound_checkbox.isChecked():
            options += self.compound_checkbox.property('name')
            options += " "

        return options.strip()

    def toggleCollocationWindow(self, val):
        if val == 0:
            self.collocation_window_field.setText('')
            self.collocation_window_field.setDisabled(True)
        else:
            self.collocation_window_field.setText('5')
            self.collocation_window_field.setDisabled(False)

    def selectDictPath(self):
        path = QFileDialog.getExistingDirectory(None, 'Select a dictionary:', '', QFileDialog.ShowDirsOnly)            
        if path == "":
           path = self.default_path_text
        self.dictpath_field.setPlainText(path)

    def selectContentPath(self):
        path = QFileDialog.getExistingDirectory(None, 'Select a text type folder:', '', QFileDialog.ShowDirsOnly)            
        if path == "":
           path = self.default_content_path_text
        self.content_path_field.setPlainText(path)

    def setExcludeNonLocalTopics(self, option):
        self.exclude_non_local_topics_checkbox.setChecked(option)
        self.savePreferences(None, show_warning=False)

    def setHideGettingStartedDialogOption(self, option):
        self.config.read(self.prefs_path)
        prefs = self.config['USER']

        self.getting_started_checkbox.setChecked(option)
        if option:
            prefs['HIDE_GETTING_STARTED'] = 'True'
        else:
            prefs['HIDE_GETTING_STARTED'] = 'False'

        with open(self.prefs_path, 'w') as configfile:
            self.config.write(configfile)
            
    def setDefaultDictionary(self, dict_path):
        if dict_path == '':
            dict_path = self.default_path_text
        self.dictpath_field.setPlainText(dict_path)
        self.savePreferences(None, show_warning=False)

    def setDefaultContent(self, content_path):
        if content_path == '':
            content_path = self.default_content_path_text
        self.content_path_field.setPlainText(content_path)
        self.savePreferences(None, show_warning=False)
        
    def resetPreferences(self, mode=-1):
        self.config.read(self.prefs_path)
        prefs    = self.config['USER']

        if mode == views.STUDENT_MODE:
            defaults = self.config['STUDENT_DEFAULT']

        elif mode == views.WRITER_MODE:            
            defaults = self.config['WRITER_DEFAULT']

        else:
            if self.controller.isExpectationsPanel():
                defaults = self.config['STUDENT_DEFAULT']

            else:
                defaults = self.config['WRITER_DEFAULT']

        prefs['MIN_TOPICS']              = defaults['MIN_TOPICS']
        prefs['COLLOCATION_WINDOW']      = defaults['COLLOCATION_WINDOW']
        prefs['MAX_PARAS']               = defaults['MAX_PARAS']
        prefs['SKIP_PARAS']              = defaults['SKIP_PARAS']
        prefs['DICT_PATH']               = defaults['DICT_PATH']
        prefs['CONTENT_PATH']            = defaults['CONTENT_PATH']
        prefs['NLP_MODEL']               = defaults['NLP_MODEL']
        prefs['COLOR_SCHEME']            = defaults['COLOR_SCHEME']
        prefs['RES_LOADED_NOTIFICATION'] = defaults['RES_LOADED_NOTIFICATION']
        prefs['POST_MAIN_VERB_TOPICS']   = defaults['POST_MAIN_VERB_TOPICS']
        prefs['TOPIC_CLUSTERS_ONLY']     = defaults['TOPIC_CLUSTERS_ONLY']
        prefs['EXCLUDE_NON_LOCAL_TOPICS']= defaults['EXCLUDE_NON_LOCAL_TOPICS']
        prefs['SHOW_TOPIC_DETAILS']      = defaults['SHOW_TOPIC_DETAILS']
        prefs['MULTIWORD_TOPICS_EDITOR'] = defaults['MULTIWORD_TOPICS_EDITOR']
        prefs['HIDE_GETTING_STARTED']    = defaults['HIDE_GETTING_STARTED']
        prefs['HIDE_INSTRUCTIONS']       = defaults['HIDE_INSTRUCTIONS']
        prefs['SHOW_COMM_VALUES']        = defaults['SHOW_COMM_VALUES']
        prefs['COLLOCATION']             = defaults['COLLOCATION']
        prefs['DS_CATEGORY_FIELD']       = defaults['DS_CATEGORY_FIELD']
        prefs['MODE']                    = defaults['MODE']

        self.min_topics_field.setText(prefs['MIN_TOPICS'])
        self.max_paras_field.setText(prefs['MAX_PARAS'])
        self.skip_paras_field.setText(prefs['SKIP_PARAS'])

        collocation_window = prefs.getint('COLLOCATION_WINDOW',-1)
        if collocation_window >= 0:
            self.collocation_window_checkbox.setChecked(True)        
            self.collocation_window_field.setText(str(collocation_window))
        else:
            self.collocation_window_checkbox.setChecked(False)
            self.collocation_window_field.setText('')
            self.collocation_window_field.setDisabled(True)

        self.post_main_verb_checkbox.setChecked(prefs.getboolean('POST_MAIN_VERB_TOPICS'))

        path = prefs.get('DICT_PATH', '')
        if path == '':
            path = self.default_path_text
        self.dictpath_field.setPlainText(path)

        path = prefs.get('CONTENT_PATH', '')
        if path == '':
            path = self.default_content_path_text
        self.content_path_field.setPlainText(path)

        nlp_model = prefs.getint('NLP_MODEL')
        if nlp_model == ds_doc.NLP_MODEL_LARGE:
            self.nlp_large_button.setChecked(True)
            self.nlp_default_button.setChecked(False)
        else:
            self.nlp_large_button.setChecked(False)
            self.nlp_default_button.setChecked(True)

        self.topic_clusters_only_checkbox.setChecked(prefs.getboolean('TOPIC_CLUSTERS_ONLY'))
        self.exclude_non_local_topics_checkbox.setChecked(prefs.getboolean('EXCLUDE_NON_LOCAL_TOPICS'))
        self.show_topic_details_checkbox.setChecked(prefs.getboolean('SHOW_TOPIC_DETAILS'))
        self.multiword_topics_checkbox.setChecked(prefs.getboolean('MULTIWORD_TOPICS_EDITOR'))
        self.getting_started_checkbox.setChecked(prefs.getboolean('HIDE_GETTING_STARTED'))
        self.hide_instructions_checkbox.setChecked(prefs.getboolean('HIDE_INSTRUCTIONS'))
        self.show_comm_values_checkbox.setChecked(prefs.getboolean('SHOW_COMM_VALUES'))
        self.collocation_checkbox.setChecked(prefs.getboolean('COLLOCATION'))
        self.ds_category_checkbox.setChecked(prefs.getboolean('DS_CATEGORY_FIELD'))

        color_scheme = prefs.getint('COLOR_SCHEME')
        if color_scheme == views.COLOR_SCHEME_DARK:
            self.color_dark_button.setChecked(True)
            self.color_default_button.setChecked(False)
        else:
            self.color_dark_button.setChecked(False)
            self.color_default_button.setChecked(True)

        if mode >= 0:
            with open(self.prefs_path, 'w') as configfile:
                self.config.write(configfile)            
            self.savePreferences(None, show_warning=False)

    def savePreferences(self, val, show_warning=True):

        self.config.read(self.prefs_path)
        prefs = self.config['USER']

        # min_topics must be greater than 2.
        min_topics = int(self.min_topics_field.text())
        if min_topics < 2:
            min_topics = 2
        prefs['MIN_TOPICS']               = str(min_topics)

        if self.collocation_window_checkbox.isChecked():
            cw = self.collocation_window_field.text()
        else:
            cw = '-1'

        prefs['COLLOCATION_WINDOW'] = cw
        self.controller.setCollocationWindow(int(cw))

        prefs['MAX_PARAS']                = self.max_paras_field.text()
        prefs['SKIP_PARAS']               = self.skip_paras_field.text()

        b_color_cheme_changed = False
        b_resource_changed = False
        b_hide_instructions_changed = False
        b_show_comm_values_changed = False

        ##
        previous_dict_path = prefs['DICT_PATH']
        path = self.dictpath_field.toPlainText()

        if path == self.default_path_text:
            prefs['DICT_PATH'] = ''
        else:
            prefs['DICT_PATH'] = path

        if previous_dict_path != prefs['DICT_PATH']:
            b_resource_changed = True

        ##
        previous_content_path = prefs['CONTENT_PATH']
        path = self.content_path_field.toPlainText()
        if path == self.default_content_path_text:
            prefs['CONTENT_PATH'] = ''
        else:
            prefs['CONTENT_PATH'] = path

        if previous_content_path != prefs['CONTENT_PATH']:
            b_resource_changed = True

        content_info = self.controller.getContentInfo(prefs['CONTENT_PATH'])            

        self.controller.updateResourcesDialog(content_info)

        prev_nlp_model = prefs['NLP_MODEL']
        if self.nlp_large_button.isChecked():
            nlp_model = ds_doc.NLP_MODEL_LARGE
        else:
            nlp_model = ds_doc.NLP_MODEL_DEFAULT

        prefs['NLP_MODEL'] = str(nlp_model)

        if prev_nlp_model != prefs['NLP_MODEL']:
            b_resource_changed = True

        if self.topic_clusters_only_checkbox.isChecked():
            prefs['TOPIC_CLUSTERS_ONLY'] = 'True'
            self.controller.setTopicClustersOnly(True)
        else:
            prefs['TOPIC_CLUSTERS_ONLY'] = 'False'            
            self.controller.setTopicClustersOnly(False)            

        if self.exclude_non_local_topics_checkbox.isChecked():
            prefs['EXCLUDE_NON_LOCAL_TOPICS'] = 'True'
        else:
            prefs['EXCLUDE_NON_LOCAL_TOPICS'] = 'False'            

        if self.show_topic_details_checkbox.isChecked():
            prefs['SHOW_TOPIC_DETAILS'] = 'True'
        else:
            prefs['SHOW_TOPIC_DETAILS'] = 'False'            

        if self.multiword_topics_checkbox.isChecked():
            prefs['MULTIWORD_TOPICS_EDITOR'] = 'True'
            self.controller.setMultiwordTopicsEditorVisible(True)
        else:
            prefs['MULTIWORD_TOPICS_EDITOR'] = 'False'
            self.controller.setMultiwordTopicsEditorVisible(False)            

        if self.getting_started_checkbox.isChecked():
            prefs['HIDE_GETTING_STARTED'] = 'True'
            self.controller.updateHideGettingStartedDialogOption(True)
        else:
            prefs['HIDE_GETTING_STARTED'] = 'False'
            self.controller.updateHideGettingStartedDialogOption(False)

        prev_hide_instructions = prefs['HIDE_INSTRUCTIONS']
        if self.hide_instructions_checkbox.isChecked():
            prefs['HIDE_INSTRUCTIONS'] = 'True'
            warning_title = "Show Instructions"
        else:
            prefs['HIDE_INSTRUCTIONS'] = 'False'
            warning_title = "Hide Instructions"

        if prev_hide_instructions != prefs['HIDE_INSTRUCTIONS']:
            b_hide_instructions_changed = True

        prev_show_comm_values = prefs['SHOW_COMM_VALUES']
        if self.show_comm_values_checkbox.isChecked():
            prefs['SHOW_COMM_VALUES'] = 'True'
            warning_title = "Show Communication Values"
        else:
            prefs['SHOW_COMM_VALUES'] = 'False'
            warning_title = "Show Communication Values"

        if prev_show_comm_values != prefs['SHOW_COMM_VALUES']:
            b_show_comm_values_changed = True

        if self.color_dark_button.isChecked():
            prefs['COLOR_SCHEME'] = str(views.COLOR_SCHEME_DARK)
        else:
            prefs['COLOR_SCHEME'] = str(views.COLOR_SCHEME_DEFAULT)

        prefs['POST_MAIN_VERB_TOPICS']   = str(self.post_main_verb_checkbox.isChecked())

        if self.collocation_checkbox.isChecked():
            prefs['COLLOCATION'] = 'True'
        else:
            prefs['COLLOCATION'] = 'False'


        if self.ds_category_checkbox.isChecked():
            prefs['DS_CATEGORY_FIELD'] = 'True'
            self.controller.showDSCategoryField()
        else:
            prefs['DS_CATEGORY_FIELD'] = 'False'
            self.controller.hideDSCategoryField()

        prefs['POST_MAIN_VERB_TOPICS']   = str(self.post_main_verb_checkbox.isChecked())

        #
        if show_warning and b_resource_changed and self.controller.isDictionaryLoaded():

            wd = dialogs.ForceQuitDialog("The language resource setting has been changed.", 
                                          default_dict_msg  + "\n\nClick OK to quit DocuScope.")

            if wd.retval == QMessageBox.Ok:
                with open(self.prefs_path, 'w') as configfile:
                    self.config.write(configfile)
                os._exit(0)

        elif show_warning and b_show_comm_values_changed:
            wd = dialogs.ForceQuitDialog(warning_title,
                 "You must restart DocuScope before the change(s) will take effect. Click OK to quit DocuScope.")

            if wd.retval == QMessageBox.Ok:
                with open(self.prefs_path, 'w') as configfile:
                    self.config.write(configfile)
                os._exit(0)

        else:
            with open(self.prefs_path, 'w') as configfile:
                self.config.write(configfile)

            if show_warning and prefs.getint('COLOR_SCHEME') != views.get_color_scheme():
                wd = dialogs.ForceQuitDialog("The color scheme has been changed.", color_change_msg)
                if wd.retval == QMessageBox.Ok:
                    os._exit(0)
                else:
                    if self.controller.isDictionaryLoaded():                    
                        self.controller.updateVisualization(force_update=True)
                    self.hide()                    
            else:
                if self.controller.isDictionaryLoaded():
                    self.controller.updateVisualization(force_update=True)

                self.controller.setInstructionsVisible(not prefs.getboolean('HIDE_INSTRUCTIONS', False))

                self.hide()


