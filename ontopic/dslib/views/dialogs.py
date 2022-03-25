#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
class AboutDialog(QDialog):
class SaveWarningDialog(QMessageBox):
class WarningDialog(QMessageBox):
class ConfirmationDialog(QMessageBox):
class YesNoDialog(QMessageBox):

class OpenOptionsDialog(QDialog):
class CorpusDialog(QDialog):
class DictInfoDialog(QDialog):
class PDFDialog(QDialog):

"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform

import platform

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

import dslib.utils as utils
import dslib.views as views

import dslib.views.autofit_textedit as autofit_textedit

class DSProgressDialog(QProgressDialog):

    def __init__(self, labelText, cancelButtonText, minimum, maximum, parent=None):

        super(DSProgressDialog, self).__init__(labelText, cancelButtonText, minimum, maximum, parent=parent)

        if cancelButtonText == '':
            self.setCancelButton(None)

        if platform.system() != 'Windows':
            self.setWindowFlags(Qt.FramelessWindowHint | Qt.Window)

        self.setStyleSheet("DSProgressDialog {background-color: " + views.default_ui_background_color + ";" +
                                                    "font-size: " + str(views.default_ui_font_size) + "pt;}" +

                                                "QLabel {color: " + views.default_ui_text_color + ";" +
                                                    "font-size: " + str(views.default_ui_font_size) + "pt;}" +

                                          "QProgressBar {font-size: " + str(views.default_ui_font_size) + "pt;}" +

                                    "QPushButton {border-color: #ff0; background-color: " + views.default_ui_button_color + ";" +
                                                        "color: " + views.default_ui_text_color + ";" +
                                                    "font-size: " + str(views.default_ui_font_size) + "pt;}"
                                                )
        self.setWindowTitle("")
        self.setModal(True)
        self.setMinimumWidth(400)
        self.setMaximumWidth(600)
        self.setMinimumDuration(1000)
        self.setAutoClose(True)
        self.show()



class AboutDialog(QDialog):
    """
    This dialog is used to show the information about the application.
    """
    def __init__(self, app_win=None, parent=None):

        super(AboutDialog, self).__init__(parent)

        self.app_win = app_win;
        self.license_info_dialog = None

        self.setModal(True)
        
        self.setGeometry(0,0,480,480)
        self.setStyleSheet("QDialog {background-image: url(\"" + utils.resource_path("data/ds_about.png") + "\");}")
        
        vbox = QVBoxLayout()
        vbox.setContentsMargins(0,0,30,20)
        vbox.setSpacing(0)
        vbox.addStretch()      

        version = QLabel("Version: {}".format(self.app_win.getVersion()))
        version.setStyleSheet("QLabel {color: #fff; font-weight: Normal; text-align: right; " + 
                                  "font-size: " + str(views.default_ui_font_size) + "pt;}")
        version.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
        vbox.addWidget(version)

        vbox.addSpacing(10)


        copyright = QLabel("Copyright: {}".format(self.app_win.getCopyright()))
        copyright.setStyleSheet("QLabel {color: #fff; font-weight: Normal; text-align: right; " +
                                  "font-size: " + str(views.default_ui_font_size) + "pt;}")
        copyright.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
        vbox.addWidget(copyright)

        vbox.addSpacing(10)

        hbox = QHBoxLayout()
        hbox.setContentsMargins(0,0,0,0)
        hbox.addStretch()
        info    = QPushButton("Additional Information")
        # info.setStyleSheet("QPushButton {background-color: #e59554; color: #333; font-weight: Normal; font-size: 11pt;}")
        info.setStyleSheet("QPushButton {background-color: rgba(255,255,255,20); color: #666; font-weight: Normal; " + 
                                  "font-size: " + str(views.default_ui_font_size) + "pt;}")
        info.clicked.connect(self.openLicenseInfo)
        info.setFocusPolicy(Qt.NoFocus)

        hbox.addWidget(info)

        vbox.addLayout(hbox)

        self.setLayout(vbox)

        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
        
        centerPoint = screen_rect.center()   
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft())   

    def openLicenseInfo(self):
        if self.license_info_dialog is None:
            self.license_info_dialog = LicenseInfoDialog(app_win=self.app_win)

        self.license_info_dialog.show()
        self.license_info_dialog.raise_()            

    def mouseReleaseEvent(self, e):
        self.close()
                
    def close(self):
        self.app_win.about.hide()
        

