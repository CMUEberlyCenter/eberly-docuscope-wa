#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
custom_dict_editor.py

"""

import os, sys
import platform
from datetime import datetime, date
import math
import pathlib

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.shared import RGBColor
from docx.enum.text import WD_COLOR_INDEX
from docx.shared import Pt
from docx.enum.text import WD_LINE_SPACING

from zipfile import ZipFile
import json

import string
import re
import copy
import shutil
import traceback

# import shlex, subprocess
import time
import threading

# from operator import itemgetter

import dslib.views                    as views
import dslib.views.custom_dict_editor as custom_dict_editor
# import dslib.views.rules_editor       as rules_editor
import dslib.views.dialogs            as dialogs
import dslib.models.dict              as ds_dict
import dslib.utils                    as utils

custom_dict_locked_warning = "This custom dictionary is locked and cannot be deleted. " + \
                             "The common dictionary must be deleted before the custom dictionary can be edited."

EDITABLE_ALL        = 0
EDITABLE_NAME_ONLY  = 1
EDITABLE_NONE       = 2

class CustomDictEditor(QMainWindow):

    customDictStatsCalculated = pyqtSignal(str)
    finishedReadingBaseDict   = pyqtSignal()

    def __init__(self, app_win, controller):

        super(CustomDictEditor, self).__init__()        

        self.app_win = app_win
        self.controller = controller
        self.base_dict_path = None

        self.project_dir = None

        self.default_dict = None
        self.custom_dict  = None

        self.is_common_dict = False

        self.initUI()

        self.custom_dict_name    =  None
        self.custom_dict_changed = None
        self.custom_dict_locked  = False

        self.customDictStatsCalculated.connect(self.customDictStatsCalculatedAction)
        self.finishedReadingBaseDict.connect(self.finishedReadingBaseDictAction)

    # ----------        
    # 'initUI' initializes all the UI elements for the app.
    # ----------        
    def initUI(self):               

        font_size = views.default_ui_font_size

        # ----------
        # Menus
        # ----------
        menubar = self.menuBar()
        menubar.setNativeMenuBar(True)

        fileMenu = menubar.addMenu('Project')

        newProjAction = QAction('New Custom Dictionary Projct...', self)
        newProjAction.triggered.connect(self.openNewProjectDialog)

        openProjAction = QAction('Open Custom Dictionary Projct...', self)
        openProjAction.triggered.connect(self.openProject)

        self.exportAllAction = QAction('Export All', self)
        self.exportAllAction.setEnabled(False)
        self.exportAllAction.triggered.connect(self.exportAll)

        self.closeAction = QAction('Close Custom Dictionary Editor', self)
        self.closeAction.triggered.connect(self.close)

        fileMenu.addAction(newProjAction)
        fileMenu.addAction(openProjAction)
        fileMenu.addSeparator()
        fileMenu.addAction(self.exportAllAction)
        fileMenu.addSeparator()
        fileMenu.addAction(self.closeAction)

        dictMenu = menubar.addMenu('Dictionary')
        self.newAction = QAction('Add Custom Dictionary', self)
        self.newAction.setEnabled(False)
        self.newAction.triggered.connect(self.openNewCustomDictDialog)

        self.saveDSCAction = QAction('Save Custom Dictionary', self) 
        self.saveDSCAction.setEnabled(False)
        self.saveDSCAction.triggered.connect(self.save)

        self.deleteAction = QAction('Delete Custom Dictionary', self)
        self.deleteAction.triggered.connect(self.deleteSelectedDict)
        self.deleteAction.setEnabled(False)

        self.docAction = QAction('&Export Custom Dictionary Help Content...', self)
        self.docAction.setEnabled(False)
        self.docAction.triggered.connect(self.generateHelpDoc)

        self.exportAction = QAction('Export Custom Dictionary...', self)
        self.exportAction.setEnabled(False)
        self.exportAction.triggered.connect(self.export)

        self.exportCommonDictAction = QAction('Export for DocuScope Classroom...', self)
        self.exportCommonDictAction.setEnabled(False)
        self.exportCommonDictAction.triggered.connect(self.exportCommonDict)

        dictMenu.addAction(self.newAction)
        dictMenu.addAction(self.saveDSCAction)
        dictMenu.addAction(self.deleteAction)
        dictMenu.addSeparator()
        dictMenu.addAction(self.exportAction)
        dictMenu.addAction(self.exportCommonDictAction)
        dictMenu.addAction(self.docAction)

        # Rule Menu
        # rulesMenu = menubar.addMenu('Genre/Assignment')
        # self.rulesEditorAction = QAction('Edit Genre/Assignment Definitions', self)
        # self.rulesEditorAction.triggered.connect(self.openRulesEditor)
        # self.rulesEditorAction.setEnabled(False)
        # rulesMenu.addAction(self.rulesEditorAction)

        # Tools Menu
        toolsMenu = menubar.addMenu('Tools')
        # self.extractPatternsAction = QAction('Extract Patterns from Corpus...', self)
        # self.extractPatternsAction.triggered.connect(self.extractPatternsFromCorpus)
        # self.extractPatternsAction.setDisabled(True)
        # toolsMenu.addAction(self.extractPatternsAction)

        self.diffDictAndCorpusAction = QAction('Diff Dictionary && Corpus ...', self)
        self.diffDictAndCorpusAction.triggered.connect(self.diffDictAndCorpus)
        self.diffDictAndCorpusAction.setDisabled(True)
        toolsMenu.addAction(self.diffDictAndCorpusAction)

        # ----------
        # Main Window
        # ----------

        self.setWindowTitle('Custom Dictionary Editor')

        # Base Container Widget
        container = QWidget(self)
        vbox = QVBoxLayout()

        pname_hbox = QHBoxLayout()    
        header = QLabel("Project Name: ")
        pname_hbox.addWidget(header)
        self.project_name_box = QLabel("")
        self.project_name_box.setStyleSheet("font-weight: bold")
        pname_hbox.addWidget(self.project_name_box)
        pname_hbox.addStretch()

        vbox.addLayout(pname_hbox)

        # Custom dict path box (read only)
        path_hbox = QHBoxLayout()    
        header = QLabel("Project Folder: ")
        path_hbox.addWidget(header)
        self.project_dir_path_box = QLabel("")
        path_hbox.addWidget(self.project_dir_path_box)
        path_hbox.addStretch()

        self.dict_icon = QWidget()
        s = "QWidget {border-image: url(\"" + \
                                   utils.resource_path('data/icons/dict_icon_faded.png') + \
                                   "\");}"
        self.dict_icon.setStyleSheet(s)
        self.dict_icon.setMinimumSize(18,18)
        self.dict_icon.hide()
        path_hbox.addWidget(self.dict_icon)

        vbox.addLayout(path_hbox)

        path_hbox = QHBoxLayout()    
        header = QLabel("Base Dictionary: ")
        path_hbox.addWidget(header)
        self.base_dict_path_box = QLabel("")
        path_hbox.addWidget(self.base_dict_path_box)
        path_hbox.addStretch()

        vbox.addLayout(path_hbox)

        line = QFrame()
        line.setFrameShape(QFrame.HLine);
        line.setFrameShadow(QFrame.Sunken);
        vbox.addWidget(line)

        # Horizontal Layout Box for the 3 panes (plus a button)
        hbox = QHBoxLayout()

        self.projectPanel = CustomDictProjectPanel(editor_win=self)
        hbox.addWidget(self.projectPanel)

        # Left Pane: Default Dict
        self.defaultTree= DefaultDictTree(editor_win=self)
        hbox.addWidget(self.defaultTree)

        # Button to add a catogory from Default Dict to Custom Dict
        vcontrol_area  = QVBoxLayout()
        self.add_button = QPushButton()
        self.add_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/add_icon.png"))))
        self.add_button.clicked.connect(self.addFromDefault)
        # self.add_button.setDisabled(True)
        vcontrol_area.addWidget(self.add_button)
        hbox.addLayout(vcontrol_area)

        # Middle Pane: Custom Dict + Controls
        # In this Editor, we'll use the 3 level hierarchy: Group, Cluster, Dimension.
        # These layers will be translated into the traditional DocuScope categories when
        # the custom dictionary object is created/edited, however.

        custom_vbox = QVBoxLayout()

        self.customTree = CustomDictTree(editor_win=self)
        custom_vbox.addWidget(self.customTree)

        hcontrol_area = QHBoxLayout()
        self.move_up_button = QPushButton()
        self.move_up_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/up_icon.png"))))
        self.move_up_button.clicked.connect(self.moveSelectedCategoryUp)
        hcontrol_area.addWidget(self.move_up_button)

        self.move_down_button = QPushButton()
        self.move_down_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/down_icon.png"))))
        self.move_down_button.clicked.connect(self.moveSelectedCategoryDown)
        hcontrol_area.addWidget(self.move_down_button)

        self.delete_button = QPushButton()
        self.delete_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/delete_icon.png"))))
        self.delete_button.clicked.connect(self.deleteSelectedCategory)
        hcontrol_area.addWidget(self.delete_button)

        # self.group_button = QPushButton()
        # self.group_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/add_folder_icon.png"))))
        # self.group_button.clicked.connect(self.addNewCluster)
        # hcontrol_area.addWidget(self.group_button)

        self.new_button = QPushButton()
        self.new_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/new_icon.png"))))
        self.new_button.clicked.connect(self.addNewCategory)
        hcontrol_area.addWidget(self.new_button)

        custom_vbox.addLayout(hcontrol_area)

        hbox.addLayout(custom_vbox)

        # Right Pane: Help Editor
        self.form = HelpForm(infobox=True, name=True, editor_win=self)
        self.customTree.setForm(self.form)
        self.customTree.setDefaultTree(self.defaultTree)
        hbox.addWidget(self.form)

        # add the hbox (3 panes) to vbox
        vbox.addLayout(hbox)

        hbox = QHBoxLayout()
        self.message_box = QLabel("")
        self.message_box.setStyleSheet("color: " + views.default_ui_text_inactive_color + ";")
        hbox.addWidget(self.message_box)
        hbox.addStretch()
        self.pronouns_checkbox = QCheckBox("Include Pronouns")
        self.pronouns_checkbox.setChecked(False)
        hbox.addWidget(self.pronouns_checkbox)
        vbox.addLayout(hbox)

        container.setLayout(vbox)

        self.setCentralWidget(container) 

        ## ----------

    def setMessage(self, msg):
        self.message_box.setText(msg)

    def clearMessage(self):
        self.message_box.setText("")

    def setController(self, c):
        self.controller = c

    def getVersion(self):
        return __version__

    def getCopyright(self):
        return __copyright__

    def getDefaultDict(self):
        return self.default_dict

    def closeEditor(self):
        if self.custom_dict is None:
            self.close()

        elif self.isCustomDictChanged():
            wd = dialogs.SaveWarningDialog2("\nThe Custom Dictionary hasn't been saved.", 
                                           "Do you want to save the changes before closing the editor?")

            if wd.retval == QMessageBox.Discard:
                self.controller.invalidateCustomDictEditor()

            elif wd.retval == QMessageBox.Save:
                self.custom_dict.save()

            self.close()

    def enableToolsMenuItems(self):
        # self.rulesEditorAction.setEnabled(True)
        # self.extractPatternsAction.setEnabled(True)
        self.diffDictAndCorpusAction.setEnabled(True)

    def enableCustomDictMenuItems(self):
        self.docAction.setEnabled(True)
        self.exportAction.setEnabled(True)
        self.deleteAction.setEnabled(True)
        self.newAction.setEnabled(True)
        self.exportCommonDictAction.setEnabled(True)

    def updateCustomDictMenuItems(self, dict_name):
        self.saveDSCAction.setText("Save Custom Dictionary ({})...".format(dict_name))
        self.exportAction.setText("Export Custom Dictionary ({})...".format(dict_name))
        self.deleteAction.setText("Delete Custom Dictionary ({})...".format(dict_name))
        self.docAction.setText("Export Csutom Dictionary Help Content ({})...".format(dict_name))

    def exportAll(self, export_info):
        if self.custom_dict is not None:
            # Let'e make sure that the currently open custom dictionary is saved, and closed.   
            if self.isCustomDictChanged():
                dd = dialogs.SaveWarningDialog2("\nThe Custom Dictionary hasn't been saved.", 
                                       "Do you want to save the changes before exporting the project?")

                if dd.retval == QMessageBox.Discard:
                    pass

                elif dd.retval == QMessageBox.Save:
                    self.custom_dict.save()

        dict_names = self.projectPanel.getCustomDictionaries()
        num_dicts = len(dict_names)
        if num_dicts == 1:
            wd = dialogs.YesNoDialog("Export Custom Dictionary", 
                                     "This operation may require several minutes.\n\n" + \
                                     "Estimated time: 2-5 minutes.\n\n".format(2-3) + \
                                     "Click OK to continue.")
        else:
            wd = dialogs.YesNoDialog("Export Custom Dictionaries", 
                                     "This operation may require several minutes.\n\n" + \
                                     "Estimated time: {}-{} minutes.\n\n".format(num_dicts*2, num_dicts*5) + \
                                     "Click OK to continue.")

        if wd.retval == QMessageBox.Cancel:
            return
        elif wd.retval == QMessageBox.Ok:
            self.controller.openExportAllDialog(self.project_dir, dict_names)

    def export(self):
        if self.custom_dict is None:
            return

        if self.custom_dict.isEmpty():
            dialogs.WarningDialog("Warning", "The custom dictionary is empty.")
            return

        # Let'e make sure that the currently open custom dictionary is saved, and closed.   
        if self.isCustomDictChanged():
            dd = dialogs.SaveWarningDialog2("\nThe Custom Dictionary hasn't been saved.", 
                                   "Do you want to save the changes before exporting the project?")

            if dd.retval == QMessageBox.Discard:
                pass

            elif dd.retval == QMessageBox.Save:
                self.custom_dict.save()

        wd = dialogs.YesNoDialog("Export Custom Dictionary", 
                                 "This operation may require several minutes.\n\n" + \
                                 "Estimated time: 2-5 minutes.\n\n".format(2-3) + \
                                 "Click OK to continue.")
        if wd.retval == QMessageBox.Cancel:
            return
        elif wd.retval == QMessageBox.Ok:
            self.controller.openExportDialog(self.custom_dict)

    def exportCommonDict(self):
        if self.custom_dict.isEmpty():
            dialogs.WarningDialog("Warning", "The custom dictionary is empty.")
            return

        # Let'e make sure that the currently open custom dictionary is saved, and closed.   
        if self.isCustomDictChanged():
            dd = dialogs.SaveWarningDialog2("\nThe Custom Dictionary hasn't been saved.", 
                                   "Do you want to save the changes before exporting the project?")

            if dd.retval == QMessageBox.Discard:
                pass

            elif dd.retval == QMessageBox.Save:
                self.custom_dict.save()

        self.controller.openCommonDictExportDialog(self.custom_dict)

    def generateHelpDoc(self):
        if self.isCustomDictChanged():
             dialogs.WarningDialog("Warning", "Save the dictionary first.")
        else:
            default_dst_dir = str(pathlib.Path.home())
            filename = "{} Category Definitions.docx".format(self.custom_dict_name)
            path = os.path.join(default_dst_dir, filename)
            filepath, _ = QFileDialog.getSaveFileName(None, 'Enter File Name', path, "Text File (*.docx)")

            if filepath != "":
                cluster, dimension = self.customTree.getSelectedItem()

                if cluster != None:
                    self.updateHelpContent(cluster, dimension)

                if self.custom_dict != None:
                        self.custom_dict.generateHelpDoc(filepath)

    # ----------------------------------------
    # aboutDialog(self):
    # This function opens the about dialog.
    # ----------------------------------------
    def aboutDialog(self):
        self.about.show()
        self.about.activateWindow()
        self.about.raise_()

    def loadCustomDictionary(self):
        if self.isCustomDictChanged():
            dialogs.WarningDialog("Save the custom dictionary first.", "The custom dictionary must be saved before it can be loaded.")
        else:
            self.controller.loadCustomDictionary(self.custom_dict, self)

    def dictionaryLoaded(self):
        # self.extractPatternsAction.setEnabled(True)
        # self.diffDictAndCorpusAction.setEnabled(True)
        self.dict_icon.show()

    # ----------------------------------------
    # Rules
    # ----------------------------------------
    # def openRulesEditor(self):

    #     screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
    #     screen_rect = QApplication.desktop().availableGeometry(screen)
    #     w = screen_rect.width()
    #     h = screen_rect.height()
    #     win_ht = round(h * 0.9)
    #     win_wd = round(win_ht * math.sqrt(2))
    #     win_x  = round((w - win_wd)/2)
    #     win_y  = round((h - win_ht)/2)

    #     if self.isCustomDictChanged():
    #         wd = dialogs.YesNoDialog("The Custom Dictionary hasn't been saved.", 
    #                                  "Do you want to save the changes before opening the rules editor?")

    #         if wd.retval == QMessageBox.Cancel:
    #             return

    #         elif wd.retval == QMessageBox.Ok:
    #             self.save()

    #         self.rules_editor = rules_editor.RulesEditor(self.custom_dict, self.default_dict)
    #         self.rules_editor.setGeometry(win_x,win_y,win_wd, win_ht)  # fill up the user's screen            
    #         self.rules_editor.show()

    #     else:
    #         self.rules_editor = rules_editor.RulesEditor()
    #         self.rules_editor.loadContent(self.custom_dict.getDirectory())
    #         self.rules_editor.setGeometry(win_x,win_y,win_wd, win_ht)  # fill up the user's screen               
    #         self.rules_editor.show()

    def addNewCategory(self):

        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return 

        if self.custom_dict == None:
            return        

        # Get the current selection
        clust_name, dim_name, lat_name = self.customTree.getSelectedItem()

        if dim_name is not None or lat_name is not None:
            # if a dimension is selected OR a lat is selected.
            # do nothing and return.
            dialogs.WarningDialog("Select Cluster", "A new category can only be added to the top level or to an existing custom cluster")
            return


        if clust_name is not None:
            if self.isDefaultCluster(clust_name):
                dialogs.WarningDialog("Cluster Locked", "A new category cannot be added to a cluster copied from the base dictionary.")
                return

            self.updateHelpContent(clust_name, dim_name)
            self.addNewDimension(clust_name)
        else:
            self.addNewCluster()

    # ----------------------------------------
    # addNewGroup(self):
    # This function is called when the 'group' button is pushed.
    # ----------------------------------------
    def addNewCluster(self):
        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return 

        if self.custom_dict == None:
            return

        index = self.customTree.getSelectedClusterIndex()
        if index < 0:
            cluster_name = self.custom_dict.addNewCluster(index)
            self.customTree.addNewCluster(index, cluster_name)
        else: 
            cluster_name = self.custom_dict.addNewCluster(index+1)
            self.customTree.addNewCluster(index+1, cluster_name)

        self.customDictChanged()

    # ----------------------------------------
    # addNewDimension()
    # This function is called when the 'plus' button is pushed.
    # ----------------------------------------
    def addNewDimension(self, clust_name):
        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return 

        if self.custom_dict == None:
            return

        if clust_name is not None:
            dim_name = self.custom_dict.addNewDimension(clust_name)
            self.customTree.addNewDimension(dim_name)

        self.customDictChanged()

    # ----------------------------------------
    # customDictChanged(self):
    # This function is called when the custom dictionary is altered. 
    # But, it does not save the dictionary.
    # ----------------------------------------
    def customDictChanged(self, update_info=True):
        title = self.windowTitle()
        if title.endswith("*") != True:
            self.setWindowTitle("{}*".format(title))
        self.custom_dict_changed = True
        self.saveDSCAction.setEnabled(True)

        if update_info:
            threading.Timer(0.1, self.updateCustomDictStats, []).start()

    def updateCustomDictStats(self):
        if self.custom_dict != None:
            stats = self.custom_dict.getStats()
            self.customDictStatsCalculated.emit(stats)

    @pyqtSlot(str)
    def customDictStatsCalculatedAction(self, stats):
        self.form.addCustomInfo(stats)


    # ----------------------------------------
    # customDictSaved(self):
    # This function is called when the custom dictionary is saved to files.
    # ----------------------------------------
    def customDictSaved(self):
        title = self.windowTitle()
        if title.endswith("*"):
            self.setWindowTitle(title[:-1])
        self.custom_dict_changed = False
        self.saveDSCAction.setEnabled(False)

    # ----------------------------------------
    # isCustomDictChanged(self):
    # this function returns True if the custom dictionary has been changed, yet
    # not yet saved.
    # ----------------------------------------
    def isCustomDictChanged(self):
        if self.custom_dict_changed == True:
            return True
        else:   # None or False
            return False

    # ----------------------------------------
    # deleteSelectedCategory(self):
    # This function is called when the 'delete' button i clicked.
    # ----------------------------------------
    def deleteSelectedCategory(self):
        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return

        cluster, dimension, lat = self.customTree.deleteSelectedItem()
        if cluster == None and dimension == None and lat == None:
            return

        dict_item = self.custom_dict.deleteCategory(cluster, dimension, lat)
        self.customDictChanged()

        if dict_item is not None and dict_item['default']:
            if dict_item['type'] == 'CLUSTER':  # make sure it's a cluster
                self.defaultTree.enableItem(cluster, dimension)            
                for d in dict_item['dimensions']:
                    if self.isDefaultDimension(d['name']):
                        self.defaultTree.enableItem(None, d['name'])

            elif dict_item['type'] == 'DIMENSION':
                    if self.isDefaultDimension(dict_item['name']):
                        self.defaultTree.enableItem(None, dict_item['name'])
                    else:
                        self.defaultTree.enableItem(dict_item['name'], None)

    # ----------------------------------------
    # moveSelectedCategoryUp(self):
    #
    # ----------------------------------------
    def moveSelectedCategoryUp(self):
        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return 

        if self.customTree != None:
            cluster_name = self.customTree.moveSelectedItem(views.UP)
            if cluster_name != None:
                self.custom_dict.moveCluster(cluster_name, views.UP)
                self.customDictChanged(update_info=False)
    # ----------------------------------------
    # moveSelectedCategoryDown(self):
    #
    # ----------------------------------------
    def moveSelectedCategoryDown(self):
        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return 

        if self.customTree != None:
            cluster_name = self.customTree.moveSelectedItem(views.DOWN)
            if cluster_name != None:
                self.custom_dict.moveCluster(cluster_name, views.DOWN)
                self.customDictChanged(update_info=False)

    # ----------------------------------------
    # addFromDefault(self):
    # Add a currently selected default dictionary item (either a cluster or a dimension)
    # to the custom dictionary.
    # ----------------------------------------
    def addFromDefault(self):

        if self.custom_dict_locked:
            dialogs.WarningDialog("Custom Dictionary Locked", custom_dict_locked_warning)
            return 

        # If the default tree view does not exist, we can't do anything.
        if self.defaultTree != None:

            lst = self.defaultTree.cloneCurrentSelection()
            if len(lst) == 0:
                return

            c_count   = 0
            d_count   = 0
            lat_count = 0

            for d in lst:

                if d['cat_type'] == ds_dict.CLUSTER:      
                    # The user selected one or more default/base clusters. 
                    # Default/base clusters can be added as top-level clusters OR dimensions.
                    # If an existing custom cluster is seleced, add them to the cluster as dimensions.
                    # If no clusters are selected, add them to the top level.

                    clust_name, dim_name, lat_name = self.customTree.getSelectedItem()
              
                    b = d['item'].foreground(0)
                    if b.color() == Qt.darkGray: 
                        # This cluster's dimensions are already partially added to the custom dict.
                        # Display a warning, and return.
                        dialogs.WarningDialog("Locked Cluster", 
                                "One or more dimensions from this cluster <b>{}</b> have already been used by the custom dictionary.".format(d['name']) +
                                "These dimensions must be removed from the custom dictionary before adding this cluster.")
                        return

                    if clust_name is None:  # currently selected custom cluster is None
                        if self.is_common_dict:
                            dialogs.WarningDialog("Clusters cannot be added to the top level", 
                                "Clusters can only be added to the lowest level of the hierarchy." +
                                "to make this dictionary compatible with DocuScope Classroom.")                                 
                            return                
                        # No custom cluster is selected. We will add the default cluster to the
                        # very top level (as a custom cluster)
                        index = self.customTree.addDefaultCluster(d['item'], c_count)
                        self.custom_dict.addDefaultCluster(d['item'].text(0), index)
                        c_count += 1

                    elif clust_name is not None and dim_name is None:
                        # A custom cluster is selected
                        if self.is_common_dict:
                            dialogs.WarningDialog("Clusters cannot be added to second level", 
                                "Clusters can only be added to the lowest level of the hierarchy." +
                                "to make this dictionary compatible with DocuScope Classroom.")                    
                            return                

                        if self.custom_dict.isBasedOnBaseDict(clust_name, ds_dict.CLUSTER):
                            # An existing custom cluster is selected. If it is a default cluster, display a warning.

                            dialogs.WarningDialog("Locked Cluster", 
                                "Since the selected cluster <b>{}</b> is directly copied from the base dictionary,".format(d['name']) +
                                "it cannot be modified.")
                            return

                        b = QBrush(Qt.darkGray)

                        d['item'].setForeground(0, b)  # debug?

                        for i in range(d['item'].childCount()): 
                            lat_item = d['item'].child(i)
                            lat_item.setText(0, "{}_LAT".format(lat_item.text(0)))
                            lat_item.setForeground(0, b)

                        index = self.customTree.addDefaultDimension(d['item'])
                        self.custom_dict.addDefaultClusterAsDimension(d['item'].text(0),
                                                                      clust_name,
                                                                      index)
                        d_count += 1

                    elif clust_name is not None and dim_name is not None:                        
                        wd = dialogs.YesNoDialog("Add All LATs?",
                               "Are you sure you want to add all the dimensions under the selected Cluster(s)" +
                               "from the base dictionary to {}?".format(dim_name))

                        if wd.retval == QMessageBox.Cancel:
                            return

                        elif wd.retval == QMessageBox.Ok:
                            # list all the dimensions 
                            base_clust_name = d['item'].text(0)
                            for base_dim_item in d['item'].takeChildren():
                                # For each dimensionn found under the selected base-cluster,
                                # base_dim_item = d['item'].takeChild(i)     # get the tree widget item (base_dim_item)
                                base_dim_name = base_dim_item.text(0)  # get the name of the dim item.
                                # Add the base_dim_item to the currently selected dimension in the custom tree.
                                base_dim_item.setText(0, "{}_LAT".format(base_dim_name))                             
                                custom_dim_name = self.customTree.addDefaultLAT(base_dim_item)
                                # add base dim as an LAT to custom dim.
                                self.custom_dict.addDefaultDimensionAsLAT(base_dim_name, custom_dim_name)

                            self.defaultTree.grayOutParent(base_dim_name)
    
                    else:
                        # Something went wrong...
                        dialogs.WarningDialog("Error", "Sorry. Something went wrong. Please contact the developer.")
                        return

                elif d['cat_type'] == ds_dict.DIMENSION:

                    if self.is_common_dict:
                        dialogs.WarningDialog("Dimensions Can't be Added", 
                            "You can only add clusters to the custom dictionary " + 
                            "to make this dictionary compatible with DocuScope Classroom.")
                        return

                    # The user selected one or more default/base-dimensions. 
                    # We'll add them to the custom dictionary.
                    clust_name, dim_name, lat_name = self.customTree.getSelectedItem()

                    if clust_name is not None and dim_name is None:
                        # if a cluster is selected now in the custom dict tree, 
                        # add the selected default dimension as a new dimension.
                        if self.custom_dict.isBasedOnBaseDict(clust_name, ds_dict.CLUSTER):
                            dialogs.WarningDialog("Locked Cluster", 
                                "Since the selected cluster <b>{}</b> is directly copied from the base dictionary,".format(clust_name) +
                                "it cannot be modified.")
                            return

                        clust_name = self.customTree.addDefaultDimension(d['item'])
                        self.custom_dict.addDefaultDimension(d['item'].text(0), clust_name)
                        self.defaultTree.grayOutParent(d['item'].text(0))

                    elif clust_name is not None and dim_name is not None:
                        # if a dimension is selected now in the custom dict tree, 
                        # add the dimension as an LAT.
                        base_dim_name = d['item'].text(0)
                        d['item'].setText(0, "{}_LAT".format(d['item'].text(0)))

                        # add the selected base dim as an LAT to the currently selected custom dim.
                        custom_dim_name = self.customTree.addDefaultLAT(d['item']) 

                        # add base dim to the custom dim
                        self.custom_dict.addDefaultDimensionAsLAT(base_dim_name, custom_dim_name) 
                        self.defaultTree.grayOutParent(base_dim_name)

                    else:
                        dialogs.WarningDialog("Select a cluster of dimension", 
                            "Dimension(s) from the base dictionary cannot be added to the top " + \
                            "level of the custom dictioanry. Select a cluster or dimension.")
                            
                        return

                    d_count += 1

            self.defaultTree.disableCurrentSelection()
            self.defaultTree.clearSelection()
            self.customDictChanged()
            self.customTree.clearSelection()
            self.form.clearHelpContent()

    def openNewProjectDialog(self):
        self.new_dialog = NewCustomDictProjectDialog(editor_win=self, controller=self.controller)
        self.new_dialog.show()
        self.new_dialog.activateWindow()
        self.new_dialog.raise_()

    # ----------------------------------------
    # openNewDialog(self):
    # This function opens a dialog for creating a new custom dictionry.
    # The user needs to provide the path to a default dictionary and a name for
    # the new custom dictionary.
    # ----------------------------------------
    def openNewDialog(self):
        self.new_dialog = NewCustomDictDialog(editor_win=self)
        self.new_dialog.show()
        self.new_dialog.activateWindow()
        self.new_dialog.raise_()

    def closeCurrentCustomDict(self):
        name = self.projectPanel.getCurrentDictName()
        self.closeCustomDict(name)

    def closeCustomDict(self, custom_dict_name):

        if self.isCustomDictChanged():
            wd = dialogs.SaveWarningDialog2("\nThe Custom Dictionary hasn't been saved.", 
                                           "Do you want to save the changes before switching to another custom dictionary?")

            if wd.retval == QMessageBox.Discard:
                # self.controller.invalidateCustomDictEditor()
                pass

            elif wd.retval == QMessageBox.Save:
                self.custom_dict.save()

        self.controller.resetDictionary()
        self.form.clearAll()
        self.customTree.clear()
        self.custom_dict = None

    def openCustomDict(self, custom_dict_name):

        if self.custom_dict is not None:
            self.closeCurrentCustomDict()
            self.custom_dict = None

        folder = os.path.join(self.project_dir, "src", custom_dict_name)

        if folder == "":
            return

        if utils.is_custom_dict_dir(folder) == False:
            if utils.is_exported_custom_dict_dir(folder):
                dialogs.WarningDialog("Not Editable", 
                    "Exported custom dictionary packags are not editable.\n\n{}".format(folder))
            else:
                dialogs.WarningDialog("Invalid Custom Dictionary", 
                    "This is not a valid custom dictionary folder.\n\n{}".format(folder))
            return

        with open(os.path.join(folder, "info.json")) as fin:
            info = json.load(fin)
            # base_dict_path = info['base_dict_path']
            is_customized = info['customized']
            is_common     = info.get('is_common', False)
            pronouns      = info.get('pronouns', False)

        self.defaultTree.setHierarchy(self.default_dict.getTones())
        threading.Timer(0.1, self.updateCustomDictStats, []).start()

        # Let the help form know which custom dictionary we are working on
        self.form.setCustomDictPath(folder)

        # Read _custom_tones.txt from the custom dict folder
        self.custom_dict = ds_dict.DSCustomDict(self.controller, folder, self.default_dict)

        self.custom_dict.loadTones()
        self.custom_dict.loadHelp()
        stats = self.custom_dict.getStats()
        self.form.addCustomInfo(stats)

        self.customTree.setHierarchy(self.custom_dict.getTones())

        if pronouns:
            self.pronouns_checkbox.setChecked(True)

        if is_common:
            self.is_common_dict = True
            self.projectPanel.setCommonDict(True)
        else:
            self.projectPanel.setCommonDict(False)

        self.custom_dict_name = folder[folder.rfind('/')+1:]
        self.setWindowTitle(self.custom_dict_name)

        self.customDictChanged(update_info=True)
        self.customDictSaved()

        self.enableToolsMenuItems()
        self.enableCustomDictMenuItems()
        self.updateCustomDictMenuItems(custom_dict_name)

    def openProject(self):

        project_dir = QFileDialog.getExistingDirectory(None, 
                         'Select a custom dictionary project folder:',
                         '', QFileDialog.ShowDirsOnly)

        if project_dir:
            
            self.project_dir = project_dir

            src_dir    = os.path.join(self.project_dir, "src")
            info_fpath = os.path.join(self.project_dir, "info.json")

            if os.path.isdir(src_dir) != True or \
               os.path.isfile(info_fpath) != True:
                dialogs.WarningDialog("Invalid folder", 
                          "{} is not a valid custom dictionary project folder.".format(self.project_dir))
                return
            else:
                self.projectPanel.reset()
                self.customTree.clear()
                self.customTree.reset()
                self.form.clearInfobox()

                with open(info_fpath) as info_fin:
                    project_info = json.load(info_fin)

                base_dict_path = project_info['base_dict_path']
                if os.path.isdir(base_dict_path) == False:
                    wd = dialogs.YesNoDialog("File not found.", 
                                "{} does not exist.\nLocate the base dictionary: {}.".format(base_dict_path,  
                                                                                 os.path.basename(base_dict_path)))
                    if wd.retval == QMessageBox.Cancel:
                        return
                    elif wd.retval == QMessageBox.Ok:
                        base_dict_path = QFileDialog.getExistingDirectory(None, 'Select a base dictionary folder:', '', QFileDialog.ShowDirsOnly)
                        with open(info_fpath, 'w') as fout:
                            project_info['base_dict_path'] = base_dict_path
                            json.dump(project_info, fout, indent=4)

                self.project_dir_path_box.setText(self.project_dir)
                self.project_name_box.setText(project_info['name'])
                self.base_dict_path_box.setText(project_info['base_dict_path'])
                self.setWindowTitle(project_info['name'])

                self.base_dict_path = project_info['base_dict_path']

                # list all the custmo dicts.
                custom_dict_names = list()
                for folder in os.listdir(src_dir):
                    if utils.is_custom_dict_dir(os.path.join(src_dir, folder)):
                        self.projectPanel.addCustomDict(folder)
                        custom_dict_names.append(folder)

                # self.setMessage("Reading the base dictionary: {}.".format(os.path.basename(self.base_dict_path)))
                # self.app_win.showWaitCursor()
##
                msg = "Reading the base dictionary: {}.".format(os.path.basename(self.base_dict_path))
                self.progdialog = QProgressDialog(msg, '', 0, 0, self.app_win)
                self.progdialog.setCancelButton(None)
                self.progdialog.setWindowTitle("")
                self.progdialog.setModal(True)
                self.progdialog.setMinimumWidth(600)      
                self.progdialog.setAutoClose(True)

                frameGm = self.progdialog.frameGeometry()
                screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
                screen_rect = QApplication.desktop().screenGeometry(screen)
                centerPoint = screen_rect.center()
                centerPoint += QPoint(0,-100)
                frameGm.moveCenter(centerPoint)
##
                self.progdialog.move(frameGm.topLeft())
                self.progdialog.show()

                threading.Timer(0.1, self.readBaseDictionary, []).start()

        self.enableToolsMenuItems()
        self.enableCustomDictMenuItems()

        if self.projectPanel.countCustomDictionaries() > 0:
            self.exportAllAction.setEnabled(True)

    def createNewCustomDictProject(self, base_dict_path, parent_dir, project_name):
        self.project_dir = os.path.join(parent_dir, project_name)
        self.base_dict_path = base_dict_path
        os.makedirs(self.project_dir)

        # create 2 sub folders. The src folder stores editable source files, and the dist folder stores expoted filles.
        src_dir  = os.path.join(self.project_dir, "src")

        project_info = dict()
        project_info['base_dict_path'] = base_dict_path
        project_info['name'] = project_name

        info_fpath = os.path.join(self.project_dir, "info.json")
        with open(info_fpath, 'w') as info_fout:
            json.dump(project_info, info_fout, indent=4)

        os.mkdir(src_dir)

        self.project_dir_path_box.setText(self.project_dir)
        self.setWindowTitle(project_name)
        self.base_dict_path_box.setText(base_dict_path)
        self.project_name_box.setText(project_name)

        # self.setMessage("Reading the base dictionary: {}.".format(os.path.basename(self.base_dict_path)))
        # self.app_win.showWaitCursor()
        msg = "Reading the base dictionary: {}.".format(os.path.basename(self.base_dict_path))
        self.progdialog = QProgressDialog(msg, '', 0, 0, self.app_win)
        self.progdialog.setCancelButton(None)
        self.progdialog.setWindowTitle("")
        self.progdialog.setModal(True)
        self.progdialog.setMinimumWidth(600)      
        self.progdialog.setAutoClose(True)

        frameGm = self.progdialog.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
        centerPoint = screen_rect.center()
        centerPoint += QPoint(0,-100)
        frameGm.moveCenter(centerPoint)
##
        self.progdialog.move(frameGm.topLeft())
        self.progdialog.show()

        threading.Timer(0.1, self.readBaseDictionary, []).start()

        return True

    def readBaseDictionary(self):
        if self.controller is not None and self.base_dict_path is not None:
            self.default_dict = ds_dict.DSDict(self.controller, self.base_dict_path)
            self.default_dict.loadInfo()
            self.default_dict.loadTones()
            self.default_dict.loadWordClasses()
            self.default_dict.loadHelp()
            self.finishedReadingBaseDict.emit()

    def finishedReadingBaseDictAction(self):
        self.newAction.setEnabled(True)
        self.defaultTree.setHierarchy(self.default_dict.getTones())

        self.clearMessage()

        # If there are any custom dictionaries, it means that it is not a new project.
        # Open the first custom dictionary in the list.
        custom_dict_names = self.projectPanel.getCustomDictionaries()

        if custom_dict_names:
            self.projectPanel.selectDictAt(0)
            self.openCustomDict(custom_dict_names[0])

        self.app_win.hideWaitCursor()

        if self.progdialog != None:
            self.progdialog.reset()
            self.progdialog = None

    def deleteSelectedDict(self):
        dict_name = self.projectPanel.getCurrentDictName()
        res = dialogs.YesNoDialog("Delete Custom Dictionary", 
                 "Press OK to delete the custom dictionary: {}\n\nThe dictionary will be permanently removed.".format(dict_name))
        if res.retval == QMessageBox.Ok:
            self.projectPanel.deleteSelectedDict()
            self.custom_dict.deleteContent()
            self.custom_dict = None

    # ----------------------------------------
    # createNewCustomDict(self, default_folder, custom_dict_name):
    # This function creates a new blank custom dictionary
    # ----------------------------------------

    def openNewCustomDictDialog(self):

        dialog = CustomDictNameDialog()

        # dialog.finished.connect()

        if dialog.retval == QMessageBox.Cancel:
            return
        if dialog.retval == QMessageBox.Ok:
            custom_dict_name = dialog.getCustomDictName()
            is_common_dict   = dialog.isCommonDict()
            self.createNewCustomDict(custom_dict_name, is_common_dict)

    def createNewCustomDict(self, custom_dict_name, is_common_dict):

        if self.custom_dict is not None:
            self.closeCurrentCustomDict()

        self.is_common_dict = is_common_dict
        self.projectPanel.setCommonDict(is_common_dict)

        self.custom_dict_changed = True

        custom_dict_path = os.path.join(self.project_dir, "src", custom_dict_name)

        # if the custom dict path exists alrady, display a warning; otherwise, create a new dir.
        if os.path.exists(custom_dict_path):
            dialogs.WarningDialog("Error", "{} already exists.\n\n Rename the untitled dictionary, then crate a new custom dictionary.".format(custom_dict_path))
            return
        else:
            os.makedirs(custom_dict_path)

        # Setup the default/base dictionary object.
        # Read _tones.txt, _wordclases.txt, _help, and info.json from the base dictionary dir.
        self.defaultTree.setHierarchy(self.default_dict.getTones())

        # Create a new custom dict object.
        self.custom_dict = ds_dict.DSCustomDict(self.controller, custom_dict_path, self.default_dict)
        self.custom_dict_name = custom_dict_name

        # Add the new custom dict to the list
        self.projectPanel.addCustomDict(custom_dict_name)

        # Initialized the UI components.
        self.form.setCustomDictPath(custom_dict_path)                # help form.
        self.custom_dict_name = custom_dict_name
        # self.customTree.setHierarchy(self.custom_dict.getTones())    # tree
        self.setWindowTitle(custom_dict_name)
        self.enableToolsMenuItems()
        self.enableCustomDictMenuItems()
        self.updateCustomDictMenuItems(custom_dict_name)

        stats = self.default_dict.getStats()
        self.form.addDefaultInfo(stats)

        self.dict_icon.hide()

        self.exportAllAction.setEnabled(True)

    # ----------------------------------------
    # updateHelpForm(self, cluster_name, dimension_name)
    # This function is called when the user clicks an item in the custom
    # dictionary tree.
    # ----------------------------------------
    def updateHelpForm(self, cluster_name, dimension_name, lat_name):

        if dimension_name is None:  
            # cluster
            d = self.custom_dict.getCluster(cluster_name)

        elif lat_name is None:  
            # dimension
            d = self.custom_dict.getDimension(dimension_name)

        elif lat_name is not None:
            # lat
            d = self.custom_dict.getLAT(lat_name)

        self.form.setHelpContent(d)

    def updateHelpContent(self, cluster_name, dimension_name):

        if dimension_name == None:         # cluster
            d = self.custom_dict.getCluster(cluster_name)
        else:                              # dimension
            d = self.custom_dict.getDimension(dimension_name)

        if d == None:
            return

        help_content = self.form.getHelpContent()  # get the current help content from the form. it's a dict.

        if help_content != None:
            d['label'] = help_content['label']
            d['help']  = help_content['help']
            d['name']  = help_content['name']

    def getClusterName(self):
        d = self.form.getHelpContent()
        if d != None:
            return d['name']
        else:
            return None

    def categoryNameChanged(self, new_name):
        clust_name, dim_name, lat_name = self.customTree.getSelectedItem()
        if clust_name is not None and dim_name is None: # cluser is selected
            self.clusterNameChanged(new_name)
        elif clust_name is not None and dim_name is not None: # dim is selected
            self.dimensionNameChanged(new_name)

    def clusterNameChanged(self, new_name):   # this needs to work for dimensions too...
        old_name = self.customTree.selectedClusterNameChanged(new_name)
        if old_name != None:
            d = self.custom_dict.updateClusterName(old_name, new_name)
            self.form.setHelpContent(d)
            self.customDictChanged(update_info=False)

    def updateClusterName(self, old_name, new_name):
        d = self.custom_dict.updateClusterName(old_name, new_name)
        self.form.setHelpContent(d)
        self.customDictChanged(update_info=False)

    def dimensionNameChanged(self, new_name):   # this needs to work for dimensions too...
        old_name = self.customTree.selectedDimensionNameChanged(new_name)
        if old_name != None:
            d = self.custom_dict.updateDimensionName(old_name, new_name)
            self.form.setHelpContent(d)
            self.customDictChanged(update_info=False)

    def updateDimensionName(self, old_name, new_name):
        d = self.custom_dict.updateDimensionName(old_name, new_name)
        self.form.setHelpContent(d)
        self.customDictChanged(update_info=False)

    def renameCustomDict(self, dict_name):
        if self.custom_dict is not None:
            self.custom_dict.renameDictDirectory(dict_name)

    def save(self, force=False):

        cluster, dimension, lat = self.customTree.getSelectedItem()

        if cluster != None:
            self.updateHelpContent(cluster, dimension)

        if self.custom_dict != None:
            self.custom_dict.setPronouns(self.pronouns_checkbox.isChecked())
            self.custom_dict.setCommon(self.is_common_dict)        

            curr_dict_name = self.projectPanel.getCurrentDictName()
            # if curr_dict_name:
            # self.renameDictionaryIfNeeded(curr_dict_name)
            ret = self.custom_dict.save()

            if len(ret) > 0:
                dialogs.WarningDialog("Warning", 
                    "One or more clusters have not been saved because they have no dimensions. " + \
                    "({})".format(' '.join(ret)))

            # if self.custom_dict.isEmpty() == False:
            #     self.custom_dict.saveExportFilter()

            self.customDictSaved()

    def loadDictionary(self):
        if self.isCustomDictChanged():
            WarningDialog("Dictionary needs to be saved first...", 
                          "The dictionary has been edited. Save it first.")
            return

        self.controller.loadDictionary(self.custom_dict, self)

    def extractPatternsFromCorpus(self):
        if self.controller.isDictionaryLoaded():
            if self.isCustomDictChanged():
                res = dialogs.YesNoDialog("Dictionary has been edited", 
                              "Press OK to save and reload the dictionary now. \n\nIt may take a few minutes.")
                if res.retval == QMessageBox.Ok:
                    self.save()
                    self.loadDictionary()
            else:
                not_cancelled = self.controller.extractPatternsFromCorpus(self.custom_dict, editor_win=self) 
                if not_cancelled:
                    dialogs.ConfirmationDialog("Patterns are extracted and saved",
                               "See {}/patterns.json.".format(self.custom_dict.getDirectory()))
        else:
            if self.isCustomDictChanged():
                res = dialogs.YesNoDialog("Dictionary has not been saved and loaded.", 
                            "Press OK to save and load the dictionary now. \n\nIt may take a few minutes.")
            else:
                res = dialogs.YesNoDialog("Dictionary has not been loaded.", 
                            "Press OK to load the dictionary now. \n\nIt may take a few minutes.")
                
            if res.retval == QMessageBox.Ok:
                self.save() 
                self.loadDictionary()


    def diffDictAndCorpus(self):
        if self.controller.isDictionaryLoaded():
            if self.isCustomDictChanged():
                res = dialogs.YesNoDialog("Dictionary has been edited", 
                              "Press OK to save and reload the dictionary now. \n\nIt may take a few minutes.")
                if res.retval == QMessageBox.Ok:
                    self.save()
                    self.loadDictionary()
            else:
                self.controller.openDiffDictAndCorpusDialog(self.custom_dict, editor_win=self)
        else:
            if self.isCustomDictChanged():
                res = dialogs.YesNoDialog("Dictionary has not been saved and loaded.", 
                            "Press OK to save and load the dictionary now. \n\nIt may take a few minutes.")
            else:
                res = dialogs.YesNoDialog("Dictionary has not been loaded.", 
                            "Press OK to load the dictionary now. \n\nIt may take a few minutes.")
                
            if res.retval == QMessageBox.Ok:
                self.save() 
                self.loadDictionary()

    def isDefaultDimension(self, dimension_name):
        if self.default_dict.getDimension(dimension_name) is None:
            return False
        else:
            return True

    def isDefaultCluster(self, cluster_name):
        if self.default_dict.getCluster(cluster_name) is None:
            return False
        else:
            return True

##################################################
# VIEWS
##################################################

##################################################
#
# DefaultDictTree
#
##################################################

class DefaultDictTree(QTreeWidget):
    def __init__(self, editor_win=None, parent=None):
        super(DefaultDictTree, self).__init__(parent)

        self.editor_win = editor_win
        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1

        # Items selected by the user.
        self.selected_items = []
        self.unselect_in_progress = False

        self.setStyleSheet("DefaultDictTree {background-color: " + views.default_ui_input_background_color + ";" + \
                                     "selection-color: " + views.menu_selected_text_color + ";" + \
                                     "selection-background-color: " + views.menu_selected_color + ";}" + \
                                     "QListView::item:selected:!active  QWidget {background-color: #d6e8fe;}")

        # Behavior
        header= QTreeWidgetItem(["Base Dictionary"  ])
        self.setHeaderItem(header)  
        self.itemSelectionChanged.connect(self.itemSelected)
        self.setSelectionMode(QAbstractItemView.ContiguousSelection)
        self.setFocusPolicy(Qt.NoFocus)

    def itemSelected(self):
        is_error = False

        if self.unselect_in_progress == True:
            return

        self.selected_items = self.selectedItems()

        cluster_count   = 0
        dimension_count = 0

        for item in self.selected_items:
            parent = item.parent()
            if parent != None:
                dimension_count += 1
            else:
                for i in range(item.childCount()):
                    dim_item = item.child(i)
                    b = dim_item.foreground(0)
                    if b.color() == Qt.lightGray:
                        dialogs.WarningDialog("Warning", "One or more dimensions under this cluster are already in the custom dictionary.")
                        is_error = True
                        break

                if is_error:
                    break

                cluster_count += 1

        if is_error == False and cluster_count > 0 and dimension_count > 0:
            dialogs.WarningDialog("Warning", "Cluster and dimensions cannot be selected together.")
            is_error = True

        if is_error:
            self.unselect_in_progress = True
            for item in self.selected_items:
                item.setSelected(False)
            self.unselect_in_progress = False

    # ----------------------------------------
    # Returns a clone of the subset of the tree
    # ----------------------------------------    
    def cloneCurrentSelection(self):
        res = []

        for item in self.selected_items:

            if item.isDisabled():
                continue

            b = item.foreground(0)
            if b.color() == Qt.lightGray:
                dialogs.WarningDialog("Warning", 
                    "One or more dimensions under this cluster are already in the custom dictionary.")
                return []

            d = dict()
            d['item'] = item.clone()
            d['name'] = item.text(0)
            if item.parent() == None:
                d['cat_type'] = ds_dict.CLUSTER
            else:
                d['cat_type'] = ds_dict.DIMENSION
            res.append(d)

        return res

    def grayOutParent(self, dimension_name):
        parent = None
        items = self.findItems(dimension_name, Qt.MatchExactly | Qt.MatchRecursive, 0)
        if len(items)==1 and items[0].parent() != None:   # found a single match, which is a dim
            item = items[0]
            parent = item.parent()
        elif len(items)>=2: # if 2 ore more items are returned, there is a cluster with the same name.
            for i in items:               
                if i.parent() != None:   # an item with a parent is a dimension.
                    item = i
                    parent = item.parent()
        else:
            dialogs.WarningDialog("Error", "{} cannot be found.".format(dimension_name))

        if parent != None:
            b = QBrush(Qt.lightGray)
            b = QBrush(Qt.darkGray)
            parent.setForeground(0, b)

    def disableCurrentSelection(self):
        for item in self.selected_items:
            item.setDisabled(True)

    def disableItem(self, cluster, dimension):

        item = None

        # Cluster
        if dimension == None:  
            items = self.findItems(cluster, Qt.MatchExactly, 0)
            if len(items) != 1 or items[0].parent() != None:
                pass
                # dialogs.WarningDialog("disableItem() Error 1", "{} is not a valid default cluster.".format(cluster))
            elif len(items) == 1:
                item = items[0]
            else:
                # dialogs.WarningDialog("disableItem() Error 2", "{} is not a valid default cluster.".format(cluster))
                pass

            if item != None:
                item.setDisabled(True)

                for i in range(item.childCount()):   # enable all the children (dimensions)
                    dim_item = item.child(i)
                    dim_item.setDisabled(True)

        # Dimension
        elif cluster == None:
            item = None
            parent = None
            items = self.findItems(dimension, Qt.MatchExactly | Qt.MatchRecursive, 0)

            if len(items)==1 and items[0].parent() != None:   # found a single match
                item = items[0]
                parent = item.parent()
            elif len(items)>=2: # if 2 ore more items are returned, there is a cluster with the same name.
                for i in items:               
                    if i.parent() != None:   # an item with a parent is a dimension.
                        item = i
                        parent = item.parent()
            else:
                pass
                # dialogs.WarningDialog("disableItem() Error", "{} is not a valid default dimension.".format(dimension))

            if item != None and parent != None:
                item.setDisabled(True)
                b = QBrush(Qt.darkGray)
                parent.setForeground(0, b)

        if item is None:
            return False
        else:
            return True

    def enableItem(self, cluster_name, dimension_name):

        item = None
        # Cluster
        if dimension_name == None:  
            items = self.findItems(cluster_name, Qt.MatchExactly, 0)

            if len(items) != 1 or items[0].parent() != None:
                dialogs.WarningDialog("enableItem: Error 1.", "{} is not a valid default cluster.".format(cluster_name))
            elif len(items) == 1:
                item = items[0]
            else:
                dialogs.WarningDialog("enableItem: Error 2.", "{} is not a valid default cluster.".format(cluster_name))

            if item != None:
                item.setDisabled(False)
                # b = QBrush(Qt.black)
                # item.setForeground(0, b)

                for i in range(item.childCount()):   # enable all the children (dimension_name)
                    dim_item = item.child(i)
                    dim_item.setDisabled(False)

        # Dimension
        else:  
            items = self.findItems(dimension_name, Qt.MatchExactly | Qt.MatchRecursive, 0)

            # find the actual item that corresponds to the deleted item from the custom dict.
            if len(items)==1 and items[0].parent() != None:   # found a single match
                item = items[0]
                parent = item.parent()
            elif len(items)>=2: # if 2 ore more items are returned, there is a cluster with the same name.
                for i in items:
                    parent = i.parent()
                    if parent != None:   # an item with a parent is a dimension_name.
                        item = i
                        break
            else:
                dialogs.WarningDialog("enableItem: Error 3.", "{} is not a valid default dimension.".format(dimension_name))

            if item != None:
                item.setDisabled(False)   # enable the dimension deleted from the custom dict.

                # check if any of the siblings are still disabled. If not, change the color o the
                # cluster (parent)
                disabled_dim = False
                for index in range(parent.childCount()):
                    dim = parent.child(index)
                    if dim.isDisabled():
                        disabled_dim = True
                        break
                # if disabled_dim != True:
                    # b = QBrush(Qt.black)
                    # parent.setForeground(0, b)

    # ----------------------------------------    
    # Set a new dictionary hierarchy to the tree.
    # The existing hierarchy is cleared.
    # ----------------------------------------    
    def setHierarchy(self, hierarchy):  
        self.clear()
        self.selected_items == []
        for c in hierarchy:
            citem = QTreeWidgetItem(self, [c['name']])
            citem.setToolTip(0, " {} ".format(c['name']))

            for d in c['dimensions']:
                ditem = QTreeWidgetItem(citem, [d['name']])
                ditem.setToolTip(0, " {} ".format(d['name']))

                # for lat in d['lats']:
                    # lat_item = QTreeWidgetItem(ditem, [lat['name']])
                    # lat_item.setToolTip(0, " {} ".format(lat['name']))

        first = self.topLevelItem(0)
        self.scrollToItem(first)


##################################################
#
# CustomDictTree
#
##################################################

class CustomDictTree(QTreeWidget):
    def __init__(self, editor_win=None, parent=None):
        super(CustomDictTree, self).__init__(parent)

        self.editor_win = editor_win
        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_lat = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1
        self.curr_lat_index = -1

        self.selected_item = None
        self.default_tree = None

        self.setStyleSheet("CustomDictTree {background-color: " + views.default_ui_input_background_color + ";" + \
                                     "selection-color: " + views.menu_selected_text_color + ";" + \
                                     "selection-background-color: " + views.menu_selected_color + ";}" + \
                                     "QListView::item:selected:!active  QWidget {background-color: #d6e8fe;}")                                     

        # Behavior
        header= QTreeWidgetItem(["Custom"  ])
        self.setHeaderItem(header)  
        self.currentItemChanged.connect(self.categorySelectionChanged)
        self.setFocusPolicy(Qt.NoFocus)


    def categorySelectionChanged(self, current, previous):
        if current is None:
            return
        self.itemSelected(current, 0)

    def clearSelection(self):
        super().clearSelection()

        for i in range(self.topLevelItemCount()):
            item = self.topLevelItem(i)
            item.setSelected(False)
            for j in range(item.childCount()):
                child = item.child(j)
                child.setSelected(False)

        self.setCurrentItem(None)

        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_lat = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1
        self.curr_lat_index = -1

        self.selected_item = None

    def reset(self):
        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_lat = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1
        self.curr_lat_index = -1

        self.selected_item = None

        # Behavior
        header= QTreeWidgetItem(["Custom"  ])
        self.setHeaderItem(header)  
        self.setFocusPolicy(Qt.NoFocus)

    def getCategoryType(self, item):
        if item is None:
            return None

        parent = item.parent()
        if parent is not None:
            grand_parent = parent.parent()
        else:
            grand_parent = None

        if grand_parent is not None:
            return ds_dict.LAT

        elif parent is not None:
            return ds_dict.DIMENSION

        else:
            return ds_dict.CLUSTER

    def getSelectedItem(self):
        if self.selected_item != None:
            item = self.selected_item
            parent = item.parent()
            if parent is not None:
                grand_parent = parent.parent()
            else:
                grand_parent = None

            if grand_parent is not None:
                lat_name   = item.text(0)
                dim_name   = parent.text(0)
                clust_name = grand_parent.text(0)
            if parent is not None:
                lat_name   = None
                dim_name   = item.text(0)
                clust_name = parent.text(0)
            else:
                lat_name   = None
                dim_name   = None
                clust_name = item.text(0)

            return clust_name, dim_name, lat_name
        else:
            return None, None, None

    def getSelectedClusterIndex(self):
        if self.selected_item != None:
            item = self.selected_item
            parent = item.parent()

            if parent == None:
                index = self.indexOfTopLevelItem(item)
            else:
                index = self.indexOfTopLevelItem(parent)
        else:
            index = -1

        return index


    def saveLatestChanges(self):
        if self.curr_lat is not None:
            return

        if self.selected_item != None:
            item = self.selected_item
            parent = item.parent()
            if parent is not None:
                grand_parent = parent.parent()
            else:
                grand_parent = None

            if grand_parent is not None:
                return                

            if parent is None:  # cluster
                self.editor_win.updateHelpContent(item.text(0), None)
            else: # dimension
                self.editor_win.updateHelpContent(parent.text(0), item.text(0))

        self.editor_win.customDictChanged(update_info=False)


    def mousePressEvent(self, event):

        self.saveLatestChanges()   

        if self.selected_item != None:
            cluster_name = self.editor_win.getClusterName()
            if cluster_name != None:
                self.selected_item.setText(0, cluster_name)

        # clear selection if the background of the tree view is clicked
        self.clearSelection()

        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1
        self.selected_item = None

        self.form.clearHelpContent()

        # pass the event to its parent
        QTreeWidget.mousePressEvent(self, event)

    # ----------------------------------------    
    # Associate a helpform to itself
    # ----------------------------------------    
    def setForm(self, form):
        self.form = form

    def setDefaultTree(self, default_tree):
        self.default_tree = default_tree

    # ----------------------------------------    
    # Move up/dow the currently selected item.
    # ----------------------------------------    
    def moveSelectedItem(self, direction):

        # Moving a cluster item
        if self.curr_cluster_index < 0:
            return None

        if self.curr_dimension_index < 0:          
            num_clusters = self.topLevelItemCount()

            if self.curr_cluster_index == 0 and direction == views.UP:
                return None
            elif self.curr_cluster_index == (num_clusters-1) and direction == views.DOWN:
                return None
            else:
                removed_cluster_index = self.curr_cluster_index                
                child = self.topLevelItem(self.curr_cluster_index)
                bExpanded = child.isExpanded()
                child = self.takeTopLevelItem(self.curr_cluster_index)
                self.insertTopLevelItem(removed_cluster_index + direction, child) # move it up or down   
                self.setCurrentItem(child)
                child.setExpanded(bExpanded)
                removed_cluster_index += direction

            return child.text(0)
        else:
            if self.curr_dimension_index >= 0 and self.curr_lat_index < 0:
                dialogs.WarningDialog("Dimensions cannot be moved.",
                    "Only the top leve category (cluster) can be moved.")
            if self.curr_dimension_index >= 0 and self.curr_lat_index >= 0:
                dialogs.WarningDialog("LATs cannot be moved.",
                    "Only the top leve category (cluster) can be moved.")        
    # ----------------------------------------    
    # Set a new dictionary hierarchy. The old/existing
    # hierarchy is cleared.
    # ----------------------------------------    

    # QPalette p = treeWidget->palette();
    # p.setColor(QPalette::Highlight, Qt::red);
    # // or even different colors for different color groups (states)
    # // p.setColor(QPalette::Normal, QPalette::Highlight, Qt::green);
    # // p.setColor(QPalette::Disabled, QPalette::Highlight, Qt::blue);
    # treeWidget->setPalette(p);

    def setHierarchy(self, hierarchy):
        self.clear()

        self.isTreeInitialized = True

        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1
        self.selected_item = None

        for c in hierarchy:
            if c['name'] == 'Other':
                continue

            citem = QTreeWidgetItem(self, [c['name']])

            if c['default'] == True:
                b = QBrush(Qt.darkGray)
                citem.setForeground(0, b)
                self.default_tree.disableItem(c['name'], None)

            for d in c['dimensions']:
                ditem = QTreeWidgetItem(citem, [d['name']])
                if d['default'] == True:
                    b = QBrush(Qt.darkGray)
                    ditem.setForeground(0, b)
                    # Let's first try to disable a dimension titled d['name'] in the default dict.
                    # If it returns False, we'l disable a cluster titled d['name'].
                    if self.default_tree.disableItem(None, d['name']) == False:
                        # it's a base cluster
                        self.default_tree.disableItem(d['name'], None)
                        for lat in d['lats']:
                            lat_item = QTreeWidgetItem(ditem, [lat['name']])
                            b = QBrush(Qt.darkGray)
                            lat_item.setForeground(0, b)

                else:
                    for lat in d['lats']:
                        lat_item = QTreeWidgetItem(ditem, [lat['name']])
                        b = QBrush(Qt.darkGray)
                        lat_item.setForeground(0, b)
                        self.default_tree.disableItem(None, lat['name'].replace("_LAT", ""))

        # for i in range(self.topLevelItemCount()):
            # citem = self.topLevelItem(i)                    
            # citem.setExpanded(True)
            # for j in range(citem.childCount()):
                # ditem = citem.child(j)
                # ditem.setExpanded(True)

        self.selected_item == None
        self.isTreeInitialized = False

    def selectedClusterNameChanged(self, new_label):

        if self.curr_cluster == None:
            return None

        if self.selected_item is not None:
            self.selected_item.setText(0, new_label)

            old_label = self.curr_cluster
            self.curr_cluster = new_label
            return old_label

        else:
            return None

    def selectedDimensionNameChanged(self, new_label):

        if self.curr_dimension == None:
            return None

        if self.selected_item is not None:
            self.selected_item.setText(0, new_label)

            old_label = self.curr_dimension
            self.curr_dimension = new_label
            return old_label

        else:
            return None

    # ----------------------------------------    
    # This function is called if an item is clicked.
    # ----------------------------------------    
    def itemSelected(self, item, column):

        self.selected_item = item
        parent = item.parent()
        if parent is not None:
            grand_parent = parent.parent()
        else:
            grand_parent = None

        if parent is None:  # No parent. 'item' is a cluster
            self.curr_cluster = item.text(0)
            self.curr_cluster_index = self.indexOfTopLevelItem(item)
            self.curr_dimension = None
            self.curr_dimension_index = -1
            self.curr_lat = None
            self.curr_lat_index = -1

        elif parent is not None and grand_parent is None: # dim
            self.curr_cluster   = parent.text(0)
            self.curr_cluster_index = self.indexOfTopLevelItem(parent)
            self.curr_dimension = item.text(0)
            self.curr_dimension_index = self.indexFromItem(item).row()
            self.curr_lat = None
            self.curr_lat_index = -1

        elif grand_parent is not None:
            self.curr_cluster   = grand_parent.text(0)
            self.curr_cluster_index = self.indexOfTopLevelItem(grand_parent)
            self.curr_dimension = parent.text(0)
            self.curr_dimension_index = self.indexFromItem(parent).row()
            self.curr_lat = item.text(0)
            self.curr_lat_index = self.indexFromItem(item).row()

        self.editor_win.updateHelpForm(self.curr_cluster, self.curr_dimension, self.curr_lat)

    def deleteSelectedItem(self):

        if self.selected_item != None:
            dim_label = None
            cluster_label = None
            lat_label = None

            parent = self.selected_item.parent()         
            if parent is not None:
                grand_parent = parent.parent()
            else:
                grand_parent = None

            # cluster
            if parent == None:  
                cluster_label = self.selected_item.text(0)
                index = self.indexOfTopLevelItem(self.selected_item)
                self.takeTopLevelItem(index)
                self.clearSelection()
                self.curr_lat_index = -1
                self.curr_lat = None                
                self.curr_dimension_index = -1
                self.curr_dimension = None
                self.curr_cluster_index = -1
                self.curr_cluster = None
                self.selected_item = None

            # dimension
            elif parent is not None and grand_parent is None:
                dim_label = self.selected_item.text(0)

                b = parent.foreground(0)
                if b.color() == Qt.darkGray: # The cluster is from the default dict.
                    dialogs.WarningDialog("Locked Dimension",
                        "{} cannot be deleted. It is under a category copied from the base dictionary.".format(dim_label))
                    return None, None, None

                index     = parent.indexOfChild(self.selected_item)
                parent.takeChild(index)
                cluster_label = self.curr_cluster
                self.clearSelection()
                self.curr_lat_index = -1
                self.curr_lat = None                                
                self.curr_dimension_index = -1
                self.curr_dimension = None
                self.curr_cluster_index = -1
                self.curr_cluster = None                        
                self.selected_item = None

            elif grand_parent is not None:
                # lat is selected
                lat_label = self.selected_item.text(0)
                dim_label = self.curr_dimension

                if self.editor_win.isDefaultDimension(dim_label) or \
                   self.editor_win.isDefaultCluster(dim_label):

                    dialogs.WarningDialog("Locked LAT", 
                        "{} cannot be deleted. It is under a category copied from the base dictionary.".format(lat_label))
                    return None, None, None

                cluster_label = self.curr_cluster
                index     = parent.indexOfChild(self.selected_item)
                parent.takeChild(index)                

                # a lat always a default lat.
                self.clearSelection()
                self.curr_lat_index = -1
                self.curr_lat = None                
                self.curr_dimension_index = -1
                self.curr_dimension = None
                self.curr_cluster_index = -1
                self.curr_cluster = None                        
                self.selected_item = None

            return cluster_label, dim_label, lat_label

        else:
            if self.topLevelItemCount() == 0:
                return None, None, None
            else:
                dialogs.WarningDialog("Warning", "Nothing is selected.")
                return None, None, None

    # ----------------------------------------    
    # addNewCluster(self, index, cluster_name):
    # 
    # ----------------------------------------    
    def addNewCluster(self, index, cluster_name):

        new_item = QTreeWidgetItem([cluster_name])
#        new_item.setFlags(new_item.flags() | Qt.ItemIsEditable)
        if index > 0:
            self.insertTopLevelItem(index, new_item)
        else:
            self.addTopLevelItem(new_item)

        self.setCurrentItem(new_item)

        clust_name, dim_name, lat_name = self.getSelectedItem()

        self.editor_win.updateHelpForm(clust_name, None, None)

    # ----------------------------------------    
    # addNewCluster(self, index, cluster_name):
    # 
    # ----------------------------------------    
    def addNewDimension(self, dim_name):
        if self.curr_cluster_index < 0:
            dialogs.WarningDialog("Warning", "Select a cluster before adding dimensions.")
            return None

        new_item = QTreeWidgetItem([dim_name])

        citem = self.topLevelItem(self.curr_cluster_index)
        # b = QBrush(Qt.darkGray)
        # item.setForeground(0, b)

        # index = self.curr_dimension_index + 1 + offset
        citem.addChild(new_item)
        new_item.setSelected(False)

        citem.setExpanded(True)

        self.setCurrentItem(new_item)
        clust_name, dim_name, lat_name = self.getSelectedItem()
        self.editor_win.updateHelpForm(clust_name, dim_name, None)

        return citem.text(0)    # return the cluster's/parent's name


    def addDefaultCluster(self, item, offset):    
        # <item> is the item from the default dictionary tree

        b = QBrush(Qt.darkGray)
        item.setForeground(0, b)

        for i in range(item.childCount()):      # gray out the chidren that are moved
            dim_item = item.child(i)
            dim_item.setForeground(0, b)

        if self.curr_cluster_index > 0:
            index = self.curr_cluster_index + 1 + offset
        else:
            index = self.topLevelItemCount()

        self.insertTopLevelItem(index, item)

        return index

    def addDefaultDimension(self, item):
        # Add a new dimension to the currently selected cluster.
        if self.curr_cluster_index < 0:
            dialogs.WarningDialog("Warning", "Select a cluster before adding dimensions.")
            return None

        b = QBrush(Qt.darkGray)                               # make the selected default item dark gray
        item.setForeground(0, b)

        citem = self.topLevelItem(self.curr_cluster_index)    # get the currently selected clust
        citem.addChild(item)                                  # add the clust or the dim to the custom clust.
        item.setSelected(False)
        citem.setExpanded(True)

        return citem.text(0)    # return the cluster's/parent's name

    def addDefaultLAT(self, item):

        if self.curr_cluster_index < 0:
            dialogs.WarningDialog("Warning", "Select a dimension before adding LATs.")
            return None

        # change the color of the base dict item.
        b = QBrush(Qt.darkGray) 
        item.setForeground(0, b)

        ditem = self.selected_item    # currently selected dimension
        ditem.addChild(item)          # add the item to the currently selected dimension
        item.setSelected(False)       # the added item should not be selected.

        ditem.setExpanded(True)
        ditem.setSelected(True)

        return ditem.text(0)    # return the cluster's/parent's name

# ----------------------------------------
# NewCustomDictProjectDialog
# ----------------------------------------

class NewCustomDictProjectDialog(QDialog):
    def __init__(self, editor_win=None, controller=None, parent=None):

        super(NewCustomDictProjectDialog, self).__init__(parent)

        self.setModal(True)
        self.editor_win = editor_win;
        self.controller = controller

        width  = 800
        height = 120

        if platform.system() == 'Windows':
            # self.setGeometry(60,80,width*1.3,height*1.3)
            self.setMinimumWidth(1.3*width)
            self.setMinimumHeight(1.3*height)
        else:
            # self.setGeometry(60,80,width,height)
            self.setMinimumWidth(width)
            self.setMinimumHeight(height)

        self.setStyleSheet("NewCustomDictProjectDialog {background-color: #eee;}")

        fbox = QFormLayout()
        fbox.setVerticalSpacing(0)

        hbox = QHBoxLayout()
        self.base_dict_dir_field = QLineEdit()
        self.base_dict_dir_field.setReadOnly(True)
        self.dd_select_button = QPushButton("Select")
        self.dd_select_button.clicked.connect(self.selectBaseDict)
        hbox.addWidget(self.base_dict_dir_field)
        hbox.addWidget(self.dd_select_button)
        fbox.addRow(QLabel("Base Dictionary: "), hbox)
        fbox.addRow(QLabel(""), QLabel(""))

        hbox = QHBoxLayout()
        self.parent_dir_field = QLineEdit()
        self.parent_dir_field.setReadOnly(True)
        self.cd_select_button = QPushButton("Select")
        self.cd_select_button.clicked.connect(self.selectParentDir)
        hbox.addWidget(self.parent_dir_field)
        hbox.addWidget(self.cd_select_button)
        fbox.addRow(QLabel("Parent Folder: "), hbox)

        self.project_name_field = QLineEdit()
        self.project_name_field.setFixedWidth(100)
        fbox.addRow(QLabel("Project Name: "), self.project_name_field)

        fbox.addRow(QLabel(""), QLabel(""))

        hbox = QHBoxLayout()
        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.cancel)
        self.create_button = QPushButton("Create")
        self.create_button.clicked.connect(self.create)
        self.create_button.setDefault(True)
        hbox.addStretch()
        hbox.addWidget(self.cancel_button)
        hbox.addWidget(self.create_button)
        fbox.addRow(QLabel(""), hbox)

        self.setLayout(fbox)      

        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
      
        centerPoint = screen_rect.center()   
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft())   

    def setController(self, c):
        self.controller = c

    def cancel(self):
        self.hide()

    def selectBaseDict(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a base dictionary folder:', '', QFileDialog.ShowDirsOnly)
        if utils.is_exported_default_dict_dir(folder) != True:
            dialogs.WarningDialog("Warning", "This is not a valid base dictionary folder.")
        else:
            self.base_dict_dir_field.setText(folder)
            self.create_button.setDefault(True)

    def selectParentDir(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a parent folder for the custom dictionary:', '', QFileDialog.ShowDirsOnly)
        self.parent_dir_field.setText(folder)
        self.create_button.setDefault(True)

    def create(self):
        base_dict_path = self.base_dict_dir_field.text()
        parent_dir     = self.parent_dir_field.text()
        project_name   = self.project_name_field.text()

        if base_dict_path == "" or parent_dir == "" or project_name == "":
            dialogs.WarningDialog("Warning", "All the fields must be filled.")
        else:
            new_project_dir = os.path.join(parent_dir, project_name)
            if os.path.isdir(new_project_dir):
                dialogs.WarningDialog("Existing folder or project", "{} already exists.".format(new_project_dir))
                return
            else:
                self.editor_win.createNewCustomDictProject(base_dict_path, parent_dir, project_name)
                self.hide()

class HelpForm(QFrame):
    def __init__(self, infobox=False, name=False, read_only=False, editor_win=None, parent=None):
        super(HelpForm, self).__init__(parent)

        self.editor_win = editor_win

        self.default_stats = ""
        self.custom_stats  = ""

        if infobox == False:
            self.setMaximumHeight(240)

        vbox = QVBoxLayout() # main layout

        # 
        # Help Form
        #
        fbox = QFormLayout()

        if name:
            # help file (read only)
            self.help_name = QLineEdit()
            self.help_name.setReadOnly(False)
            self.help_name.editingFinished.connect(self.categoryNameChanged)
            fbox.addRow(QLabel("Name: "), self.help_name)
        else:
            self.help_name = None

        # label is a required field
        self.help_label = QLineEdit()
        if read_only:
            self.help_label.setReadOnly(True)
            self.help_label.setStyleSheet("QLineEdit { background-color: #eee; border: 1px solid #ccc;}");
        else:
            self.help_label.setReadOnly(False)

        self.help_label.setFocusPolicy(Qt.StrongFocus)
        fbox.addRow(QLabel("Label: "), self.help_label)

        self.help_content = QTextEdit()
        if read_only:
            self.help_content.setReadOnly(True)            
            self.help_content.setStyleSheet("QTextEdit { background-color: #eee; border: 1px solid #ccc;}");
        else:
            self.help_content.setReadOnly(False)
        self.help_content.setFocusPolicy(Qt.ClickFocus)

        if platform.system() == 'Windows':
            self.help_content.setMinimumHeight(100*1.3)
            self.help_content.setMaximumHeight(300*1.3)
        else:
            self.help_content.setMinimumHeight(100)
            self.help_content.setMaximumHeight(300)

        fbox.addRow(QLabel("Content: "), self.help_content)

        self.description = QTextEdit()
        self.description.setFocusPolicy(Qt.NoFocus)
        self.description.setStyleSheet("QTextEdit { background-color: #eee; border: none; }")
        self.description.setMaximumHeight(100)
        self.description.setReadOnly(True)

        fbox.addRow(QLabel(""), self.description)

        vbox.addLayout(fbox)
        #
        # Info box
        #
        if infobox:
            vbox.addSpacing(10)
            header = QLabel("Information")
            header.setStyleSheet("QLabel {font-weight: bold;}");
            vbox.addWidget(header)

            self.infobox = QTextEdit()
            self.infobox.setReadOnly(False)
            self.infobox.setFocusPolicy(Qt.NoFocus)
            self.infobox.setStyleSheet("QTextEdit { background-color: #eee;}");
            vbox.addWidget(self.infobox)

        self.setLayout(vbox) 

    def categoryNameChanged(self):
        if self.help_name is not None:
            text = self.help_name.text()
            text = utils.remove_punct_and_space(text)
            self.editor_win.categoryNameChanged(text)

    def clearInfobox(self):
        self.infobox.clear()

    def addDefaultInfo(self, text):
        self.clearInfobox()
        self.default_stats = text
        self.infobox.append(text)
        self.infobox.moveCursor(QTextCursor.Start);

    def addCustomInfo(self, text):
        self.clearInfobox()
        self.custom_stats = text
        self.infobox.append(self.default_stats)
        self.infobox.append(self.custom_stats)
        self.infobox.moveCursor(QTextCursor.Start);

    def addInfo(self, text):
        self.infobox.append(text)
        self.infobox.moveCursor(QTextCursor.Start);

    def saveItem(self):
        pass

    def getHelpContent(self):
        res = dict()
        if self.help_name is not None:
            name = utils.remove_punct_and_space(self.help_name.text())
            res['name']  = name
        else:
            res['name']  = None

        res['label'] = self.help_label.text()

        # Let's automatically remove new line characters.
        help_description = self.help_content.toPlainText()
        res['help']  = utils.remove_doublespaces_and_newlines(help_description)

        if self.help_name is not None:
            self.help_name.setText(name)

        return res

    def clearHelpContent(self):
        if self.help_name is not None:
            self.help_name.setText("")
        self.help_label.setText("")
        self.help_content.setText("")

    def setDescription(self, html_str):
        self.description.setHtml(html_str)

    def setHelpContent(self, category_d):
        if category_d is None:
            self.help_name.setText("")
            self.help_label.setText("")
            self.help_content.setText("")
            dialogs.WarningDialog("ERROR:", "setHelpContent() category_d is None.")
            return

        is_default = category_d.get('default', False)
        cat_type   = category_d.get('type', None)

        help_name_str = ""
        if self.help_name is not None:
            help_name_str = category_d.get('name', "n/a")
            self.help_name.setText(help_name_str)
        self.help_label.setText(category_d.get('label', "n/a"))
        self.help_content.setText(category_d.get('help', "n/a"))

        if help_name_str.startswith("Untitled"):
            self.help_name.home(True)
            self.help_name.setFocus()
        else:
            self.help_name.home(False)

        self.help_label.home(False)
        self.help_label.clearFocus()

        html_dscr = ""

        if is_default:
            if cat_type == 'LAT':
                self.help_name.setReadOnly(True)
                self.help_name.setStyleSheet("QLineEdit { background-color: #eee;}");
                self.help_name.setFocusPolicy(Qt.NoFocus)

                self.help_label.setReadOnly(True)
                self.help_label.setStyleSheet("QLineEdit { background-color: #eee;}");
                self.help_label.setFocusPolicy(Qt.NoFocus)

                self.help_content.setReadOnly(True)
                self.help_content.setStyleSheet("QTextEdit { background-color: #eee;}");
                self.help_content.setFocusPolicy(Qt.NoFocus)

                if cat_type == 'LAT':
                    html_dscr = "This LAT is copied from the dimension level of the base dictionary."
          
            elif cat_type == "CLUSTER" or cat_type == 'DIMENSION':
                self.help_name.setReadOnly(True)
                self.help_name.setStyleSheet("QLineEdit { background-color: #eee;}");
                self.help_name.setFocusPolicy(Qt.NoFocus)

                self.help_label.setReadOnly(False)
                self.help_label.setStyleSheet("QLineEdit { background-color: #fff;}");
                self.help_label.setFocusPolicy(Qt.ClickFocus)

                self.help_content.setReadOnly(False)
                self.help_content.setStyleSheet("QTextEdit { background-color: #fff;}");
                self.help_content.setFocusPolicy(Qt.ClickFocus)                

                if cat_type == 'CLUSTER':
                    html_dscr = "This cluster is copied from the cluster level of the base dictionary."
                else:
                    if self.editor_win.isDefaultDimension(help_name_str):
                        html_dscr = "This dimension is copied from the dimension level of the base dictionary."
                    else:
                        html_dscr = "This dimension is copied from the cluster level of the base dictionary."

        else:
            self.help_name.setReadOnly(False)
            self.help_name.setStyleSheet("QLineEdit { background-color: #fff}");
            self.help_name.setFocusPolicy(Qt.ClickFocus)

            self.help_label.setReadOnly(False)
            self.help_label.setStyleSheet("QLineEdit { background-color: #fff}");
            self.help_label.setFocusPolicy(Qt.ClickFocus)

            self.help_content.setReadOnly(False)
            self.help_content.setStyleSheet("QTextEdit { background-color: #fff}");
            self.help_content.setFocusPolicy(Qt.ClickFocus)

            if cat_type == 'CLUSTER':
                html_dscr = "This cluster is user-defined."

            elif cat_type == 'DIMENSION':
                html_dscr = "This dimension is user-defined."

        html_dscr = "<p style=\"color: #666\">" + html_dscr + "</p>"
        self.setDescription(html_dscr)

    def setCustomDictPath(self, custom_dict_path):
        self.custom_dict_path = custom_dict_path
        self.custom_dict_name = custom_dict_path[custom_dict_path.rfind("/")+1:]

    def clearAll(self):
        if self.help_name is not None:
            self.help_name.setText("")
        self.help_label.setText("")
        self.help_content.setText("")


class CustomDictProjectPanel(QFrame):
    def __init__(self, editor_win=None, parent=None):
        super(CustomDictProjectPanel, self).__init__(parent)

        self.editor_win = editor_win
        self.controller = None
        self.ignore_updates = True

        self.setFixedWidth(240)
        main_vbox = QVBoxLayout() 
        main_vbox.setContentsMargins(0,0,0,0)

        title = QLabel("Custom Dictionaries")
        title.setStyleSheet("font-weight: bold;")
        main_vbox.addWidget(title)

        # List of Synonyms
        self.list_view = QListWidget()
        self.list_view.currentItemChanged.connect(self.customDictChanged)
        self.list_view.setMaximumHeight(600)
        # self.list_view.currentTextChanged.connect(self.nameChanged)
        self.list_view.setStyleSheet("QListWidget {background-color: " + views.default_ui_input_background_color + ";" + \
                                     "selection-color: " + views.menu_selected_text_color + ";" + \
                                     "selection-background-color: " + views.menu_selected_color + ";}" + \
                                     "QListView::item:selected:!active  QWidget {background-color: #d6e8fe;" + \
                                                                      # "selection-background-color: #00f;" + \
                                                                      "}"
                                     )
        # self.list_view.setMovement(QListWidget.Snap)
        # self.list_view.setDefaultDropAction(Qt.MoveAction)
        self.list_view.setSortingEnabled(True)
        main_vbox.addWidget(self.list_view)

        fbox = QFormLayout()
        self.dict_name_box = QLineEdit()
        self.dict_name_box.setReadOnly(False)
        self.dict_name_box.editingFinished.connect(self.updateSelectedItem)
        fbox.addRow(QLabel("Name: "), self.dict_name_box)

        main_vbox.addLayout(fbox)

        hbox = QHBoxLayout()
        hbox.addStretch()
        self.update_button = QPushButton("Rename")
        self.update_button.clicked.connect(self.updateSelectedItem)
        self.update_button.setEnabled(False)
        self.update_button.setAutoDefault(True)
        hbox.addWidget(self.update_button)
        main_vbox.addLayout(hbox)

        main_vbox.addSpacing(5)

        hbox = QHBoxLayout()
        self.common_dict_checkbox = QCheckBox("DS Classroom Compatible")
        self.common_dict_checkbox.setChecked(False)
        self.common_dict_checkbox.setAttribute(Qt.WA_TransparentForMouseEvents)
        self.common_dict_checkbox.setFocusPolicy(Qt.NoFocus)

        hbox.addWidget(self.common_dict_checkbox)
        main_vbox.addLayout(hbox)

        main_vbox.addStretch()

        self.setLayout(main_vbox)
        self.ignore_updates = False
        # self.installEventFilter(self)

    def reset(self):
        self.list_view.clear()
        self.dict_name_box.clear()
        self.update_button.setEnabled(False)
        self.common_dict_checkbox.setChecked(False)

    def setCommonDict(self, val):
        self.common_dict_checkbox.setChecked(val)        

    def clearSelection(self):
        self.ignore_updates = True
        for i in range(self.list_view.count()):
            item = self.list_view.item(i)
            item.setSelected(False)
        self.ignore_updates = False

    def selectDictAt(self, r):
        if r < self.list_view.count():
            self.list_view.setCurrentRow(r)
            item = self.list_view.item(r)
            item.setSelected(True)
            self.list_view.setFocus()
            self.dict_name_box.setText(item.text())

    def getCustomDictionaries(self):
        names = list()
        for i in range(self.list_view.count()):
            item = self.list_view.item(i)
            names.append(item.text())

        return names

    def countCustomDictionaries(self):
        return self.list_view.count()

    def getCurrentDictName(self):
        item = self.list_view.currentItem()
        if item is not None:
            name = item.data(Qt.UserRole)
            curr_text = item.text()
            if name != curr_text:
                item.setData(Qt.UserRole, curr_text)
            return curr_text
        else:
            return ""

    def saveSelectedCustomDict(self):
        self.editor_win.save()

    def addCustomDict(self, custom_dict_name):
        self.ignore_updates = True
        item = QListWidgetItem(custom_dict_name)
        item.setData(Qt.UserRole, custom_dict_name)
        # item.setFlags(item.flags() | Qt.ItemIsEditable)
        self.list_view.addItem(item)
        self.list_view.setCurrentItem(item)
        # self.list_view.editItem(item)

        self.list_view.setFocus(True)
        self.dict_name_box.setText(custom_dict_name)
        if custom_dict_name.startswith("Untitled"):
            self.dict_name_box.selectAll()
            self.dict_name_box.setFocus()
        self.update_button.setEnabled(True)

        self.ignore_updates = False

    def deleteSelectedDict(self):
        row = self.list_view.currentRow()
        self.list_view.takeItem(row)

    def customDictChanged(self, current_item, previous_item):

        if self.ignore_updates:
            return

        curr_custom_dict_name = ""
        prev_custom_dict_name = ""

        if current_item is not None:
            curr_custom_dict_name = current_item.data(Qt.UserRole) 

        if previous_item is not None:
            prev_custom_dict_name = previous_item.data(Qt.UserRole) 

        if previous_item != current_item:
            self.dict_name_box.setText(curr_custom_dict_name)
            self.editor_win.closeCustomDict(prev_custom_dict_name)
            self.editor_win.openCustomDict(curr_custom_dict_name)


    def updateSelectedItem(self):
        if self.ignore_updates:
            return        
        new_name = self.dict_name_box.text()
        curr_item = self.list_view.currentItem()
        curr_item.setData(Qt.UserRole, new_name)
        curr_item.setText(new_name)
        self.editor_win.renameCustomDict(new_name)



class CustomDictNameDialog(QDialog):
    def __init__(self):
        super(CustomDictNameDialog, self).__init__()

        self.setStyleSheet("CustomDictNameDialog {background-color: " + views.default_ui_background_color + ";}" + \
                                                    "QLabel {color: " + views.default_ui_text_color + ";}" + \
                                    "QPushButton {background-color: " + views.default_ui_button_color + ";" + \
                                                            "color: " + views.default_ui_text_color + ";}" + \
                                      "QLineEdit {background-color: " + views.default_ui_input_background_color + ";" + \
                                                            "color: " + views.default_ui_text_color + ";}")
        self.setModal(True)
        self.retval = 0

        main_vbox = QVBoxLayout()

        # messages
        msg = QLabel("New Custom Dictionary")
        msg.setStyleSheet("font-weight: bold;")
        main_vbox.addWidget(msg)

        msg = QLabel("Enter name of the new custom dictionary:")
        main_vbox.addWidget(msg)

        # input field
        self.name_field = QLineEdit()
        # self.name_field.setMinimumWidth(400)
        self.name_field.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.Preferred)
        main_vbox.addWidget(self.name_field)

        self.common_dict_checkbox = QCheckBox("CMU Common Dictionary")
        self.common_dict_checkbox.setChecked(False)
        main_vbox.addWidget(self.common_dict_checkbox)

        # buttons
        hbox = QHBoxLayout()
        hbox.addStretch()

        cancel_button = QPushButton("Cancel")
        cancel_button.clicked.connect(self.reject)
        cancel_button.setAutoDefault(False)        
        hbox.addWidget(cancel_button)

        ok_button = QPushButton("Ok")
        ok_button.clicked.connect(self.accept)
        ok_button.setAutoDefault(True)
        hbox.addWidget(ok_button)
        main_vbox.addLayout(hbox)

        self.setLayout(main_vbox)

        self.setFixedWidth(400)
        self.name_field.setFocus()

        # self.show()
        self.retval = self.exec_() 

    def reject(self):
        self.done(QMessageBox.Cancel)

    def accept(self):
        self.done(QMessageBox.Ok)

    def getCustomDictName(self):
        text = self.name_field.text()
        text = text.strip()
        if text:
            return text
        else:
            return None

    def isCommonDict(self):
        return self.common_dict_checkbox.isChecked()



