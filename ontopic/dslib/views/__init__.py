#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

# Global STATIC Variables

EDITOR_EDITABLE         = 0
EDITOR_READ_ONLY        = 1

VISMODE_TEXT            = 0    # Text View
VISMODE_PARAGRAPH       = 1    # Paragraph View
VISMODE_SENTENCE        = 2    # Sentence View
VISMODE_TEXT_COLLAPSED  = 4    # Collapsed Text View 

VISMODE_DASHBOARD       = 0    # Summary Panel
VISMODE_TOPICS          = 1    # Topics Panel
VISMODE_ORGANIZATION    = 2    # Organization Panel
VISMODE_SENTENCE        = 3    # Sentence View

VISMODE_SENTENCE_PDF    = 5    # PDF Rerports
VISMODE_PARAGRAPH_PDF   = 6
VISMODE_TEXT_PDF        = 7 

TOPIC_SENT_OFF          = 0    # Topic Sentence View is off
TOPIC_SENT_ONE          = 1    # Highlgiht one topic sentence
TOPIC_SENT_TWO          = 2    # Highlight two topic sentences

TOPIC_FILTER_LEFT       = 0     # LEFT
TOPIC_FILTER_LEFT_RIGHT = 1     # LEFT + RIGHT
TOPIC_FILTER_ALL        = 2     # ALL

TOPIC_SELECTION_INTERSECTION = 0
TOPIC_SELECTION_FREQUENCY    = 1
TOPIC_SELECTION_ALL          = 2

TOPIC_SORT_APPEARANCE   = 0
TOPIC_SORT_LEFT_COUNT   = 1

GLOBAL_VIEW     = 0
LOCAL_VIEW      = 1

COLOR_SCHEME_DEFAULT = 0
COLOR_SCHEME_DARK    = 1

UP    = -1
DOWN  = 1

EXPECTATIONS = "expectations"
COHERENCE    = "coherence"
CLARITY      = "clarity"
IMPRESSIONS  = "impressions"

EXPECTATIONS_ID = 0
COHERENCE_ID    = 1
CLARITY_ID      = 2
IMPRESSIONS_ID  = 3

EXPECTATIONS_TITLE = "Meet Readers' Expectations"
COHERENCE_TITLE    = "Create Flow in Your Writing"
CLARITY_TITLE      = "Polish Your Sentences for Clarity"
IMPRESSIONS_TITLE  = "Manage Reader Impressions"

STUDENT_MODE = 101
WRITER_MODE  = 102

def getSectionHeading(panel):
    if panel   == "expectations":
        return EXPECTATIONS_TITLE
    elif panel == "coherence":
        return COHERENCE_TITLE
    elif panel == "clarity":
        return CLARITY_TITLE
    elif panel == "impressions":
        return IMPRESSIONS_TITLE

def panelID2String(panel_id):
    if panel_id == EXPECTATIONS_ID:
        return EXPECTATIONS
    elif panel_id == COHERENCE_ID:
        return COHERENCE
    elif panel_id == CLARITY_ID:
        return CLARITY
    elif panel_id == IMPRESSIONS_ID:
        return IMPRESSIONS

#
# Global Variables
#
import platform
from PyQt5.QtGui     import QFontDatabase
from PyQt5.QtWidgets import QApplication

win_scaling_factor = 1.0

def initWinScalingFactor(ldpi):
    global win_scaling_factor
    win_scaling_factor = 72.0/ldpi
    
prefered_fonts = ["Arial", "Helvetica", "Calibri"]

font_families = None
default_font  = "Arial"

def initFonts():
    global font_families
    global default_font

    font_database = QFontDatabase()
    font_families = font_database.families()

    if "Arial" in font_families:
        default_font = "Arial"
    else:
        for pf in prefered_fonts:
            if pf in font_families:
                default_font = pf
                break

VALUES_ICON_SIZE = 20

editor_normal_font_size = 16
editor_h1_font_size     = 18   # * 1.125
editor_title_font_size  = 21   # * 1.3
default_ui_font_size    = 14
default_ui_heading_font_size = 16
default_ui_title_font_size   = 18

default_browser_font_size = 11
default_browser_heading_font_size = 13
default_browser_title_font_size = 15