# TODO — find out if we can replace this with WarningDialog.
class SaveWarningDialog(QMessageBox):
    def __init__(self, msg1, msg2):
        super(SaveWarningDialog, self).__init__()

        self.setStyleSheet("SaveWarningDialog {background-color: " + views.default_ui_background_color + ";" +
                                                     "font-size: " + str(views.default_ui_font_size) + "pt;}" +

                                                 "QLabel {color: " + views.default_ui_text_color + ";" +
                                                     "font-size: " + str(views.default_ui_font_size) + "pt;}" +

                                 "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                         "color: " + views.default_ui_text_color + ";" +
                                                     "font-size: " + str(views.default_ui_font_size) + "pt;}")

        pic = QPixmap(utils.resource_path('data/icons/warning_icon.png'))
        self.setIconPixmap(pic.scaled(48, 48, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.setFixedWidth(800)
        self.setText("\n" + msg1)
        self.setInformativeText(msg2)
        self.setWindowTitle("Warning")
        self.setStandardButtons(QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel)
        self.setDefaultButton(QMessageBox.Save)

        buttons = self.buttons()

        for b in buttons:
            if b.text() == 'Save':
                b.setAutoDefault(True)
            else:
                b.setAutoDefault(False)

        horizontalSpacer = QSpacerItem(400, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());
        
        self.retval = self.exec_()
        
class SaveWarningDialog2(QMessageBox):
    def __init__(self, msg1, msg2):
        super(SaveWarningDialog2, self).__init__()

        self.setStyleSheet("SaveWarningDialog2 {background-color: " + views.default_ui_background_color + ";" +
                                                      "font-size: " + str(views.default_ui_font_size) + "pt;}" +

                                                  "QLabel {color: " + views.default_ui_text_color + ";" +
                                                      "font-size: " + str(views.default_ui_font_size) + "pt;}" +                                             
                                  "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                          "color: " + views.default_ui_text_color + ";" +
                                                      "font-size: " + str(views.default_ui_font_size) + "pt;}")

        pic = QPixmap(utils.resource_path('data/icons/warning_icon.png'))
        self.setIconPixmap(pic.scaled(48, 48, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.setFixedWidth(800)
        self.setText("\n" + msg1)
        self.setInformativeText(msg2)
        self.setWindowTitle("Warning")
        self.setStandardButtons(QMessageBox.Save | QMessageBox.Discard)
        self.setDefaultButton(QMessageBox.Save)

        buttons = self.buttons()

        for b in buttons:
            if b.text() == 'Save':
                b.setAutoDefault(True)
            else:
                b.setAutoDefault(False)

        horizontalSpacer = QSpacerItem(400, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());
        
        self.retval = self.exec_()

class WarningDialog(QMessageBox):
    
    def __init__(self, msg1, msg2):
        super(WarningDialog, self).__init__()

        self.setStyleSheet("WarningDialog {background-color: " + views.default_ui_background_color + ";" +
                                                 "font-size: " + str(views.default_ui_font_size) + "pt;}" +
                                             "QLabel {color: " + views.default_ui_text_color + ";" +
                                                 "font-size: " + str(views.default_ui_font_size) + "pt;}" +                                             
                             "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                     "color: " + views.default_ui_text_color + ";" +
                                                 "font-size: " + str(views.default_ui_font_size) + "pt;}")

        pic = QPixmap(utils.resource_path('data/icons/warning_icon.png'))
        self.setIconPixmap(pic.scaled(48, 48, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.setFixedWidth(800)
        self.setText("\n" + msg1)
        self.setInformativeText(msg2)
        self.setWindowTitle("Warning")
        self.setStandardButtons(QMessageBox.Ok)
        
        horizontalSpacer = QSpacerItem(400, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());
        
        retval = self.exec_()  

class ConfirmationDialog(QMessageBox):
    def __init__(self, msg1, msg2, width=None):
        super(ConfirmationDialog, self).__init__()

        self.setStyleSheet("ConfirmationDialog {background-color: " + views.default_ui_background_color + ";" +
                                                      "font-size: " + str(views.default_ui_font_size) + "pt;}" +
                                                  "QLabel {color: " + views.default_ui_text_color + ";" +
                                                      "font-size: " + str(views.default_ui_font_size) + "pt;}" +                                             
                                  "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                          "color: " + views.default_ui_text_color + ";" +
                                                      "font-size: " + str(views.default_ui_font_size) + "pt;}")

        self.setIcon(QMessageBox.Information)
        self.setText("\n" + msg1)
        self.setInformativeText(msg2)
        self.setStandardButtons(QMessageBox.Ok)

        horizontalSpacer = QSpacerItem(400, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());

        retval = self.exec_()   

class YesNoDialog(QMessageBox):
    def __init__(self, msg1, msg2):
        super(YesNoDialog, self).__init__()

        self.setStyleSheet("YesNoDialog {background-color: " + views.default_ui_background_color + ";" +
                                               "font-size: " + str(views.default_ui_font_size) + "pt;}" +
                                           "QLabel {color: " + views.default_ui_text_color + ";" +
                                               "font-size: " + str(views.default_ui_font_size) + "pt;}" +                                             
                           "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                   "color: " + views.default_ui_text_color + ";" +
                                               "font-size: " + str(views.default_ui_font_size) + "pt;}")


        pic = QPixmap(utils.resource_path('data/icons/warning_icon.png'))
        self.setIconPixmap(pic.scaled(48, 48, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.setFixedWidth(800)
        self.setText("\n" + msg1)
        self.setInformativeText(msg2)
        self.setStandardButtons(QMessageBox.Ok | QMessageBox.Cancel)
        self.setDefaultButton(QMessageBox.Ok)
        self.retval = None

        horizontalSpacer = QSpacerItem(400, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());

        self.retval = self.exec_()   

class BigWarningDialog(QMessageBox):
    def __init__(self, msg1, msg2, msg3):
        super(BigWarningDialog, self).__init__()

        self.setStyleSheet("BigWarningDialog {font: " + views.default_font + ";" +
                                        "font-size: " + str(views.default_ui_font_size) + "pt;" + 
                    "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                            "color: " + views.default_ui_text_color + ";" +
                                        "font-size: " + str(views.default_ui_font_size) + "pt;}"
                                           )


        pic = QPixmap(utils.resource_path('data/icons/warning_icon.png'))
        self.setIconPixmap(pic.scaled(48, 48, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.setText("\n" + msg1)
        self.setInformativeText(msg2)
        self.setStandardButtons(QMessageBox.Ok)

        horizontalSpacer = QSpacerItem(600, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());

        ok_item = layout.itemAtPosition(2,2);

        text_field = QPlainTextEdit()
        text_field.setReadOnly(True)
        text_field.setFocusPolicy(Qt.NoFocus)
        text_field.setPlainText(msg3)
        text_field.setStyleSheet("QPlainTextEdit {background-color: " + views.default_ui_input_background_color + ";" + \
                                                            "color: " + views.default_ui_text_color + ";}")
        layout.addWidget(text_field, 2, 2)
        layout.addWidget(ok_item.widget(), 3, 2)

        retval = self.exec_()   

class LoadResourcesDialog(QDialog):
    """
    This dialog box is used to start a corpus analysis.
    """
    def __init__(self, app_win, is_dict=False, parent=None):

        super(LoadResourcesDialog, self).__init__(parent)

        self.app_win = app_win
        self.controller = None
        self.reset_prefs = False

        self.setModal(True)

        if platform.system() != 'Windows':
            self.setWindowFlags(Qt.FramelessWindowHint | Qt.Window)

        self.setMinimumWidth(520)
        self.setMaximumWidth(1000)
        self.setMinimumHeight(120)
        self.setMaximumHeight(200)
        self.setWindowTitle("Load Language Resources")

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            check_icon_path = "data/icons/check_icon.png"
        else:
            check_icon_path = "data/icons/check_dark_icon.png"

        self.setStyleSheet("LoadResourcesDialog {background-color: " + views.default_ui_background_color + ";}" + \
                                                   "QLabel {color: " + views.default_ui_text_color + ";}" + \

                                   "QPushButton {background-color: " + views.default_ui_button_color + ";" + \
                                                           "color: " + views.default_ui_text_color   + ";" + \
                                                       "font-size: " + str(views.default_ui_font_size) + "pt;}" + \
                             "QPushButton::menu-indicator {image: none;}" + \
                                                "QCheckBox {color: " + views.default_ui_text_color + ";}" + \
                                    "QCheckBox::indicator {border: 1px solid " + views.default_ui_border_color + ";" + \
                                             "width: 12px; height: 12px;" + \
                                                "background-color: " + views.default_ui_input_background_color + ";}" + \
                            "QCheckBox::indicator:checked {border: 1px solid " + views.default_ui_border_color + ";" + \
                                                           "image: url(" + utils.resource_path(check_icon_path) + ");}" + \

                                         "QMenu {background-color:" + views.default_ui_button_color + ";}" + \
                                          "QMenu::item {font-size: " + str(views.default_ui_font_size) + "pt; padding: 6px;}"                                         
                        "QMenu::item:!disabled  {background-color:" + views.default_ui_button_color + ";" + \
                                                           "color:" + views.default_ui_text_color + ";}" + \
                         "QMenu::item:disabled  {background-color:" + views.default_ui_button_color + ";" + \
                                                           "color:" + views.default_ui_text_inactive_color + ";}" + \
                         "QMenu::item:selected  {background-color:" + views.menu_selected_color + ";" + \
                                                           "color:" + views.menu_selected_text_color + ";}" + \
                         "QMenu::item:!selected {background-color:" + views.default_ui_button_color + ";}"
                                                )

        vbox = QVBoxLayout()

        self.message = QTextEdit()
        self.message = autofit_textedit.AutoFitTextEdit()
        self.message.setStyleSheet("background-color: transparent; color: " + views.default_ui_text_color + "; border: 0;")
        self.message.setReadOnly(True)

        doc = self.message.document()
        doc.setDefaultStyleSheet("p {font-size: " + str(views.default_ui_font_size) + "pt;}")        

        vbox.addWidget(self.message)
        vbox.addSpacing(10)

        vbox.addSpacing(10)

        hbox = QHBoxLayout()

        self.text_type_button = QPushButton("Select a Text Type")
        self.text_type_button.clicked.connect(self.openTextType)
        hbox.addWidget(self.text_type_button)

        self.default_button = QPushButton("Built-in Dictionary")
        self.default_button.clicked.connect(self.openFile)
        hbox.addWidget(self.default_button)

        self.prefs_button = QPushButton()
        self.prefs_button.setFlat(True)
        self.prefs_button.setIconSize(QSize(18, 18))
        self.prefs_button.setStyleSheet("border: 0; padding: 0;")
        self.prefs_button.setStyleSheet("border: 0;")
        self.prefs_button.setFixedSize(18, 18)

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:
            preferences_icon_path = 'data/icons/preferences_icon.png'
        else:
            preferences_icon_path = 'data/icons/preferences_dark_icon.png'

        pic = QPixmap(utils.resource_path('data/icons/preferences_icon.png'))
        self.prefs_button.setIcon(QIcon(pic.scaled(views.VALUES_ICON_SIZE, views.VALUES_ICON_SIZE, Qt.KeepAspectRatio, Qt.SmoothTransformation)))     

        tools_menu = QMenu(parent=self)

        self.reset_action = QAction('Reset Text Type Setting', self) 
        self.reset_action.triggered.connect(self.resetTextTypeSetting)

        self.quit_action = QAction('Quit', self) 
        self.quit_action.triggered.connect(self.quitApp)

        tools_menu.addAction(self.reset_action)
        tools_menu.addAction(self.quit_action)

        self.prefs_button.setMenu(tools_menu)

        hbox.addWidget(self.prefs_button)        

        vbox.addLayout(hbox)

        self.setLayout(vbox)      

    def quitApp(self):
        self.app_win.quitApp()

    def updateUI(self, content_info, reset_prefs=False):
            
        self.reset_prefs = reset_prefs

        if content_info is not None:

            self.content_path = content_info['path']            

            html_str = "<p>Click <b>Load \u201C{}\u201D</b> to launch DocuScope Write & Audit with the reader expectations for {}.</p>".format(content_info['name'], content_info['name']) + \
                       "<p>Click <b>Select a Different Text Type</b> to change the text type, or reset the text type by clicking the gear icon.</p><p>&nbsp;</p>"
            self.message.setHtml(html_str)

            self.text_type_button.setText("Select a Different Text Type")
            self.text_type_button.show()
            self.text_type_button.setAutoDefault(False)

            self.default_button.show()
            self.default_button.setText("Load \u201C{}\u201D".format(content_info['name']))
            self.default_button.setAutoDefault(True)

            self.prefs_button.setAutoDefault(False)
            self.reset_action.setEnabled(True)

        else:

            self.content_path = ''

            html_str = "<p>To launch DocuScope Write & Audit for a specific text type, click <b>Select a Text Type</b>, and select a text type folder.</p>" + \
                       "<p>Or, click <b>Launch with no Text Type</b> to launch DocuScope Write & Audit with no Text Type.</p><p>&nbsp;</p>"

            self.message.setHtml(html_str)

            self.text_type_button.setText("Select a Text Type")
            self.text_type_button.show()
            self.text_type_button.setAutoDefault(False)

            self.default_button.show()
            self.default_button.setText("Launch with no Text Type")
            self.default_button.setAutoDefault(True)
            
            self.prefs_button.setAutoDefault(False)
            self.reset_action.setDisabled(True)

    def resetTextTypeSetting(self):
        self.updateUI(None, reset_prefs=self.reset_prefs)

    def setController(self, c):
        self.controller = c

    def openPreferences(self):
        self.app_win.openPreferences()

    def openTextType(self):
        folder = QFileDialog.getExistingDirectory(self.app_win, 'Select a text type folder:', '', QFileDialog.ShowDirsOnly)
        if folder == '':
            return
        else:
            self.hide()
            self.controller.loadResources(content_path=folder)
                        
    def openFile(self):
        self.hide()

        expectations_panel = True
        if self.default_button.text() == "Launch with no Text Type":
            expectations_panel = False

        self.controller.loadResources(content_path=self.content_path, expectations_panel=expectations_panel, reset_prefs=self.reset_prefs)


class CorpusDialog(QDialog):
    """
    This dialog box is used to start a corpus analysis.
    """
    def __init__(self, app_win=None, parent=None):

        super(CorpusDialog, self).__init__(parent)

        self.app_win = app_win;
        self.controller = None

        #self.setGeometry(60,80,500,100)
        self.setFixedWidth(600)
        self.setFixedHeight(140)
        # self.setStyleSheet("background-color: #efefef;")

        fbox = QFormLayout()
        fbox.setVerticalSpacing(6)

        hbox = QHBoxLayout()
        self.corpus_folder_field = QLineEdit()
        self.corpus_folder_field.setStyleSheet("background-color: " + views.default_ui_background_color + ";")
        self.corpus_folder_button = QPushButton("Select")
        self.corpus_folder_button.setFixedWidth(60)
        self.corpus_folder_button.setFixedHeight(26)
        self.corpus_folder_button.clicked.connect(self.selectCorpusFolder)

        hbox.addWidget(self.corpus_folder_field)
        hbox.addWidget(self.corpus_folder_button)
        fbox.addRow(QLabel("Corpus Folder"), hbox)      

        hbox = QHBoxLayout()
        self.out_folder_field = QLineEdit()
        self.out_folder_field.setStyleSheet("background-color: " + views.default_ui_background_color + ";")
        self.out_folder_button = QPushButton("Select")
        self.out_folder_button.setFixedWidth(60)
        self.out_folder_button.setFixedHeight(26)
        self.out_folder_button.clicked.connect(self.selectOutFolder)

        hbox.addWidget(self.out_folder_field)
        hbox.addWidget(self.out_folder_button)
        fbox.addRow(QLabel("Output Folder"), hbox)

        fbox.addRow(QLabel(""))

        hbox = QHBoxLayout()
        self.analyze_button = QPushButton("Analyze")
        self.analyze_button.setFixedWidth(60)
        self.analyze_button.setFixedHeight(26)
        self.analyze_button.clicked.connect(self.analyze)
        hbox.addStretch()
        hbox.addWidget(self.analyze_button)
        fbox.addRow(QLabel(""), hbox)

        self.setLayout(fbox)      

    def setController(self, c):
        self.controller = c
        
    ##
    # TODO: move the guts of the analysis code to the Controller
    ##
    def analyze(self):

        def rankTopics(lst):
            d = dict()
            for t in lst:
                if d.get(t, None):
                    d[t] += 1
                else:
                    d[t] = 1

            res = list()
            for key,val in d.items():
                res.append( (val, key) )

            res.sort(reverse=True)
            return res      

        src_dir = self.corpus_folder_field.text()
        out_dir = self.out_folder_field.text()

        if os.path.exists(src_dir) != True and os.path.exists(out_dir) != True:
            WarningDialog("Warning", "Select a source folder and an output folder.")
            return
        elif os.path.exists(src_dir) != True:
            WarningDialog("Warning", "Select a corpus folder.")
            return
        elif os.path.exists(out_dir) != True:
            WarningDialog("Warning", "Select an output folder.")
            return

        self.hide()

        # lets find out if there are multiple folders or not.
        dirs  = list()
        files = list()
        for item in os.listdir(src_dir):
            if os.path.isdir(os.path.join(src_dir, item)):
                dirs.append(item)
            elif os.path.isfile(os.path.join(src_dir, item)):
                files.append(item)

        header_str =  "folder, file,"
        header_str += "l_NP (min), l_NP (max), l_NP (mean), l_NP (median),"
        header_str += "r_NP (min), r_NP (max), r_NP (mean), r_NP (median),"
        header_str += "Quotes, Total Words, % Quote"
        header_str += "\n"

        fout_stats = None
        fout_topics = None

        if len(dirs) > 0:      # There is at least one folder. We'll ignore files in the root folder.
            for d in dirs:

                if self.app_win.isOpenCancelled:
                    break

                fout_stats  = open(os.path.join(out_dir, "{}_stats.csv".format(d)),  "w")
                fout_topics = open(os.path.join(out_dir, "{}_topics.csv".format(d)), "w")
                kt_list  = list()
                ktp_list = list()
                kts_list = list()
                fout_stats.write(header_str)

                flist = os.listdir(os.path.join(src_dir, d))
                fcount = 1
                ftotal = len(flist)
                for f in flist:

                    if self.app_win.isOpenCancelled:
                        break

                    if f.startswith("."):
                        continue

                    #print("----------------------------------")
                    #print("Analyzing {} in {} - ({}/{})".format(f, d, fcount, ftotal))
                    self.app_win.updateStatus("Analyzing {} in {}... ({}/{}) ".format(f, d, fcount, ftotal))
                    self.app_win.openFile(False, isUI=False, filepath=os.path.join(src_dir, d, f))
                    #print("----------------------------------")
                    fcount +=1 

                    res = self.app_win.getDocData()

                    sres = res['sent_data']
                    tres = res['text_data']
                    fout_stats.write("{},{},{},{},{},{},{},{},{},{},{},{},{}\n".format(d, f, 
                                    sres['l_min'], sres['l_max'], sres['l_mean'], sres['l_median'],
                                    sres['r_min'], sres['r_max'], sres['r_mean'], sres['r_median'],
                                    tres['quoted_words'], tres['total_words'], tres['ratio']))

                    kt_list  += res['key_topics']
                    ktp_list += res['key_para_topics']
                    kts_list += res['key_topics_first_sent']

                kt_t_list = rankTopics(kt_list)
                fout_topics.write("count, topic (expanded)\n")
                for item in kt_t_list:
                    fout_topics.write("{},{}\n".format(item[0], item[1]))
                fout_topics.write("\n")

                ktp_t_list = rankTopics(ktp_list)
                fout_topics.write("count, topic (collapsed)\n")
                for item in ktp_t_list:
                    fout_topics.write("{},{}\n".format(item[0], item[1]))
                fout_topics.write("\n")

                kts_t_list = rankTopics(kts_list)
                fout_topics.write("count, topic (topic sent)\n")
                for item in kts_t_list:
                    fout_topics.write("{},{}\n".format(item[0], item[1]))

                fout_topics.close()
                fout_stats.close()

        elif len(files) > 0:   # There are no folders, and there are files.
            fout_stats  = open(os.path.join(out_dir, "{}_stats.csv".format(ntpath.basename(src_dir))),  "w")
            fout_topics = open(os.path.join(out_dir, "{}_topics.csv".format(ntpath.basename(src_dir))), "w")
            kt_list = list()
            ktp_list = list()
            kts_list = list()
            fout_stats.write(header_str)

            fcount = 1
            ftotal = len(files)
            for f in files:

                if self.app_win.isOpenCancelled:
                    break

                if f.startswith("."):
                  continue

                d = os.path.basename(src_dir)
                self.app_win.updateStatus("Analyzing {} in {}... ({}/{}) ".format(f, d, fcount, ftotal))
                self.app_win.openFile(False, isUI=False, filepath=os.path.join(src_dir, f))

                fcount += 1

                res = self.app_win.getDocData()
                sres = res['sent_data']
                fout_stats.write("{},{},{},{},{},{},{},{},{},{}\n".format(ntpath.basename(src_dir), f, 
                                    sres['l_min'], sres['l_max'], sres['l_mean'], sres['l_median'],
                                    sres['r_min'], sres['r_max'], sres['r_mean'], sres['r_median']))

                kt_list += res['key_topics']
                ktp_list += res['key_para_topics']
                kts_list += res['key_topics_first_sent']

            if self.app_win.isOpenCancelled:
                self.app_win.isOpenCancelled = False
                return
            else:
                kt_t_list = rankTopics(kt_list)
                fout_topics.write("count, topic (expanded)\n")
                for item in kt_t_list:
                    fout_topics.write("{},{}\n".format(item[0], item[1]))

                fout_topics.write("\n")

                ktp_t_list = rankTopics(ktp_list)
                fout_topics.write("count, topic (collapsed)\n")
                for item in ktp_t_list:
                    fout_topics.write("{},{}\n".format(item[0], item[1]))
                fout_topics.write("\n")

                kts_t_list = rankTopics(kts_list)
                fout_topics.write("count, topic (topic sent)\n")
                for item in kts_t_list:
                    fout_topics.write("{},{}\n".format(item[0], item[1]))
    
            if fout_stats is not None:
                fout_stats.close()

            if fout_topics is not None:
                fout_topics.close()

        self.app_win.updateStatus("Corpus Analysis Completed.")

    def selectCorpusFolder(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a folder:', '', QFileDialog.ShowDirsOnly)        
        self.corpus_folder_field.setText(folder)

    def selectOutFolder(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a folder:', '', QFileDialog.ShowDirsOnly)        
        self.out_folder_field.setText(folder)


class DictInfoDialog(QDialog):
    def __init__(self, dict_info, app_win=None, parent=None):

        super(DictInfoDialog, self).__init__(parent)

        self.app_win = app_win;

        width  = 500
        height = 50
        self.setMinimumWidth(width)
        self.setMinimumHeight(height)

        self.setStyleSheet("DictInfoDialog {background-color: " + views.default_ui_background_color + ";}" +
                                              "QLabel {color: " + views.default_ui_text_color + ";}" +
                              "QPushButton {background-color: " + views.default_ui_button_color + ";" + 
                                                      "color: " + views.default_ui_text_color + ";" + 
                                                  "font-size: " + str(views.default_ui_font_size) + "pt;}" +
                                          "QLabel {font-size: " + str(views.default_ui_font_size) + "pt;}"
                                              )

        fbox = QFormLayout()

        if dict_info.get('customized', False) == True:
            # Custom Dictionary
            fbox.addRow(QLabel("Name:        "), QLabel(dict_info['name']))
            fbox.addRow(QLabel("Version:     "), QLabel(dict_info['version']))
            fbox.addRow(QLabel("Author(s):   "), QLabel(dict_info['author']))
            fbox.addRow(QLabel("Copyright:   "), QLabel(dict_info['copyright']))
            base_dict_name = os.path.basename(dict_info['base_dict'])
            fbox.addRow(QLabel("Base Dictionary:   "), QLabel(base_dict_name))
        else:
            # Normal/Default Dictionary
            fbox.addRow(QLabel("Name:        "), QLabel(dict_info['name']))
            fbox.addRow(QLabel("Version:     "), QLabel(dict_info['version']))
            fbox.addRow(QLabel("Author(s):   "), QLabel(dict_info['author']))
            fbox.addRow(QLabel("Copyright:   "), QLabel(dict_info['copyright']))

        fbox.addRow(QLabel(""), QLabel(""))

        hbox = QHBoxLayout()
        self.close_button = QPushButton("Close")
        self.close_button.clicked.connect(self.close)
        self.close_button.setDefault(True)
        hbox.addStretch()      
        hbox.addWidget(self.close_button)

        fbox.addRow(QLabel(""), hbox)

        self.setLayout(fbox)
        self.show()
        
        frameGm = self.frameGeometry()
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screen_rect = QApplication.desktop().screenGeometry(screen)
      
        centerPoint = screen_rect.center()   
        frameGm.moveCenter(centerPoint)
        self.move(frameGm.topLeft())   

        retval = self.exec_()   

    def cancel(self):
        self.hide()

    def selectDefaultDictDir(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a parent folder:', '', QFileDialog.ShowDirsOnly)
        if folder == "":
            return
        else:
            self.default_dict_dir_field.setText(folder)
            self.create_button.setDefault(True)

    def create(self):
        folder    = self.default_dict_dir_field.text()
        dict_name = self.dict_name_field.text()

        if folder == "" or dict_name == "":
            WarningDialog("Warning", "The dictionary name or the default dictionar folder is missing.")
        else:
            self.controller.createDictionary(os.path.join(folder, dict_name))
            self.close()


class PDFDialog(QDialog):
    def __init__(self, app_win=None, parent=None):

        super(PDFDialog, self).__init__(parent)

        self.app_win = app_win
        self.controller = None

        self.setFixedWidth(600)
        self.setFixedHeight(140)

        fbox = QFormLayout()
        fbox.setVerticalSpacing(6)

        hbox = QHBoxLayout()
        self.corpus_folder_field = QLineEdit()
        self.corpus_folder_button = QPushButton("Select")
        self.corpus_folder_button.setFixedWidth(60)
        self.corpus_folder_button.setFixedHeight(26)
        self.corpus_folder_button.clicked.connect(self.selectCorpusFolder)

        hbox.addWidget(self.corpus_folder_field)
        hbox.addWidget(self.corpus_folder_button)
        fbox.addRow(QLabel("Corpus Folder"), hbox)      

        hbox = QHBoxLayout()
        self.out_folder_field = QLineEdit()
        self.out_folder_button = QPushButton("Select")
        self.out_folder_button.setFixedWidth(60)
        self.out_folder_button.setFixedHeight(26)
        self.out_folder_button.clicked.connect(self.selectOutFolder)

        hbox.addWidget(self.out_folder_field)
        hbox.addWidget(self.out_folder_button)
        fbox.addRow(QLabel("Output Folder"), hbox)

        fbox.addRow(QLabel(""))

        hbox = QHBoxLayout()
        self.analyze_button = QPushButton("Generate PDFs")
        self.analyze_button.clicked.connect(self.makePDFs)
        hbox.addStretch()
        hbox.addWidget(self.analyze_button)
        fbox.addRow(QLabel(""), hbox)

        self.setLayout(fbox)      

    def setController(self, c):
        self.controller = c

    ##
    # TODO: Move this to the controller!!
    ##

    def makePDFs(self):

        self.app_win.setExporting(True)

        srcdir = self.corpus_folder_field.text()
        outdir = self.out_folder_field.text()

        if os.path.exists(srcdir) != True and os.path.exists(outdir) != True:
            WarningDialog("Warning", "Select a source folder and an output folder.")
            return
        elif os.path.exists(srcdir) != True:
            WarningDialog("Warning", "Select a corpus folder.")
            return
        elif os.path.exists(outdir) != True:
            WarningDialog("Warning", "Select an output folder.")
            return

        self.hide()

        # lets find out if there are multiple folders or not.
        dirs  = list()
        files = list()
        for item in os.listdir(srcdir):
            if os.path.isdir(os.path.join(srcdir, item)):
                dirs.append(item)
            elif os.path.isfile(os.path.join(srcdir, item)):
                files.append(item)

        if len(dirs) > 0:      # There is at least one folder. We'll ignore files in the root folder.
            for d in dirs:
                if self.app_win.isOpenCancelled:
                    break

                sub_srcdir = os.path.join(srcdir, d)
                sub_outdir = os.path.join(outdir, d)

                if os.path.exists(sub_outdir):
                    shutil.rmtree(sub_outdir)

                if os.path.exists(sub_outdir) != True:
                    os.makedirs(sub_outdir)

                flist = os.listdir(sub_srcdir)
                for f in flist:
                    if f.startswith("."):
                        continue

                    file_path = os.path.join(sub_srcdir, f)
                    if f.startswith("~") or f.startswith("."):
                        continue
                    elif f.endswith(".docx"):
                        pdf_path  = os.path.join(sub_outdir, f.replace(".docx", ".pdf"))
                    elif f.endswith(".txt"):
                        pdf_path  = os.path.join(sub_outdir, f.replace(".txt", ".pdf"))
                    else:
                        continue

                    self.app_win.openFile(False, isUI=True, filepath=file_path)
                    self.app_win.generatePDF(f, pdf_path)

        elif len(files) > 0:   # There are no folders, and there are files.
            for f in files:

                if f.startswith("."):
                    continue

                file_path = os.path.join(srcdir, f)
                if f.startswith("~") or f.startswith("."):
                    continue
                elif f.endswith(".docx"):
                    pdf_path  = os.path.join(outdir, f.replace(".docx", ".pdf"))
                elif f.endswith(".txt"):
                    pdf_path  = os.path.join(outdir, f.replace(".txt", ".pdf"))
                else:
                    continue

                self.app_win.openFile(False, isUI=True, filepath=file_path)
                self.app_win.generatePDF(f, pdf_path)

        self.app_win.setExporting(False)
        self.app_win.updateStatus("Generate PDFs - Completed.")

    def selectCorpusFolder(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a folder:', '', QFileDialog.ShowDirsOnly)        
        self.corpus_folder_field.setText(folder)

    def selectOutFolder(self):
        folder = QFileDialog.getExistingDirectory(None, 'Select a folder:', '', QFileDialog.ShowDirsOnly)        
        self.out_folder_field.setText(folder)  


class parsingErrorDialog(QDialog):
    def __init__(self, app_win=None, parent=None):    
        super(parsingErrorDialog, self).__init__(parent)

        self.app_win = app_win
        self.controller = None
        self.csv = ""

        self.setStyleSheet("DictInfoDialog {background-color: " + views.default_ui_background_color + ";" + 
                                                      "color: " + views.default_ui_text_color + ";}" +
                                          "QLabel {font-size: " + str(views.default_ui_font_size) + "pt;}" +
                                     "QPushButton {font-size: " + str(views.default_ui_font_size) + "pt;}")

        self.setFixedWidth(800)
        self.setFixedHeight(400)
        self.setModal(True)

        vbox = QVBoxLayout()

        # Title
        hbox = QHBoxLayout()

        icon = QPushButton()
        icon.setFlat(True)
        icon.setIcon(QIcon(QPixmap(utils.resource_path('data/icons/warning_icon.png'))))        

        hbox.addWidget(icon)

        title = QLabel("Parsing Eerrors")
        title.setStyleSheet("font-weight: bold; font-size: " + str(views.default_ui_heading_font_size) + ";")

        ht = 36
        icon.setIconSize(QSize(ht,ht))

        hbox.addWidget(title)
        hbox.addStretch()

        vbox.addLayout(hbox)
        vbox.addSpacing(10)

        # Editor
        self.editor = QTextEdit()
        self.editor.setReadOnly(True)
        doc = self.editor.document()
        doc.setDefaultStyleSheet(views.instructions_style)

        vbox.addWidget(self.editor)

        # Close Button
        hbox = QHBoxLayout()
        hbox.addStretch()

        self.save_button = QPushButton("Save")
        self.save_button.clicked.connect(self.saveText)
        self.save_button.setDefault(False)
        hbox.addWidget(self.save_button)

        self.close_button = QPushButton("Close")
        self.close_button.clicked.connect(self.close)
        self.close_button.setDefault(True)
        hbox.addWidget(self.close_button)

        vbox.addLayout(hbox)

        self.setLayout(vbox)      

    def setText(self, html_str, csv):
        self.editor.setHtml(html_str)
        self.csv = csv

    def saveText(self):
        html_str = self.editor.toHtml()

        csv_fpath, _ = QFileDialog.getSaveFileName(None, 'Enter File Name', '/errors.csv', "CSV File (*.csv)")
        if csv_fpath != "":

            html_fpath = csv_fpath.replace(".csv", ".html")

            os       = platform.system()
            version  = self.app_win.getVersion()

            with open(html_fpath, 'w') as fout:
                fout.write("Parsing Errors\n")
                fout.write("")
                fout.write("Software Version: {}\n".format(version))
                fout.write("Operating System: {}\n".format(os))
                fout.write("\n\n")
                fout.write(html_str)
                fout.write("\n")

            with open(csv_fpath, 'w') as fout:
                fout.write(self.csv)
                fout.write("\n\n")

        self.close()        

class ForceQuitDialog(QMessageBox):
    def __init__(self, msg1, msg2):
        super(ForceQuitDialog, self).__init__()


        self.setStyleSheet("ForceQuitDialog {background-color: " + views.default_ui_background_color + ";" +
                                                 "font-size: " + str(views.default_ui_font_size) + "pt;}" +
                                             "QLabel {color: " + views.default_ui_text_color + ";}" +

                             "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                     "color: " + views.default_ui_text_color + ";" +
                                                 "font-size: " + str(views.default_ui_font_size) + "pt;}")

        pic = QPixmap(utils.resource_path('data/icons/warning_icon.png'))
        self.setIconPixmap(pic.scaled(48, 48, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.setFixedWidth(600)
        self.setText(msg1)
        self.setInformativeText(msg2)
        self.setWindowTitle("")
        self.setStandardButtons(QMessageBox.Ok | QMessageBox.Cancel)
        self.setDefaultButton(QMessageBox.Ok)
        self.retval = None
        
        horizontalSpacer = QSpacerItem(400, 0, QSizePolicy.Minimum, QSizePolicy.Expanding);
        layout = self.layout();
        layout.addItem(horizontalSpacer, layout.rowCount(), 0, 1, layout.columnCount());
        
        self.retval = self.exec_()  


class LicenseInfoDialog(QDialog):
    def __init__(self, app_win=None, parent=None):    
        super(LicenseInfoDialog, self).__init__(parent)

        # self.setStyleSheet("LicenseInfoDialog {background-color: " + "#fff" + ";}")

        self.app_win = app_win
        self.controller = None
        self.setModal(True)

        self.setFixedSize(800,800)
        self.setMinimumWidth(600)
        self.setMinimumHeight(600)

        vbox = QVBoxLayout()

        # Editor
        self.editor = QTextBrowser()
        self.editor.setStyleSheet("QTextBrowser { background-color: #fff;" +
                                                 "padding-left:   18px;" + 
                                                 "padding-right:  0px;}")
        self.editor.setReadOnly(True)
        self.editor.setOpenExternalLinks(True)

                                  
        style = "p {font-size: " + str(views.default_ui_font_size) + "pt;"
        style += "li {padding-bottom: 6pt; font-size:" + str(views.default_ui_font_size) + "pt;}\n"

        doc = self.editor.document()     # QDocument
        doc.setDefaultStyleSheet(style)

        vbox.addWidget(self.editor)

        # Close Button
        hbox = QHBoxLayout()
        hbox.addStretch()

        self.close_button = QPushButton("Close")
        self.close_button.clicked.connect(self.close)
        self.close_button.setDefault(True)
        hbox.addWidget(self.close_button)

        vbox.addLayout(hbox)
        self.setLayout(vbox)      

        with open(utils.resource_path('data/README.html')) as fin:
            text = fin.read()
            self.editor.setHtml(text)


class TopicInfoDialog(QDialog):

    def __init__(self, parent=None):

        super(TopicInfoDialog, self).__init__(parent)

        self.setWindowFlags(Qt.FramelessWindowHint | Qt.Window)
        self.setModal(True)

        layout = QVBoxLayout()

        layout.setSpacing(0)

        if platform.system() == 'Windows':
            layout.setContentsMargins(1,1,1,1)            
            self.setStyleSheet("TopicInfoDialog {background-color: " + views.default_ui_background_color + ";" +
                                                          "border: 1px solid " + views.default_ui_border_color + ";" +
                                                       "font-size: " + str(views.default_ui_font_size) + "pt;}")
        else:
            layout.setContentsMargins(0,0,0,0)
            self.setStyleSheet("TopicInfoDialog {background-color: " + views.default_ui_background_color + ";" + 
                                                       "font-size: " + str(views.default_ui_font_size) + "pt;}")

        self.setFixedWidth(260)
        self.setMinimumHeight(100)
        self.setMaximumHeight(760)
 
        self.setLayout(layout)

        hbox = QHBoxLayout()
        hbox.setContentsMargins(4,2,4,4)
        self.header_container = QWidget()
        self.header_container.setLayout(hbox)

        self.title = QLabel("")
        self.title.setStyleSheet("font-weight: bold;" +
                                   "font-size: " + str(views.default_ui_font_size) + "pt;")
        font = self.title.font()
        fmetrics = QFontMetrics(font)    
        self.header_container.setFixedHeight(fmetrics.height()+6)   # the height of the Em-box + 3 + 3 (top/bottom margins)

        hbox.addWidget(self.title)

        hbox.addStretch()

        self.close_button = QPushButton()
        self.close_button.setIcon(QIcon(QPixmap(utils.resource_path('data/icons/close_light_icon.png'))))
        self.close_button.setFixedSize(10,10)
        self.close_button.setFlat(True)
        self.close_button.setStyleSheet("QPushButton {background-color: transparent;}" + 
                                "QPushButton:pressed {background-color: transparent;"  + 
                                                               "border: none;}")

        self.close_button.clicked.connect(self.close)
        hbox.addWidget(self.close_button)
        layout.addWidget(self.header_container)

        self.text = QTextEdit()
        self.text.setMaximumHeight(760)
        self.text.setReadOnly(True)
        self.text.setStyleSheet("QTextEdit { background-color: " + views.default_ui_background_color + ";" +
                                        "selection-background-color: " + views.text_highlight_color + ";" +
                                        "color: " + views.default_ui_text_color + ";" +
                                        "font-size: 8pt;" +
                                        "border:        none;" +
                                        "margin-left:   0px;" +
                                        "margin-top:    0px;" +
                                        "margin-bottom: 0px;" +
                                        "margin-right:  0px;}")

        doc_layout = self.text.document().documentLayout()
        doc_layout.documentSizeChanged.connect(self.adjustHeight)

        layout.addWidget(self.text)
        layout.addStretch()

        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        self.screen_rect = QApplication.desktop().screenGeometry(screen)

    def adjustHeight(self, new_size):
        doc_height = new_size.height()
        if platform.system() == 'Windows':        
            self.setFixedHeight(doc_height + 17 + 5 + 12 + 10)
        else:
            self.setFixedHeight(doc_height + 17 + 5 + 10)

        self.text.setFixedHeight(doc_height)

    def setPosition(self, pos):
        if pos.y() + self.height() > self.screen_rect.height():
            self.move(pos.x(), self.screen_rect.height() - self.height() - 5)
        else:
            self.move(pos)

    def setContent(self, title, title_bg_color, title_color, html_str):
        self.title.setText(title)
        self.header_container.setStyleSheet("QWidget {color: " + title_color + "; background-color:" + title_bg_color + ";}")

        if views.get_color_scheme() == views.COLOR_SCHEME_DEFAULT:            
            self.close_button.setIcon(QIcon(QPixmap(utils.resource_path('data/icons/close_dark_icon.png'))))
        else:
            self.close_button.setIcon(QIcon(QPixmap(utils.resource_path('data/icons/close_light_icon.png'))))

        self.text.setHtml(html_str)

class DSCountDialog(QDialog):
    def __init__(self, parent=None):

        super(DSCountDialog, self).__init__(parent)

        WIDTH = 140

        self.setWindowFlags(Qt.FramelessWindowHint | Qt.Window)
        self.setModal(True)

        layout = QHBoxLayout()
        layout.setSpacing(0)
        if platform.system() == 'Windows':
            layout.setContentsMargins(1,1,1,1)
            self.setStyleSheet("DSCountDialog {background-color: " + views.default_ui_background_color + ";" + 
                                                        "border: 1px solid #ddd;}" + 
                                                 "QLabel {color: " + views.default_ui_text_color + ";" +
                                                     "font-size: " + str(views.default_ui_font_size) + "pt;}")                                                 

            self.setFixedWidth(WIDTH + 2)
        else:
            layout.setContentsMargins(0,0,0,0)
            self.setStyleSheet("DSCountDialog {background-color: " + views.default_ui_background_color + ";}" + 
                                            "QLabel {background: transparent; " + 
                                                         "color: " + views.default_ui_text_color + ";" +
                                                     "font-size: " + str(views.default_ui_font_size) + "pt;}")
            self.setFixedWidth(WIDTH)
 
        self.setLayout(layout)

        hbox = QHBoxLayout()
        hbox.setContentsMargins(5,2,5,1)
        self.container = QWidget()
        self.container.setStyleSheet("background: transparent;")
        self.container.setLayout(hbox)

        font = self.container.font()
        fmetrics = QFontMetrics(font)    
        self.container.setFixedHeight(fmetrics.height()+6)   # the height of the Em-box + 3 + 3 (top/bottom margins)

        self.count = QLabel("")
        hbox.addWidget(self.count)

        hbox.addStretch()

        close_button = QPushButton()
        close_button.setIcon(QIcon(QPixmap(utils.resource_path('data/icons/close_dark_icon.png'))))
        close_button.setFixedSize(8,8)
        close_button.setFlat(True)
        close_button.setStyleSheet("QPushButton {background-color transparent;}" +
                                   "QPushButton:pressed {background-color: transparent;"  + \
                                                        "border: none;}")

        close_button.clicked.connect(self.close)
        hbox.addWidget(close_button)

        layout.addWidget(self.container)

        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        self.screen_rect = QApplication.desktop().screenGeometry(screen)

    def setPosition(self, pos):
        if pos.y() + self.height() > self.screen_rect.height():
            self.move(pos.x(), self.screen_rect.height() - self.height() - 5)
        else:
            self.move(pos)

    def setContent(self, html_str):
        self.count.setText(html_str)

class PanelDescriptionDialog(QDialog):

    def __init__(self, heading, description, parent=None, content_type='value'):
        super(PanelDescriptionDialog, self).__init__(parent)

        self.setFixedWidth(600)
        self.setFixedHeight(500)
        self.setModal(True)

        self.setWindowFlags(self.windowFlags() | Qt.FramelessWindowHint | Qt.WindowSystemMenuHint)
        radius = 30
        self.setStyleSheet("QDialog { " + "border-radius: {}px; ".format(radius) +
                                                 "border: 1px solid " + views.default_ui_border_color + ";" +
                                       "background-color: " + views.default_ui_input_background_color + ";}" +
                          "QPushButton {background-color: " + views.default_ui_button_color + ";" +
                                                  "color: " + views.default_ui_text_color + ";" +
                                              "font-size: " + str(views.default_ui_font_size) + "pt;}"
                                           )

        rect = QRect(QPoint(0,0), self.geometry().size())
        b = QBitmap(rect.size())
        b.fill(QColor(Qt.color0))
        painter = QPainter(b)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setBrush(Qt.color1)
        #    // this radius should match the CSS radius
        painter.drawRoundedRect(rect, radius, radius, Qt.AbsoluteSize)
        painter.end()
        self.setMask(b)

        main_vbox = QVBoxLayout()
        main_vbox.setContentsMargins(30,30,30,30)
        self.setLayout(main_vbox)

        ##### Text Content #####

        content = QTextEdit()
        content.setStyleSheet("QTextEdit {color: " + views.default_ui_text_color + "; " + \
                                         "background-color: " + views.default_ui_input_background_color + "; " + \
                                         "border: none;}")
        s =  ""
        if content_type == 'value':
            s += "h2 {color: #e56600; font-size: " + str(views.default_ui_heading_font_size) + "pt;} "
        elif content_type == 'topic':
            s += "h2 {color: " + views.global_topic_color + "; font-size: " + str(views.default_ui_heading_font_size) + "pt;} "
        else:
            s += "h2 {color: #666; font-size: " + str(views.default_ui_heading_font_size) + "pt;} "            

        s += "p  {font-size: " + str(views.default_ui_font_size) + "pt;}"
        s += "li  {font-size: " + str(views.default_ui_font_size) + "pt;}"

        html_str = "<h2>{}</h2> {}".format(heading, description)

        doc = content.document() 
        doc.setDefaultStyleSheet(s)
        content.setHtml(html_str)

        content.setReadOnly(True)
        content.setFocusPolicy(Qt.NoFocus)
        content.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.MinimumExpanding)

        main_vbox.addWidget(content)

        ##### End of Text Content #####

        hbox = QHBoxLayout()
        hbox.addStretch()
        self.close_button = QPushButton("Close")
        self.close_button.setAutoDefault(True)
        self.close_button.clicked.connect(self.close)
        hbox.addWidget(self.close_button)

        main_vbox.addLayout(hbox)

        self.exec_()

class TopicClusterDialog(QDialog):

    def __init__(self, rule=None, impression=False, lemma=None, controller=None, parent=None):
        super(TopicClusterDialog, self).__init__(parent)

        self.rule = rule
        self.pattern_display = parent
        self.controller = controller
        self.topics_str = ""
        self.ok_button = None

        self.setWindowTitle("Topic Cluster")

        self.setFixedWidth(500)
        self.setFixedHeight(400)
        self.setModal(True)

        main_vbox = QVBoxLayout()

        if self.rule is not None:
            if impression:
                topics = self.rule.getImpressions()
                if topics == []:
                    return
                if len(topics) == 2:
                    self.topic  = topics[1]
                else:
                    self.topic  = topics[0]
            else:
                topics = self.rule.getTopics()

                if topics == []:
                    return

                self.topic  = topics[0]

            self.lemma = self.topic['lemma']

        elif lemma is not None:
            self.lemma = lemma

        else:
            return
            
        self.setStyleSheet("TopicClusterDialog {border: 0; background-color: " + views.default_ui_background_color + "}")

        topic_label = QLabel(self.lemma)
        topic_label.setStyleSheet("QLabel {font-weight: bold;}")
        main_vbox.addWidget(topic_label)

        prompt_field = QPlainTextEdit()
        if self.rule is not None:
            prompt_str = self.topic['prompt']
        else:
            prompt_str = "Enter synonyms."

        prompt_field.setPlainText(prompt_str.strip())
        prompt_field.setReadOnly(True)
        prompt_field.setStyleSheet("QPlainTextEdit {border: 0; background-color: " + views.default_ui_background_color + "}")
        prompt_field.setFocusPolicy(Qt.NoFocus)
        prompt_field.setMaximumHeight(64)
        prompt_field.setSizePolicy(QSizePolicy.Preferred,QSizePolicy.Minimum)

        main_vbox.addWidget(prompt_field)
        
        self.topics_field = QPlainTextEdit()
        self.topics_field.setSizePolicy(QSizePolicy.Preferred,QSizePolicy.MinimumExpanding)
        self.topics_field.textChanged.connect(self.edited)
        hbox = QHBoxLayout()
        
        self.synonyms_lst = self.controller.getSynonymsFromSynsetEditor(self.lemma)
        self.synonyms_lst.sort()
        if self.synonyms_lst:
            synonyms_str = '\n'.join(self.synonyms_lst)
            self.topics_field.setPlainText(synonyms_str)
            self.topics_field.moveCursor(QTextCursor.End)
        hbox.addWidget(self.topics_field)

        existing_topics_lst = self.controller.getCombinedTopics(exclude_synonyms=True)
        if existing_topics_lst:        
            self.add_button = QPushButton()
            self.add_button.setFixedSize(20,20)
            self.add_button.setToolTip("Add to Topic Cluster")
            pic = QPixmap(utils.resource_path('data/icons/left_icon.png'))
            pic = pic.scaled(11, 11, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.add_button.setIcon(QIcon(pic))
            self.add_button.clicked.connect(self.addTopicToTopicClusterField)
            self.add_button.setAutoDefault(False)   
            hbox.addWidget(self.add_button)

            self.existing_topics = QListWidget()
            self.existing_topics.setStyleSheet("QListWidget {background-color: " + views.default_ui_input_background_color + ";}")
            self.existing_topics.setFixedWidth(160)
            existing_topics_lst.sort()
            self.existing_topics.addItems(existing_topics_lst)
            hbox.addWidget(self.existing_topics)

        main_vbox.addLayout(hbox)

        if self.rule is not None and self.topic['no_lexical_overlap']:
            msg = QLabel("No lexical overlaps are required.")
            main_vbox.addWidget(msg)

        hbox = QHBoxLayout()
        hbox.addStretch()

        cancel_button = QPushButton("Cancel")
        cancel_button.setDefault(False)
        cancel_button.clicked.connect(self.cancel)
        hbox.addWidget(cancel_button)

        self.ok_button = QPushButton("Save")
        self.ok_button.setDefault(True)
        self.ok_button.setEnabled(False)
        self.ok_button.clicked.connect(self.saveTopics)
        hbox.addWidget(self.ok_button)
        main_vbox.addLayout(hbox)

        self.setLayout(main_vbox)

        self.show()

    def edited(self):
        if self.ok_button is None:
            return

        synonyms_str = self.topics_field.toPlainText()
        curr_synonyms_list = synonyms_str.splitlines()
        curr_synonyms_list.sort()

        if self.synonyms_lst != curr_synonyms_list:
            self.ok_button.setEnabled(True)
        else:
            self.ok_button.setEnabled(False)

    def addTopicToTopicClusterField(self):
        item  = self.existing_topics.currentItem()
        if item is not None:
            label = item.text()
            curr_str = self.topics_field.toPlainText()
            if curr_str.strip():
                self.topics_field.insertPlainText('\n' + label)
            else:
                self.topics_field.insertPlainText(label)

            row = self.existing_topics.row(item)
            self.existing_topics.takeItem(row)

    def cancel(self):
        self.topics_field.setPlainText(self.topics_str)
        self.close()

    def saveTopics(self):
        topics_str = self.topics_field.toPlainText()
        topics_lst = topics_str.splitlines()
        topics_lst = [t.strip() for t in topics_lst]  # remove the spaces, just in case
        topics_lst = list(set(topics_lst))            # remove duplicates
        topics_lst.sort()
        
        collisions = self.controller.findSynonymCollisions(self.lemma, topics_lst)

        if collisions:
            collision_count = len(collisions)     # count the number of collision entries.
            temp = list()                         # count the number of actual synonyms that are found in other topics
            for c in collisions:
                temp += c[1]
            topic_count = len(temp)

            if topic_count == 1:
                msg = "The following topic is already included in another topic cluster. Click cancel, and delete the existing topic first.\n\n"
            elif collision_count == 1:
                msg = "The following topics are already included in another topic cluster. Click cancel, and delete the existing topics first.\n\n"
            else:
                msg = "The following topics are already included in other topic clusters. Click cancel, and delete the existing topic first.\n\n"

            collisions_msg = ""
            for c in collisions:
                collisions_msg += "{} ({})".format(', '.join(c[1]), c[0])

            msg += collisions_msg

            WarningDialog("Duplicate entries", msg)

        else:
            self.close()
            self.controller.updateSynset(self.lemma, topics_lst)



        