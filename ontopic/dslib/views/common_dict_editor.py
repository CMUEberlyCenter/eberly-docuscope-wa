#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
common_dict_editor.py

"""

import os, sys
import platform
import json
import string
import re
import copy
import shutil
import traceback
import shlex, subprocess
import time
import threading

from operator import itemgetter

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

from zipfile import ZipFile

import dslib.views              as views
import dslib.views.dialogs      as dialogs
import dslib.models.dict        as ds_dict
import dslib.utils              as utils

import pprint     
pp = pprint.PrettyPrinter(indent=4)

UP   = -1
DOWN = 1

class CommonDictEditor(QMainWindow):

    def __init__(self, app_win, controller, parent=None):

        super(CommonDictEditor, self).__init__(parent)

        self.app_win = app_win
        self.controller = controller

        self.custom_dict  = None
        self.default_dict = None

        self.common_dict  = None

        self.initUI()
        self.initMenus()

        self.dict_not_saved = False
        self.dict_changed   = False

    def initMenus(self):

        menubar = self.menuBar()
        menubar.setNativeMenuBar(True)

        fileMenu = menubar.addMenu('&File')

        self.newCommonDictAction = QAction('&New Common Dictionary...', self)
        self.newCommonDictAction.triggered.connect(self.newCommonDict)
        fileMenu.addAction(self.newCommonDictAction)

        self.openCommonDictAction = QAction('&Open Common Dictionary', self)
        self.openCommonDictAction.triggered.connect(self.openCommonDict)
        fileMenu.addAction(self.openCommonDictAction)

        self.saveAction = QAction('Save Common Dictionary', self)        
        self.saveAction.triggered.connect(self.saveCommonDict)
        self.saveAction.setEnabled(False)
        fileMenu.addAction(self.saveAction)

        self.deleteCommonDictAction = QAction('&Delete Common Dictionary', self)
        self.deleteCommonDictAction.triggered.connect(self.deleteCommonDict)
        self.deleteCommonDictAction.setEnabled(False)
        fileMenu.addAction(self.deleteCommonDictAction)        

        fileMenu.addSeparator()

        self.exportHelpContentAction = QAction('Export Common Dictionary Help Content (.docx)', self)   
        self.exportHelpContentAction.triggered.connect(self.exportHelpContent)
        self.exportHelpContentAction.setEnabled(False)
        fileMenu.addAction(self.exportHelpContentAction)

        self.exportHierarchyAction = QAction('Export Common Dictionary Hierarchy (.csv)', self)   
        self.exportHierarchyAction.triggered.connect(self.exportHierarchy)
        self.exportHierarchyAction.setEnabled(False)
        fileMenu.addAction(self.exportHierarchyAction)

        fileMenu.addSeparator()

        self.closeAction = QAction('Close', self)
        self.closeAction.triggered.connect(self.close)
        fileMenu.addAction(self.closeAction)

    def initUI(self):               

        font_size = views.default_ui_font_size

        button_ht = 26

        # Main Window
        # ----------
        self.setWindowTitle('Common Dictionary Editor')

        # Base Container Widget
        container = QWidget()
        vbox = QVBoxLayout()

        top_hbox = QHBoxLayout()    
        header = QLabel("Common/Custom Dictionary Path: ")
        top_hbox.addWidget(header)
        self.custom_dict_path_box = QLabel("")
        top_hbox.addWidget(self.custom_dict_path_box)
        top_hbox.addStretch()
        vbox.addLayout(top_hbox)

        path_hbox = QHBoxLayout()    
        header = QLabel("Based on: ")
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
        #
        # Left Pane: Top Level Category
        #
        column_vbox = QVBoxLayout()

        hcontrol_area = QHBoxLayout()

        self.add_button = QComboBox()
        self.add_button.addItem("   Add ...")
        self.add_button.addItem("Add Category")
        self.add_button.addItem("Add Subcategory")
        self.add_button.setCurrentIndex(0)
        self.add_button.currentIndexChanged.connect(self.addNewCategory)
        hcontrol_area.addWidget(self.add_button)

        self.delete_buttom = QPushButton("Delete")
        self.delete_buttom.clicked.connect(self.deleteSelectedCategory)
        self.delete_buttom.setAutoDefault(False)
        hcontrol_area.addWidget(self.delete_buttom)

        self.move_up_button = QPushButton()
        self.move_up_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/up_icon.png"))))
        self.move_up_button.clicked.connect(self.moveSelectedCategoryUp)
        self.move_up_button.setAutoDefault(False)
        hcontrol_area.addWidget(self.move_up_button)

        self.move_down_buttom = QPushButton()
        self.move_down_buttom.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/down_icon.png"))))
        self.move_down_buttom.clicked.connect(self.moveSelectedCategoryDown)
        self.move_down_buttom.setAutoDefault(False)
        hcontrol_area.addWidget(self.move_down_buttom)
        
        self.category_tree= CommonDictTree(editor_win=self)
        self.category_tree.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

        pcontrol_area = QHBoxLayout()
        pcontrol_area.addWidget(QLabel("Propreties"))
        self.update_category_info_button = QPushButton("Update")
        self.update_category_info_button.clicked.connect(self.updateCategoryInfo)
        self.update_category_info_button.setAutoDefault(True)
        pcontrol_area.addStretch()
        pcontrol_area.addWidget(self.update_category_info_button)

        self.category_help_form = HelpForm(editor_win=self)

        column_vbox.addLayout(hcontrol_area)
        column_vbox.addWidget(self.category_tree)
        column_vbox.addLayout(pcontrol_area)
        column_vbox.addWidget(self.category_help_form)

        hbox.addLayout(column_vbox)

        # Left Arrow Button
        vcontrol_area  = QVBoxLayout()
        vcontrol_area.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.add_to_subcategory_button = QPushButton()
        self.add_to_subcategory_button.setIcon(QIcon(QPixmap(utils.resource_path("data/icons/left_icon.png"))))
        self.add_to_subcategory_button.clicked.connect(self.addClustersToSubcategory)
        self.add_to_subcategory_button.setFocusPolicy(Qt.NoFocus)
        vcontrol_area.addSpacing(250)
        vcontrol_area.addWidget(self.add_to_subcategory_button)
        vcontrol_area.addStretch()
        hbox.addLayout(vcontrol_area)

        # BASE TREE
        column_vbox = QVBoxLayout()        

        self.base_tree = BaseDictTree(editor_win=self)

        self.base_tree.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)
        self.base_help_form = HelpForm(editor_win=self, read_only=True)

        # column_vbox.addLayout(top_hbox)
        column_vbox.addWidget(self.base_tree)
        column_vbox.addWidget(self.base_help_form)

        hbox.addLayout(column_vbox)
        vbox.addLayout(hbox)

        container.setLayout(vbox)

        self.setCentralWidget(container) 

    def newCommonDict(self):
        self.openCommonDict()

    def deleteCommonDict(self):
            wd = dialogs.YesNoDialog("Are you sure you want to permanently delete this custom dictionary?",
                                     "Press the OK button to permanently delete the common dictionary.")

            if wd.retval == QMessageBox.Cancel:
                return

            elif wd.retval == QMessageBox.Ok:
                custom_dict_dir = self.custom_dict.getDirectory()
                common_dict_info_path = os.path.join(custom_dict_dir, "common_dict.json")
                if os.path.exists(common_dict_info_path):
                    os.remove(common_dict_info_path)

                self.custom_dict_locked = False
                self.base_tree.resetView()
                self.category_tree.resetView()

            self.deleteCommonDictAction.setDisabled(True)
            self.exportHelpContentAction.setDisabled(True)
            self.exportHierarchyAction.setDisabled(True)


    def openCommonDict(self):

        common_dict_path = QFileDialog.getExistingDirectory(None, 'Select a folder:', '', QFileDialog.ShowDirsOnly)        

        if common_dict_path == "":
            return

        base_dict_path = None  # the path to the defatul/base dict folder

        if utils.is_custom_dict_dir(common_dict_path) == False:
            dialogs.WarningDialog("Error", "This is not a valid custom dictionary folder.")
            return

        if os.path.isfile(os.path.join(common_dict_path, "common_dict.json")) == True:
            # If there is a common dictionary definitions (i.e., common_dict.json),
            # disable the buttons for customizing the custom dictionary.
            self.custom_dict_locked = True

        with open(os.path.join(common_dict_path, "info.json")) as fin:
            info = json.load(fin)
            base_dict_path = info['base_dict_path']  # The custom dict does not know the base-dict... it should
            is_customized  = info['customized']
            pronouns = info.get('pronouns', False)

        base_dict_name = os.path.basename(base_dict_path)
        if os.path.exists(base_dict_path) == False:
            wd = dialogs.YesNoDialog("{} not found.".format(base_dict_name),
                                     "{} does not exist.\nLocate the dictionary file.".format(base_dict_name))
            if wd.retval == QMessageBox.Cancel:
                return
            elif wd.retval == QMessageBox.Ok:
                base_dict_path = QFileDialog.getExistingDirectory(None, 'Select a base dictionary folder:', '', QFileDialog.ShowDirsOnly)                

                with open(os.path.join(common_dict_path, "info.json"), 'w') as fout:
                    info['base_dict_path'] = base_dict_path
                    json.dump(info, fout, indent=4)

        if base_dict_path == "" or base_dict_path == None:
            return

        self.base_dict_path_box.setText(base_dict_path)

        self.base_dict = ds_dict.DSDict(self.controller, base_dict_path)
        self.base_dict.loadInfo()
        self.base_dict.loadTones()
        self.base_dict.loadWordClasses()
        self.base_dict.loadHelp()

        # Display the custom dictionary path
        self.custom_dict_path_box.setText(common_dict_path)

        # Read _custom_tones.txt from the custom dict folder
        self.custom_dict = ds_dict.DSCustomDict(self.controller, common_dict_path, self.base_dict)

        self.custom_dict.loadTones()
        self.custom_dict.loadHelp()

        if self.custom_dict.isEmpty():
            self.base_tree.setHierarchy(self.base_dict.getTones(), self.base_dict)
        else:
            self.base_tree.setHierarchy(self.custom_dict.getTones(), self.base_dict)

        self.common_dict = ds_dict.DSCommonDict(self.controller, self.custom_dict, self.base_dict)

        if self.common_dict.isEmpty() == False:
            self.category_tree.setHierarchy(self.common_dict.getCategories())

        self.deleteCommonDictAction.setEnabled(True)
        self.exportHelpContentAction.setEnabled(True)
        self.exportHierarchyAction.setEnabled(True)

    def saveCommonDict(self):
        """
        Save the data in a single JSON file.
        """
        self.common_dict.save()
        self.dictSaved()

    def exportHelpContent(self):
        """
        Export the common dictionary content in a MS Word file. It includes the top 3 layers of the
        hierarchy (Category, Subcategory, Cluster) with the help content. This file only includes
        category labels (not names)
        """
        if self.isDictNotSaved():
             dialogs.WarningDialog("Warning", "Save the common dictionary first.")
        else:
            filename = "Common Dictionary Category Definitions.docx"
            path = os.path.join(self.common_dict.getDirectory(), filename)
            filepath, _ = QFileDialog.getSaveFileName(None, 'Enter File Name', path, "Text File (*.docx)")

            if filepath != "":
                self.common_dict.generateHelpDoc(filepath)


    def exportHierarchy(self):
        if self.isDictNotSaved():
             dialogs.WarningDialog("Warning", "Save the common dictionary first.")
        else:
            filename = "Common Dictionary Hierarchy.csv"
            path = os.path.join(self.common_dict.getDirectory(), filename)
            filepath, _ = QFileDialog.getSaveFileName(None, 'Enter File Name', path, "Text File (*.csv)")

            if filepath != "":
                self.common_dict.generateHierarchyDoc(filepath)

    def closeEditor(self):
        if self.isDictNotSaved():
            wd = dialogs.SaveWarningDialog2("\nThe Common Dictionary hasn't been saved.", 
                                            "Do you want to save the changes before closing the editor?")

            if wd.retval == QMessageBox.Discard:
                self.controller.invalidateCommonDictEditor()

            elif wd.retval == QMessageBox.Save:
                self.common_dict.save()

            self.close()

    def addClustersToSubcategory(self):
        if self.base_tree != None and self.category_tree != None:

            lst = self.base_tree.getCurrentSelection()
            num_clusters = len(lst)
            if num_clusters == 0:
                dialogs.WarningDialog("No clusters are selected", "Select clusters first before pressing the add button.")
                return

            curr_cat, curr_subcat, clust_name, dim_name = self.category_tree.getSelectedItemNames()

            if curr_subcat is None:
                # top level category is selected
                if num_clusters == 1:
                    dialogs.WarningDialog("Subcategory not selected", "Select a subcategory before adding a cluster.")
                else:
                    dialogs.WarningDialog("Subcategory not selected", "Select a subcategory before adding clusters.")
                return

            # if we are here, at least curr_subcat is not None.
            if clust_name is not None and dim_name is None:
                cat_type = ds_dict.CLUSTER
            elif clust_name is not None and dim_name is not None:
                cat_type = ds_dict.DIMENSION
            else:
                cat_type = ds_dict.SUBCATEGORY

            cat_count = 0

            if cat_type != ds_dict.SUBCATEGORY:
                if cat_type == ds_dict.CLUSTER:
                    cat_str = "Cluster"
                else:
                    cat_str = "Dimension"   

                if len(lst) == 1:
                    plural_str = ""
                else:
                    plural_str = "s"

                dialogs.WarningDialog("{} is selected".format(cat_str),
                                      "The selected cluster{} will be added to: {}".format(plural_str, curr_subcat))

            for d in lst:
                if d['cat_type'] == ds_dict.CLUSTER:
                    index = self.category_tree.addCustomCluster(d['item'], cat_count, cat_type=cat_type)
                    self.common_dict.addCustomCluster(curr_subcat, d['item'].text(0), index, cat_type=cat_type)
                    cat_count += 1

            self.category_tree.sortClusters(curr_subcat)

            self.base_tree.disableCurrentSelection()
            self.base_tree.clearSelection()

            self.dictChanged()

    ###############
    #
    # 4 Buttons / Add, Delete, Move Up/Down
    #
    ###############

    def addNewCategory(self, cat_type):

        subcat_name = None
        cat_index = self.category_tree.getSelectedCategoryIndex()

        if cat_index < 0 and cat_type == ds_dict.SUBCATEGORY:
            dialogs.WarningDialog("Warning", "Select a categroy first before adding a subcategory")

        cat_name, subcat_name, cust_name, dim_name = self.category_tree.getSelectedItemNames()

        if cat_type == ds_dict.CATEGORY:
            if cat_index < 0:
                cat_name = self.common_dict.addNewCategory(cat_index)
                self.category_tree.addNewCategory(cat_index, cat_name)        
            else:
                cat_name = self.common_dict.addNewCategory(cat_index+1)
                self.category_tree.addNewCategory(cat_index+1, cat_name)

        elif cat_type == ds_dict.SUBCATEGORY and cat_name != None:
            subcat_name = self.common_dict.addNewSubcategory(cat_name)
            self.category_tree.addNewSubcategory(cat_index, subcat_name)

        self.updateCategoryHelpForm(cat_name, subcat_name, None, None)

        self.add_button.setCurrentIndex(0)

        self.dictChanged()

    def deleteSelectedCategory(self):
        """
        This function is called when the 'delete' button (x) is clicked. The delete category can be
        the top level category or the sub category. When a category (top level) is deleted, the sub 
        categories under it are released to the sub categories tree.
        """
        # WARNING DIALOG
        curr_cat, curr_subcat, curr_clust, curr_dim = self.category_tree.getSelectedItemNames()
        if curr_cat is not None:
            if curr_subcat is not None:
                if curr_clust is not None:
                    if curr_dim is not None:
                        dialogs.WarningDialog("Dimensions cannot be deleted.", "")
                        return
                    else:
                        name = curr_clust
                        msg  = "\"{}\" will be removed from \"{}.\"".format(curr_clust, curr_subcat)
                else:
                    name = curr_subcat
                    msg = "\"{}\" will be deleted permanently.".format(curr_subcat)
            else:
                name = curr_cat
                msg = "\"{}\" and all of its subcategories will be deleted permanently.".format(name)
        else:
            dialogs.WarningDialog("Nothing is selected.", "")
            return

        wd = dialogs.YesNoDialog("Are you sure you want to delete \"{}\"?".format(name),
                                 msg)

        if wd.retval == QMessageBox.Cancel:
            return
        elif wd.retval == QMessageBox.Ok:
            pass


        deleted = self.category_tree.deleteSelectedItem()
        if deleted['cat'] == None and deleted['subcat'] == None and deleted['clusters'] == None:
            return

        self.common_dict.deleteCategory(deleted)

        if deleted['clusters'] is not None:
            self.base_tree.enableItem(deleted['clusters'])

        self.dictChanged()

    def moveSelectedCategoryUp(self):
        if self.category_tree != None:
            top_cat = self.category_tree.moveSelectedItem(UP)
            if top_cat != None:
                self.common_dict.moveCategory(top_cat, UP)
                self.dictChanged()

    def moveSelectedCategoryDown(self):
        if self.category_tree != None:
            top_cat = self.category_tree.moveSelectedItem(DOWN)
            if top_cat != None:
                self.common_dict.moveCategory(top_cat, DOWN)
                self.dictChanged()

    def updateCategoryInfo(self):
        if self.category_tree.isClusterSelected() != True:
            label = self.getCategoryLabel()  # get a cluster name form the help form
            if label is not None:
                self.categoryHelpContentChanged()
                self.category_tree.setSelectedItemText(label)
                self.dictChanged()

    def updateBaseHelpForm(self, cluster_name, dim_name):
        """
        """
        if cluster_name is None and dim_name is None:
            self.base_help_form.clearHelpContent()
            return

        if cluster_name is not None and dim_name is None:
            clust = self.custom_dict.getItem(cluster_name, dim_name)
            self.base_help_form.setHelpContent(clust, False)

        elif dim_name is not None:
            dim = self.custom_dict.getItem(cluster_name, dim_name)
            self.base_help_form.setHelpContent(dim, False)

    def updateCategoryHelpForm(self, cat_label, subcat_label, cluster_label, dim_label):
        """
        This function is called when the user clicks an item in the custom
        dictionary tree.
        """

        if cat_label is not None and subcat_label is None:
            self.update_category_info_button.setEnabled(True)
            cat = self.common_dict.getItem(cat_label, subcat_label, cluster_label, dim_label)
            self.category_help_form.setHelpContent(cat, True)

        elif subcat_label is not None and cluster_label is None:
            self.update_category_info_button.setEnabled(True)
            subcat = self.common_dict.getItem(cat_label, subcat_label, cluster_label, dim_label)
            self.category_help_form.setHelpContent(subcat, True)

        elif cluster_label is not None and dim_label is None:
            self.update_category_info_button.setEnabled(False)
            clust = self.common_dict.getItem(cat_label, subcat_label, cluster_label, dim_label)
            self.category_help_form.setHelpContent(clust, False)

        elif dim_label is not None:
            self.update_category_info_button.setEnabled(False)
            dim = self.common_dict.getItem(cat_label, subcat_label, cluster_label, dim_label)
            self.category_help_form.setHelpContent(dim, False)

    def dictChanged(self, val=-1):
        """
        This function is called when the custom dictionary is altered.
        """

        title = self.windowTitle()
        if title.endswith("*") != True:
            self.setWindowTitle("{}*".format(title))

        self.saveAction.setEnabled(True)
        self.exportHelpContentAction.setDisabled(True)
        self.exportHierarchyAction.setDisabled(True)

        self.dict_not_saved = True
        self.dict_changed = True

        self.exportHelpContentAction.setDisabled(True)
        self.exportHierarchyAction.setDisabled(True)

    def dictSaved(self):
        """
        This function is called when the custom dictionary is saved to files.
        """
        title = self.windowTitle()
        if title.endswith("*"):
            self.setWindowTitle(title[:-1])
        self.dict_not_saved = False
        self.dict_changed = False

        self.exportHelpContentAction.setEnabled(True)
        self.exportHierarchyAction.setEnabled(True)
        self.saveAction.setDisabled(True)

    def isDictNotSaved(self):
        """
        this function returns True if the custom dictionary has been changes, yet
        not yet saved.
        """
        if self.dict_not_saved == True:
            return True
        else:   # None or False
            return False

    def isDictChanged(self):
        """
        this function returns True if the custom dictionary has been changes, yet
        not yet saved.
        """
        if self.dict_changed == True:
            return True
        else:   # None or False
            return False

    def getCategoryLabel(self):
        d = self.category_help_form.getHelpContent()
        if d != None:
            return d['label']
        else:
            return None

    def categoryHelpContentChanged(self):
        """
        This function is called when the user selects a category or a subcategory in the tree view.
            update<cat/subcat>HelpContent() checks if any of the help content items have been changed, 
        and returns True if the dictionary is in fact edited.
        """
        h = self.category_help_form.getHelpContent()
        new_label   = h['label']
        new_content = h['help']

        curr_cat, curr_subcat, curr_clust, curr_dim = self.category_tree.getSelectedItemNames()

        if curr_subcat == None: # a category is selected
            if curr_cat != new_label and self.common_dict.existingCategoryLabel(new_label) == True:
                dialogs.WarningDialog("Warning", "{} is already used.".format(new_label))
                return False
        elif curr_cat != None and curr_subcat != None: # a dim is selected
            if curr_subcat != new_label and self.common_dict.existingCategoryLabel(new_label) == True:
                dialogs.WarningDialog("Warning", "{} is already used.".format(new_label))
                return False

        if curr_cat != None and curr_subcat == None:
            edited = self.common_dict.updateCategoryHelpContent(curr_cat, new_label, new_content)
        elif curr_subcat != None and curr_cat != None:
            edited = self.common_dict.updateSubcategoryHelpContent(curr_cat, curr_subcat, new_label, new_content)
        else: 
            edited = False

        if edited == True:
            self.dictChanged()

        # self.common_dict.print()

        return True 

    def setClustersToCategoryTree(self, subcat_item, clusters):
        lst = self.base_tree.disableAndGetClusters(clusters)
        for clust_item in lst:
            self.category_tree.addCustomClusterToSubcategory(subcat_item, clust_item)

        self.base_tree.clearSelection()


##################################################
#
# BaseDictTree
#
##################################################

class BaseDictTree(QTreeWidget):
    def __init__(self, editor_win=None, parent=None):
        super(BaseDictTree, self).__init__(parent)

        self.editor_win = editor_win
        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1

        # Items selected by the user.
        self.selected_items = []
        self.unselect_in_progress = False

        # Behavior
        header= QTreeWidgetItem(["Default"  ])
        self.setHeaderItem(header)  
#        self.clicked.connect(self.itemSelected)
        self.itemSelectionChanged.connect(self.itemSelected)
        self.setSelectionMode(QAbstractItemView.ContiguousSelection)
        self.setFocusPolicy(Qt.NoFocus)

    def resetView(self):

        self.clear()
        self.curr_cluster = None
        self.curr_dimension = None
        self.curr_cluster_index = -1
        self.curr_dimension_index = -1

        self.selected_items = []
        self.unselect_in_progress = False        

    def mousePressEvent(self, event):
        self.editor_win.updateBaseHelpForm(None, None)
        QTreeWidget.mousePressEvent(self, event)

    def itemSelected(self):
        self.selected_items = self.selectedItems()
        cluster_count   = 0
        dimension_count = 0

        if len(self.selected_items) == 1:

            selected_item = self.selected_items[0]
            parent = selected_item.parent()

            if parent == None:  # No parent. 'item' is a cluster
                curr_cluster = selected_item.text(0)
                curr_cluster_index = self.indexOfTopLevelItem(selected_item)
                curr_dimension = None
                curr_dimension_index = -1
            else: # 'item' is a dimension
                curr_cluster   = parent.text(0)
                curr_cluster_index = self.indexOfTopLevelItem(parent)
                curr_dimension = selected_item.text(0)
                curr_dimension_index = self.indexFromItem(selected_item).row()

            # Update the help form on the right side pane.
            self.editor_win.updateBaseHelpForm(curr_cluster, curr_dimension)
 
    # ----------------------------------------
    # Returns a clone of the subset of the tree
    # ----------------------------------------    

    def disableAndGetClusters(self, cluster_names):
        res = list()
        for ci in range(self.topLevelItemCount()):
            clust_item = self.topLevelItem(ci)
            clust_name = clust_item.text(0)
            if clust_name in cluster_names:
                res.append(clust_item.clone())
                clust_item.setDisabled(True)
        return res

    def getCurrentSelection(self):
        res = []

        for item in self.selected_items:

            if item.isDisabled():
                continue

            b = item.foreground(0)
            if b.color() == Qt.gray:
                dialogs.WarningDialog("Warning", "One or more dimensions under this cluster are already in the custom dictionary.")
                return []

            d = dict()
            d['item'] = item.clone()
            if item.parent() == None:
                d['cat_type'] = ds_dict.CLUSTER
            else:
                d['cat_type'] = ds_dict.DIMENSION
            res.append(d)

        return res

    def grayOutParent(self, dimension_name):
        items = self.findItems(dimension_name, Qt.MatchExactly | Qt.MatchRecursive, 0)
        if len(items)==1 and items[0].parent() != None:   # found a single match
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
            b = QBrush(Qt.gray)
            parent.setForeground(0, b)


    def disableCurrentSelection(self):
        for item in self.selected_items:
            item.setDisabled(True)
            # Some of the items don't get grayed out when it is disabled. 
            # So, we are manually setting the foreground color to 'lightGray'.
            b = QBrush(Qt.lightGray)
            item.setForeground(0, b)


    def disableItem(self, cluster, dimension):

        item = None
        # Cluster
        if dimension == None:  
            items = self.findItems(cluster, Qt.MatchExactly, 0)
            if len(items) != 1 or items[0].parent() != None:
                dialogs.WarningDialog("disableItem() Error 1", "{} is not a valid default cluster.".format(cluster))
            elif len(items) == 1:
                item = items[0]
            else:
                dialogs.WarningDialog("disableItem() Error 2", "{} is not a valid default cluster.".format(cluster))

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
                dialogs.WarningDialog("disableItem() Error", "{} is not a valid default dimension.".format(dimension))

            if item != None and parent != None:
                item.setDisabled(True)
                b = QBrush(Qt.gray)
                parent.setForeground(0, b)

    def enableItem(self, clusters):

        item = None
        # Cluster
        for cluster_name in clusters:
            items = self.findItems(cluster_name, Qt.MatchExactly, 0)
            item = items[0]

            if item != None:
                item.setDisabled(False)
                b = QBrush(Qt.black)
                item.setForeground(0, b)

    # ----------------------------------------    
    # Set a new dictionary hierarchy to the tree.
    # The existing hierarchy is cleared.
    # ----------------------------------------    
    def setHierarchy(self, hierarchy, base_dict):  
        list_of_dims = []
        self.clear()
        self.selected_items == []
        for c in hierarchy:   # tones
            citem = QTreeWidgetItem(self, [c['name']])
            citem.setToolTip(0, " {} ".format(c['name']))
            for d in c['dimensions']:
                list_of_dims.append(d['name'])
                ditem = QTreeWidgetItem(citem, [d['name']])
                ditem.setToolTip(0, " {} ".format(d['name']))
                ditem.setDisabled(True)

        other_dims = base_dict.getUnusedDimensions(list_of_dims)
        citem = QTreeWidgetItem(self, ['Other'])
        for d in other_dims:
            ditem = QTreeWidgetItem(citem, [d['name']])
            ditem.setToolTip(0, " {} ".format(d['name']))

        first = self.topLevelItem(0)
        self.scrollToItem(first)


##################################################
#
# CommonDictTree
#
##################################################

class CommonDictTree(QTreeWidget):
    def __init__(self, editor_win = None, parent=None):
        super(CommonDictTree, self).__init__(parent)

        self.editor_win = editor_win

        self.curr_cat = None
        self.curr_subcat = None
        self.curr_cat_index = -1
        self.curr_subcat_index = -1
        self.curr_cluster   = None
        self.curr_cluster_index = -1
        self.curr_dim       = None
        self.curr_dim_index = -1

        self.selected_item = None

        # Style
        self.setStyleSheet("CommonDictTree {background-color: #fff;" + \
                                           "selection-color: #fff;" + \
                                           "selection-background-color: #0080ff;};")

        self.setHeaderHidden(True)

        # Behavior
        self.itemClicked.connect(self.itemSelected)
        self.setFocusPolicy(Qt.NoFocus)

    def resetView(self):
        self.clear()
        self.curr_cat = None
        self.curr_subcat = None
        self.curr_cat_index = -1
        self.curr_subcat_index = -1
        self.curr_cluster   = None
        self.curr_cluster_index = -1
        self.curr_dim       = None
        self.curr_dim_index = -1

        self.selected_item = None
        self.setHeaderHidden(True)

    def addCustomClusterToSubcategory(self, subcat_item, cluster_item):

        b = QBrush(Qt.gray)
        cluster_item.setForeground(0, b)

        for i in range(cluster_item.childCount()):      # gray out the chidren that are moved
            dim_item = cluster_item.child(i)
            dim_item.setForeground(0, b)

        subcat_item.addChild(cluster_item)

        return -1

    def addCustomCluster(self, cluster_item, offset, cat_type=ds_dict.SUBCATEGORY):

        if self.selected_item is None:
            return

        parent = self.selected_item.parent()
        if parent is not None:
            # It is not a top category
            grand_parent = parent.parent()
            if grand_parent is not None:
                # the selected item is NOT a subcat
                great_grand_parent = grand_parent.parent()
                if great_grand_parent is not None:
                    # dimension is selected
                    subcat_item = grand_parent
                else:
                    # cluster is selected
                    subcat_item = parent
            else:
                # selected item is a subcat
                subcat_item = self.selected_item 
        else:
            # the currently selected item is a top level category. do nothing.
            return

        b = QBrush(Qt.gray)
        cluster_item.setForeground(0, b)

        for i in range(cluster_item.childCount()):      # gray out the chidren that are moved
            dim_item = cluster_item.child(i)
            dim_item.setForeground(0, b)

        subcat_item.addChild(cluster_item)
        subcat_item.setExpanded(True)

        return -1

    def scrollToCurrentItem(self):
        if self.selected_item != None:
            self.scrollToItem(self.selected_item)

    def setSelectedItemExpand(self, b):
        if self.selected_item != None:
            self.selected_item.setExpanded(b)

    def getSelectedItemNames(self):
        if self.selected_item != None:
            item = self.selected_item
            parent = item.parent()
            grand_parent = None
            great_grand_parent = None
            if parent is not None:
                grand_parent = parent.parent()
                if grand_parent is not None:
                    great_grand_parent = grand_parent.parent()

            if parent == None:
                cat_name     = item.text(0)
                subcat_name  = None
                cluster_name = None
                dim_name     = None
            elif grand_parent is None:
                cat_name     = parent.text(0)
                subcat_name  = item.text(0)
                cluster_name = None
                dim_name     = None
            elif great_grand_parent is None:
                cat_name     = grand_parent.text(0)
                subcat_name  = parent.text(0)
                cluster_name = item.text(0)
                dim_name     = None
            elif great_grand_parent is not None:
                cat_name     = great_grand_parent.text(0)
                subcat_name  = grand_parent.text(0)
                cluster_name = parent.text(0)
                dim_name     = item.text(0)

            return cat_name, subcat_name, cluster_name, dim_name
        else:
            return None, None, None, None

    def getSelectedCategoryIndex(self):
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


    def isClusterSelected(self):
        """
        Returns True if a cluster item is lower is selected in the tree.
        """
        if self.selected_item is None:
            return False
        else:
            parent = self.selected_item.parent()
            if parent is not None:
                grand_parent = parent.parent()
                if grand_parent is not None:
                    return True
                else:
                    return False
            else:
                return False
                                                               
    def setSelectedItemText(self, label):
        if self.selected_item != None:
            self.selected_item.setText(0, label)

            parent = self.selected_item.parent()
            if parent is not None:
                parent.sortChildren(0, Qt.AscendingOrder)                

    def saveLatestChanges(self):
        if self.selected_item != None:
            if self.isClusterSelected() == False:
               self.editor_win.categoryHelpContentChanged()

    def mousePressEvent(self, event):
        self.saveLatestChanges()
        if self.selected_item != None:
            if self.isClusterSelected() != True:
                cat_name = self.editor_win.getCategoryLabel()  # get a cluster name form the heelp form
                if cat_name != None:
                    # self.selected_item.setText(0, cat_name)
                    self.setSelectedItemText(cat_name)

        # clear selection if the background of the tree view is clicked
        self.clearSelection()

        self.curr_cat = None
        self.curr_subcat = None
        self.curr_cat_index = -1
        self.curr_subcat_index = -1
        self.curr_cluster   = None
        self.curr_cluster_index = -1
        self.selected_item = None
        self.curr_dim       = None
        self.curr_dim_index = -1

        # send the event to its parent
        QTreeWidget.mousePressEvent(self, event)

    def moveSelectedItem(self, direction):
        """
        Move up/dow the currently selected item.
        """

        # There is no top level selection
        if self.curr_cat_index < 0:
            return None

        # A top level category is selected.
        if self.curr_subcat_index < 0 and self.curr_cluster_index < 0:     
            num_cats = self.topLevelItemCount()

            expanded_items = list()

            if self.curr_cat_index == 0 and direction == UP:
                return None
            elif self.curr_cat_index == (num_cats-1) and direction == DOWN:
                return None
            else:
                cat = self.topLevelItem(self.curr_cat_index)
                bExpanded = cat.isExpanded()

                if bExpanded:
                    # record all the expanded items in the hierarchy
                    for i in range(cat.childCount()):
                        subcat = cat.child(i)
                        if subcat.isExpanded():
                            expanded_items.append(subcat)
                            for j in range(subcat.childCount()):
                                cluster = subcat.child(j)
                                if cluster.isExpanded():
                                    expanded_items.append(cluster)

                cat = self.takeTopLevelItem(self.curr_cat_index)
                self.insertTopLevelItem(self.curr_cat_index + direction, cat) # move it up or down   
                self.setCurrentItem(cat)
                cat.setExpanded(bExpanded)
                self.curr_cat_index += direction

                for item in expanded_items:
                    item.setExpanded(True)

            return cat.text(0)
        else:
            dialogs.WarningDialog("You can't move sub categories and clusters", 
                "Subcategories and clusters are ordered alphabetically")

    def setHierarchy(self, hierarchy):
        """
        Set a new dictionary hierarchy. The old/existing
        hierarchy is cleared.
        """

        self.clear()
        self.isTreeInitialized = True

        self.curr_cat = None
        self.curr_subcat = None
        self.curr_cat_index = -1
        self.curr_subcat_index = -1
        self.curr_cluster   = None
        self.curr_cluster_index = -1
        self.selected_item = None
        self.curr_dim       = None
        self.curr_dim_index = -1

        for cat in hierarchy:
            cat_item = QTreeWidgetItem(self, [cat['label']])
            for subcat in cat['subcategories']:
                subcat_item = QTreeWidgetItem(cat_item, [subcat['label']])
                clust_list = [d['name'] for d in subcat['clusters']]
                self.editor_win.setClustersToCategoryTree(subcat_item, clust_list)

        self.selected_item == None
        self.isTreeInitialized = False

        first = self.topLevelItem(0)
        self.scrollToItem(first)

    def resetHierarchy(self, hierarchy, selected_cat, selected_subcat):
        """
        Set a new dictionary hierarchy. The old/existing
        hierarchy is cleared.
        """

        # Let's find all the expanded cats
        expanded_cats = []
        for i in range(self.topLevelItemCount()):
            item = self.topLevelItem(i)
            if item.isExpanded() == True:
                expanded_cats.append(item.text(0))

        self.clear()

        self.isTreeInitialized = True

        self.curr_cat = None
        self.curr_subcat = None
        self.curr_cat_index = -1
        self.curr_subcat_index = -1
        self.curr_cluster   = None
        self.curr_cluster_index = -1
        self.curr_dim       = None
        self.curr_dim_index = -1

        self.selected_item = None

        for c in hierarchy:
            if c['name'] == 'Other':
                continue
            citem = QTreeWidgetItem(self, [c['name']])
            for d in c['subcategoriess']:
                ditem = QTreeWidgetItem(citem, [d['name']])

        self.selected_item == None
        self.isTreeInitialized = False

        for ci in range(self.topLevelItemCount()):
            cat_item = self.topLevelItem(ci)
            cat_name = cat_item.text(0)
            if cat_name in expanded_cats:
                cat_item.setExpanded(True)

            if cat_name == selected_cat:
                if selected_subcat != None:
                    for di in range(cat_item.childCount()):
                        subcat_item = cat_item.child(di)
                        if subcat_item.text(0) == selected_subcat:
                            self.setCurrentItem(subcat_item)
                            break
                else:
                    self.setCurrentItem(item)

        first = self.topLevelItem(0)
        self.scrollToItem(first)

    def categoryLabelChanged(self, new_label):

        # return if nothing is selected now
        if self.curr_cat == None:
            return None, None

        if self.selected_item != None:
            # change the label of the selected item.n
            item = self.selected_item
            item.setText(0, new_label)

            if self.curr_subcat == None:
                # if a cat is currently selected
                old_label = self.curr_cat
                self.curr_cat = new_label
                return old_label, None
            else:
                # if a subcategory is currently selected
                old_label = self.curr_subcat
                self.curr_subcat = new_label
                # parent = item.parent()
                # if parent:
                    # parent.sortChildren(0, Qt.AscendingOrder)
                return self.curr_cat, old_label

        else:
            return None, None

    def selectASubcategory(self, subcat_name):
        items = self.findItems(subcat_name, Qt.MatchFixedString | Qt.MatchRecursive, 0)

        if len(items)>0:
            item = items[0]
            parent = item.parent()
            self.expandItem(parent)
            self.setCurrentItem(item)
            self.itemSelected(item, 0)
            return True
        else:
            return False

    def itemSelected(self, item, column):
        """
        This function is called if an item is clicked.
        """


        self.selected_item = item
        parent = item.parent()
        if parent is not None:
            grand_parent = parent.parent()
            if grand_parent is not None:
                great_grand_parent = grand_parent.parent()
        else:
            grand_parent = None

        if parent is None:  # No parent. 'item' is a cat
            self.curr_cat = item.text(0)
            self.curr_cat_index = self.indexOfTopLevelItem(item)
            self.curr_subcat = None
            self.curr_subcat_index = -1
            self.curr_cluster   = None
            self.curr_cluster_index = -1
            self.curr_dim       = None
            self.curr_dim_index = -1
            self.editor_win.updateCategoryHelpForm(self.curr_cat, None, None, None)

        elif grand_parent is None:
            # 'item' is a subcategory
            self.curr_cat   = parent.text(0)
            self.curr_cat_index = self.indexOfTopLevelItem(parent)
            self.curr_subcat = item.text(0)
            self.curr_subcat_index = self.indexFromItem(item).row()
            self.curr_cluster   = None
            self.curr_cluster_index = -1
            self.curr_dim       = None
            self.curr_dim_index = -1
            self.editor_win.updateCategoryHelpForm(self.curr_cat, self.curr_subcat, None, None)

        elif great_grand_parent is None:
            self.curr_cat       = grand_parent.text(0)
            self.curr_subcat    = parent.text(0)
            self.curr_cat_index = self.indexOfTopLevelItem(grand_parent)
            self.curr_subcat    = parent.text(0)
            self.curr_subcat_index = self.indexFromItem(parent).row()
            self.curr_cluster   = item.text(0)
            self.curr_cluster_index = self.indexFromItem(item).row()
            self.curr_dim       = None
            self.curr_dim_index = -1
            self.editor_win.updateCategoryHelpForm(self.curr_cat, self.curr_subcat, self.curr_cluster, None)
        else:
            self.curr_cat       = great_grand_parent.text(0)
            self.curr_subcat    = grand_parent.text(0)
            self.curr_cat_index = self.indexOfTopLevelItem(grand_parent)
            self.curr_subcat    = grand_parent.text(0)
            self.curr_subcat_index = self.indexFromItem(grand_parent).row()
            self.curr_cluster   = parent.text(0)
            self.curr_cluster_index = self.indexFromItem(parent).row()
            self.curr_dim       = item.text(0)
            self.curr_dim_index = self.indexFromItem(item).row()
            self.editor_win.updateCategoryHelpForm(self.curr_cat, self.curr_subcat, self.curr_cluster, self.curr_dim)

    def deleteSelectedItem(self):
        """
        """
        if self.selected_item != None:

            cat_label        = None
            subcat_label     = None
            removed_clusters = None

            parent = self.selected_item.parent()
            if parent is not None:
                grand_parent = parent.parent()
            else:
                grand_parent = None

            # A categroy is deleted
            if parent == None:  
                level = ds_dict.CATEGORY
                cat_label = self.selected_item.text(0)
                index = self.indexOfTopLevelItem(self.selected_item)
                self.takeTopLevelItem(index) # remove it

                removed_clusters = []
                for i in range(self.selected_item.childCount()):
                    subcat_item = self.selected_item.child(i)
                    for j in range(subcat_item.childCount()):
                        cluster_item = subcat_item.child(j)
                        removed_clusters.append(cluster_item.text(0))

            # A subcategory is deleted
            elif grand_parent == None:
                level = ds_dict.SUBCATEGORY
                subcat_label = self.selected_item.text(0)
                cat_label    = parent.text(0)

                index     = parent.indexOfChild(self.selected_item)
                parent.takeChild(index)
                num_children = parent.childCount()
                cat_label = self.curr_cat

                removed_clusters = []
                for i in range(self.selected_item.childCount()):
                    cluster_item = self.selected_item.child(i)
                    removed_clusters.append(cluster_item.text(0))

            # Cluster is deleted
            else:
                level        = ds_dict.CLUSTER
                cat_label    = grand_parent.text(0)
                subcat_label = parent.text(0)

                index     = parent.indexOfChild(self.selected_item)
                parent.takeChild(index)
                removed_clusters = [self.selected_item.text(0)]

            self.clearSelection()
            self.curr_subcat_index = -1
            self.curr_subcat = None
            self.curr_cat_index = -1
            self.curr_cat = None
            self.curr_cluster   = None
            self.curr_cluster_index = -1
            self.selected_item = None
            self.curr_dim       = None
            self.curr_dim_index = -1

            deleted = dict()
            deleted['cat']      = cat_label
            deleted['subcat']   = subcat_label
            deleted['clusters'] = removed_clusters
            deleted['level']    = level

            return deleted

        else:
            if self.topLevelItemCount() == 0:
                return {'cat': None, 'subcat': None, 'clusters': None, 'level': None}
            else:
                dialogs.WarningDialog("Warning", "Nothing is selected.")
                return {'cat': None, 'subcat': None, 'clusters': None, 'level': None}

    def addNewCategory(self, index, cat_name):
        new_item = QTreeWidgetItem([cat_name])
        if index > 0:
            self.insertTopLevelItem(index, new_item)
        else:
            self.addTopLevelItem(new_item)

        self.setCurrentItem(new_item)
        self.itemSelected(new_item, 0)
        self.scrollToItem(new_item)

    def addNewSubcategory(self, index, subcat_name):
        parent = self.topLevelItem(index)
        new_item = QTreeWidgetItem([subcat_name])
        parent.addChild(new_item)
        parent.setExpanded(True)
        parent.sortChildren(0, Qt.AscendingOrder)

        self.setCurrentItem(new_item)
        self.itemSelected(new_item, 0)
        self.scrollToItem(new_item)

    def sortSubcategories(self):
        for i in range(self.topLevelItemCount()):
            cat = self.topLevelItem(i)
            cat.sortChildren(0, Qt.AscendingOrder)

    def sortClusters(self, subcat_name):
        for i in range(self.topLevelItemCount()):
            cat_item = self.topLevelItem(i)

            for j in range(cat_item.childCount()):
                subcat_item = cat_item.child(j) 
                subcat_item.sortChildren(0, Qt.AscendingOrder)



class HelpForm(QFrame):
    def __init__(self, infobox=False, name=False, read_only=False, editor_win=None, parent=None):
        super(HelpForm, self).__init__(parent)

        self.editor_win = editor_win

        self.default_stats = ""
        self.custom_stats  = ""

        if infobox == False:
            self.setMaximumHeight(240)

        vbox = QVBoxLayout() # main layout
        # self.setStyleSheet("QFrame {background-color: #ff0;}")

        #
        # Header
        #
        # header = QLabel("Help Content")
        # header.setStyleSheet("QLabel {font-weight: bold;}");
        # vbox.addWidget(header)
        # vbox.addSpacing(10)

        # 
        # Help Forma
        #
        fbox = QFormLayout()

        if name:
            # help file (read only)
            self.help_name = QLineEdit()
            self.help_name.setReadOnly(False)
            self.help_name.editingFinished.connect(self.clusterNameChanged)
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

        fbox.addRow(QLabel("Content: "),self.help_content)

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

    def clusterNameChanged(self):
        if self.help_name is not None:
            text = self.help_name.text()
            text = utils.remove_punct_and_space(text)
            self.editor_win.clusterNameChanged(text)

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
        res['help']  = self.help_content.toPlainText()

        if self.help_name is not None:
            self.help_name.setText(name)

        return res

    def clearHelpContent(self):
        if self.help_name is not None:
            self.help_name.setText("")
        self.help_label.setText("")
        self.help_content.setText("")

    def setHelpContent(self, category_d, editable):

        if category_d != None:
            if self.help_name is not None:
                self.help_name.setText(category_d.get('name', "n/a"))
            self.help_label.setText(category_d.get('label', "n/a"))
            self.help_content.setText(category_d.get('help', "n/a"))

            is_default = category_d.get('default', False)   

            self.help_label.clearFocus()

            if editable == False:
                if self.help_name is not None:
                    self.help_name.setReadOnly(True)
                    self.help_name.setStyleSheet("QLineEdit { background-color: #eee;}");
                    self.help_name.setFocusPolicy(Qt.NoFocus)


                self.help_label.setReadOnly(True)
                self.help_label.setStyleSheet("QLineEdit { background-color: #eee;}");
                self.help_label.setFocusPolicy(Qt.NoFocus)

                self.help_content.setReadOnly(True)
                self.help_content.setStyleSheet("QTextEdit { background-color: #eee;}");
                self.help_content.setFocusPolicy(Qt.NoFocus)
            else:
                if self.help_name is not None:
                    if is_default:
                        self.help_name.setReadOnly(True)
                        self.help_name.setStyleSheet("QLineEdit { background-color: #eee}");
                        self.help_name.setFocusPolicy(Qt.NoFocus)
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
        else:
            if self.help_name is not None:
                self.help_name.setText("")
            self.help_label.setText("")
            self.help_content.setText("")

    def setCustomDictPath(self, custom_dict_path):
        self.custom_dict_path = custom_dict_path
        self.custom_dict_name = custom_dict_path[custom_dict_path.rfind("/")+1:]

    def clearAll(self):
        if self.help_name is not None:
            self.help_name.setText("")
        self.help_label.setText("")
        self.help_content.setText("")