def setDefaultFontSize(text_fsize, ui_fsize):
    global editor_normal_font_size
    global editor_h1_font_size
    global editor_title_font_size
    global default_ui_font_size
    global default_ui_heading_font_size
    global default_browser_font_size
    global default_browser_heading_font_size
    global default_browser_title_font_size

    if platform.system() != 'Windows':
        browser_font_scale_factor = 0.8
    else:
        screen = QApplication.desktop().screenNumber(QApplication.desktop().cursor().pos())
        screens = QApplication.screens()
        s = screens[screen]
        dpi = s.logicalDotsPerInch()
        browser_font_scale_factor = dpi*0.8/(72.0)

    # fonts for the editor
    editor_normal_font_size = text_fsize
    editor_h1_font_size     = round(text_fsize * 1.125)
    editor_title_font_size  = round(text_fsize * 1.3)
    
    if ui_fsize > 0:
        default_ui_font_size              = ui_fsize
        default_ui_heading_font_size      = round(ui_fsize * 1.14)
        default_ui_title_font_size        = round(ui_fsize * 1.60)
        default_browser_font_size         = round(default_ui_font_size * browser_font_scale_factor)
        default_browser_heading_font_size = round(default_ui_heading_font_size * browser_font_scale_factor)
        default_browser_title_font_size   = round(default_ui_title_font_size * browser_font_scale_factor)

def setNormalFontSize(fsize):
    global editor_normal_font_size
    global editor_h1_font_size
    global editor_title_font_size
    editor_normal_font_size = fsize
    editor_h1_font_size = round(fsize * 1.125)
    editor_title_font_size = round(fsize * 1.3)

#########################
#
# color scheme
#
#########################

color_scheme = COLOR_SCHEME_DEFAULT

#
# user interface
#
default_ui_background_color       = "#ececec"    # ui background (dialog etc.)
default_ui_border_color           = "#cccccc"    # border around UI elements (buttons etc.)
default_ui_input_background_color = "#fff"       # background for input fields etc.
default_ui_read_only_color        = "#f3f3f3"    # bacckground for a read only text fields.
default_ui_selected_color         = "#dd0"       # highlight for selected buttons etc.
default_ui_text_color             = "#1a1a1a"    # default text used for ui elements
default_ui_text_inactive_color    = "#808080"    # text color for inactive ui elements
default_ui_button_color           = "#ececec"
default_ui_button_disabled_color  = "#ececec"
default_ui_button_default_color   = "#eeeeee"

menu_selected_color               = "#1b58d3"  # menu highlight
menu_selected_disabled_color      = "#1b58d3"  # menu highlight
menu_selected_text_color          = "#ffffff"  # menu text when selected

text_highlight_color              = "#95caff"  # text selection highlight (e.g., in the editor)

scrollbar_bg_color                = "#fff"
scrollbar_border_color            = "#fff"
scrollbar_handle_bg_color         = "#ddd"

splitter_handle_color             = "#c1c1c1"       # splitter handle color

tabpane_background_color          = "#fff"          # colors for QTabWidget used in the 
tabbar_bg_color                   = "#ececec"       # middle pane
tab_color                         = "#dddddd"
tab_selected_color                = "#f5f5f5"

tab_light_border_color            = "#d7d7d7"
tab_light_color                   = "#e7e7e7"
tab_selected_light_color          = "#f7f7f7"

small_instruction_color           = "#333333"

#
# visualization
#
default_vis_background_color      = "#fff"       # background of the visualization
default_light_vis_background_color= "#fcfcfc"    # background of the visualization

# Editor
default_text_color                = "#202020"  # text in the editor
ds_text_color                     = "#000"     # color for the highlighted text

default_text_color_a              = "#aaaaaa"  # faded versions
ds_text_color_a                   = "#9e9e9e"

sent_highlight_color              = "#fffbbb"  # color for highlighting sentences in the editor
sent_text_color                   = "#000"     # black

sent_highlight_color_a            = "#fffde4"  # light yellow w/ alpha
sent_text_color_a                 = "#9e9e9e"  # highlighted sent w/ alpha

# Topics/Experiences Panel
topic_highlight_color             = "#fffbbb"  # light yellow topic highlight
topic_pressed_color               = "#fffbbb"  # used for the 'mouse-pressed' state (not used...)

topic_highlight_color_a           = "#fffde4"  # light yellow w/ alpha

global_topic_color                = "#023da1"  # global topic (dark blue)
global_topic_pressed_color        = "#9ab1d9"  # used for the mouse pressed event (not used)

local_topic_color                 = "#9c39ae"  # local topic (purple)
local_topic_pressed_color         = "#d7b0df"  # used for the mouse pressed event (not used??)

global_topic_color_a              = "#9ab1d9"  # blue w/ alpha
local_topic_color_a               = "#d7b0df"  # purple w/ alpha

ds_cluster_highlight_color        = "#ffc505"  # cluster orange (highlight)
ds_dimension_highlight_color      = "#ffc505"  # use the same orange

ds_cluster_highlight_color_a      = "#ffe89b"  # clustorange w/ alpha
ds_dimension_highlight_color_a    = "#ffe89b"  # dim yellow w/ alpha

ds_cluster_graph_color            = "#ffa500"  # orange for graphs
ds_dimension_graph_color          = "#ffa500"  # use the same orange

ds_text_label_color               = "#202020"  # text color for the cluster labels
ds_text_label_highlight_color     = "#202020"  # highlighted color (same for this scheme)

global_title_bg_color             = "#d5e4ff"
local_title_bg_color              = "#ede2f2"
rx_title_bg_color                 = "#f19220"

global_title_bg_color2            = "#dfdfdf"
local_title_bg_color2             = "#dfdfdf"
rx_title_bg_color2                = "#e1489a"

# Sent Proportions Panel
root_verb_color                   = "#c40000" # root verbs
np_color                          = "#023da1" # noun phrases
sent_topic_color                  = "#147c2d" # dark green
sent_topic_text_color             = "#147c2d" 
sent_verb_color                   = "#fb000a" # red
sent_be_verb_color                = "#4fc3ff" # light blue
sent_title_color                  = "#176e1b"

# Audit UI
audit_active_rule_color              = "#00b074"
audit_quiet_rule_color               = "#cc0000"
audit_optional_rule_color            = "#f7ca3e"
audit_bounded_optional_rule_color    = "#00b074"

audit_active_rule_bg_color           = "#e0fff4"
audit_quiet_rule_bg_color            = "#ffe7e7"
audit_optional_rule_bg_color         = "#ffeac0"
audit_bounded_optional_rule_bg_color = "#e0fff4"

audit_default_rule_color             = "#bbbbbb"
audit_default_rule_bg_color          = "#eeeeee"
audit_description_bg_color           = "#ececec"
#
# Styles
#
instructions_style = ""
help_style = ""

# instructions_style = "p {font-size: " + str(default_ui_font_size) + "pt; " + \
#                             "color: " + default_text_color + "; " + \
#                     "margin-bottom: 0.4em;}" + \
#                 "body p {font-size: " + str(default_ui_font_size) + "pt; " + \
#                             "color: " + default_text_color + ";}" + \
#             "body ul li {font-size: " + str(default_ui_font_size) + "pt; " + \
#                             "color: " + default_text_color + ";}" + \
#                  "ul li {font-size: " + str(default_ui_font_size) + "pt; " + \
#                             "color: " + default_text_color + ";}" + \
#                "p.small {font-size: " + str(100) + "pt; " + \
#                             "color: " + "#f00" + "};" 

# help_style = "body {font-family: sans-serif; margin: 50px; margin-top: 30px;}"

# help_style += "p, h3, li, ul {color: " + default_text_color + "; " + \
#                          "font-size: " + str(default_ui_font_size) + "pt;}" + \
#                   "li:before {color: " + default_text_color + ";}"

# help_style += "h2 {color: " + default_text_color + "; " + \
#               "font-size: " + str(default_ui_heading_font_size) + "pt;}" + \
#        "li:before {color: " + default_text_color + ";}"

# help_style += "h1 {color: " + default_text_color + "; " + \
#               "font-size: " + str(default_ui_title_font_size) + "pt;}" + \
#        "li:before {color: " + default_text_color + ";}"

# help_style +=""".header1 img {
#                   float: left;
#                   width: 32px;
#                  height: 32px;
#                 }

#                 .header2 img {
#                   float: left;
#                   width: 24px;
#                  height: 24px;
#                 }                

#                 .header1 h2 {
#                   position: relative;
#                   top: 5px;
#                  left: 5px;
#                 }

#                 .header2 h3 {
#                   position: relative;
#                   top: 5px;
#                  left: 5px;
#                 }

# """

# units

from reportlab.lib.units import inch
point = inch/72.0
pica  = inch/6.0

#############################################
# Dark Theme
#############################################
def get_color_scheme():
    global color_scheme
    return color_scheme

def set_theme(c, scheme):
    """
    replace the defalt pallete colors with the given pallete (dictionary)
    """
    global color_scheme
    color_scheme = scheme

    global default_vis_background_color
    global default_light_vis_background_color
    global default_ui_background_color
    global default_ui_border_color
    global default_ui_input_background_color
    global default_ui_read_only_color
    global default_ui_selected_color
    global default_ui_text_color
    global default_ui_text_inactive_color
    global default_ui_button_color        
    global default_ui_button_disabled_color
    global default_ui_button_default_color        

    global tabpane_background_color
    global tabbar_bg_color         
    global tab_color               
    global tab_selected_color      

    global tab_light_border_color
    global tab_light_color       
    global tab_selected_light_color

    global small_instruction_color

    global scrollbar_bg_color      
    global scrollbar_border_color  
    global scrollbar_handle_bg_color 

    global splitter_handle_color

    global default_text_color       
    global ds_text_color               

    global global_title_bg_color             
    global local_title_bg_color              
    global rx_title_bg_color                 

    global global_title_bg_color2            
    global local_title_bg_color2             
    global rx_title_bg_color2                

    global menu_selected_color
    global menu_selected_text_color
    global text_highlight_color       

    global topic_highlight_color    
    global topic_pressed_color      

    global global_topic_color        
    global global_topic_pressed_color

    global local_topic_color         
    global local_topic_pressed_color 

    global ds_cluster_highlight_color
    global ds_dimension_highlight_color

    global ds_cluster_graph_color      
    global ds_dimension_graph_color    

    global ds_text_label_color
    global ds_text_label_highlight_color

    global sent_highlight_color        
    global sent_text_color             

    global root_verb_color             
    global np_color                    

    # faded colors
    global default_text_color_a        
    global ds_text_color_a                

    global topic_highlight_color_a     

    global global_topic_color_a        
    global local_topic_color_a         

    global ds_cluster_highlight_color_a   
    global ds_dimension_highlight_color_a 

    global sent_highlight_color_a      
    global sent_text_color_a           

    # Sentence View
    global sent_topic_color
    global sent_topic_text_color
    global sent_verb_color
    global sent_be_verb_color
    global sent_title_color

    # Audit UI
    global audit_active_rule_color           
    global audit_quiet_rule_color            
    global audit_optional_rule_color         
    global audit_bounded_optional_rule_color 

    global audit_active_rule_bg_color          
    global audit_quiet_rule_bg_color           
    global audit_optional_rule_bg_color        
    global audit_bounded_optional_rule_bg_color

    global audit_default_rule_color          
    global audit_default_rule_bg_color       
    global audit_description_bg_color

    # Reader Experience Panel Specific
    global rx_title_bg_color

    # Tooltip
    global tooltip_style
    global instructions_style
    global help_style

    default_vis_background_color      = c['default_vis_background_color']
    default_light_vis_background_color= c['default_light_vis_background_color']

    default_ui_background_color       = c['default_ui_background_color']
    default_ui_border_color           = c['default_ui_border_color']
    default_ui_input_background_color = c['default_ui_input_background_color']
    default_ui_read_only_color        = c['default_ui_read_only_color']
    default_ui_selected_color         = c['default_ui_selected_color']
    default_ui_text_color             = c['default_ui_text_color']
    default_ui_text_inactive_color    = c['default_ui_text_inactive_color']
    default_ui_button_color           = c['default_ui_button_color']
    default_ui_button_disabled_color  = c['default_ui_button_disabled_color']
    default_ui_button_default_color   = c['default_ui_button_default_color']

    tabpane_background_color       = c['tabpane_background_color']
    tabbar_bg_color                = c['tabbar_bg_color']
    tab_color                      = c['tab_color']
    tab_selected_color             = c['tab_selected_color']

    tab_light_border_color         = c['tab_light_border_color']
    tab_light_color                = c['tab_light_color']
    tab_selected_light_color       = c['tab_selected_light_color']

    small_instruction_color        = c['small_instruction_color']

    scrollbar_bg_color             = c['scrollbar_bg_color']
    scrollbar_border_color         = c['scrollbar_border_color']
    scrollbar_handle_bg_color      = c['scrollbar_handle_bg_color']

    splitter_handle_color          = c['splitter_handle_color']

    default_text_color             = c['default_text_color']
    ds_text_color                  = c['ds_text_color']

    global_title_bg_color          = c['global_title_bg_color']            
    local_title_bg_color           = c['local_title_bg_color']            
    rx_title_bg_color              = c['rx_title_bg_color']            

    global_title_bg_color2         = c['global_title_bg_color2']            
    local_title_bg_color2          = c['local_title_bg_color2']            
    rx_title_bg_color2             = c['rx_title_bg_color2']            

    menu_selected_color            = c['menu_selected_color']
    menu_selected_text_color       = c['menu_selected_text_color']
    text_highlight_color           = c['text_highlight_color']

    topic_highlight_color          = c['topic_highlight_color']
    topic_pressed_color            = c['topic_pressed_color']

    global_topic_color             = c['global_topic_color']
    global_topic_pressed_color     = c['global_topic_pressed_color']

    local_topic_color              = c['local_topic_color']
    local_topic_pressed_color      = c['local_topic_pressed_color']

    ds_cluster_highlight_color     = c['ds_cluster_highlight_color']
    ds_dimension_highlight_color   = c['ds_dimension_highlight_color']

    ds_cluster_graph_color         = c['ds_cluster_graph_color']
    ds_dimension_graph_color       = c['ds_dimension_graph_color']

    ds_text_label_color            = c['ds_text_label_color']
    ds_text_label_highlight_color  = c['ds_text_label_highlight_color']

    sent_highlight_color           = c['sent_highlight_color']
    sent_text_color                = c['sent_text_color']

    root_verb_color                = c['root_verb_color']
    np_color                       = c['np_color']

    # faded colors
    default_text_color_a           = c['default_text_color_a']
    ds_text_color_a                = c['ds_text_color_a']

    topic_highlight_color_a        = c['topic_highlight_color_a']

    global_topic_color_a           = c['global_topic_color_a']
    local_topic_color_a            = c['local_topic_color_a']

    sent_highlight_color_a         = c['sent_highlight_color_a']
    sent_text_color_a              = c['sent_text_color_a']

    ds_cluster_highlight_color_a   = c['ds_cluster_highlight_color_a']
    ds_dimension_highlight_color_a = c['ds_dimension_highlight_color_a']

    #
    # Sentence View
    #
    sent_topic_color               = c['sent_topic_color']
    sent_topic_text_color          = c['sent_topic_text_color']
    sent_verb_color                = c['sent_verb_color']
    sent_be_verb_color             = c['sent_be_verb_color']
    sent_title_color               = c['sent_title_color']        

    audit_active_rule_color              = c['audit_active_rule_color']
    audit_quiet_rule_color               = c['audit_quiet_rule_color']
    audit_optional_rule_color            = c['audit_optional_rule_color']
    audit_bounded_optional_rule_color    = c['audit_bounded_optional_rule_color']

    audit_active_rule_bg_color           = c['audit_active_rule_bg_color']
    audit_quiet_rule_bg_color            = c['audit_quiet_rule_bg_color']
    audit_optional_rule_bg_color         = c['audit_optional_rule_bg_color']
    audit_bounded_optional_rule_bg_color = c['audit_bounded_optional_rule_bg_color']

    audit_default_rule_color             = c['audit_default_rule_color']
    audit_default_rule_bg_color          = c['audit_default_rule_bg_color']
    audit_description_bg_color           = c['audit_description_bg_color']
    #
    # Reader Experience Panel Specific
    #


    #
    # Tooltip
    # 
    tooltip_style = "QToolTip { background-color: " + c['tooltip_bg_color'] + "; " + \
                                "color:           " + c['tooltip_text_color'] + "; " + \
                            "font-size:           " + str(default_browser_font_size) + "pt; " + \
                               "border:           #666666 solid 1px;}"

    instructions_style = "p {font-size: " + str(default_ui_font_size) + "pt; " + \
                                "color: " + default_text_color + ";} " + \
                    "body p {font-size: " + str(default_ui_font_size) + "pt; " + \
                                "color: " + default_text_color + ";} " + \
                   ".small {font-size: " + str(default_ui_font_size) + "pt ; " + \
                                "color: " + small_instruction_color + ";} " + \
                "body ul li {font-size: " + str(default_ui_font_size) + "pt ;" + \
                                "color: " + default_text_color + ";} " 

    help_style  = "body {font-family: " + default_font + "; " + \
                             "margin: 50px; margin-top: 30px;} " + \
               "p, h3, li, ul {color: " + default_text_color + "; " + \
                          "font-size: " + str(default_browser_font_size) + "pt;} " + \
                   "li:before {color: " + default_text_color + ";} " + \
                          "h2 {color: " + default_text_color + "; " + \
                          "font-size: " + str(default_browser_heading_font_size) + "pt;} " + \
                          "h1 {color: " + default_text_color + "; " + \
                          "font-size: " + str(default_browser_title_font_size) + "pt;} " + \
                ".header1 img {float: left; width: 25px; height: 25px;} " + \
                ".header2 img {float: left; width: 24px; height: 24px;} " + \
              ".header1 h2 {position: relative; top: 5px; left: 5px;} " + \
              ".header2 h3 {position: relative; top: 5px; left: 5px;} "



