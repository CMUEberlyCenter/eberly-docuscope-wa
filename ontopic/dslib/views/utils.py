#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import dslib.models.document as ds_doc
import dslib.views as views

def truncate_label(name, fmetrics, max_width):
    r = fmetrics.boundingRect(name)

    if r.width() < max_width:
        return name

    truncated_name = ""
    for i in range(1, len(name)-1):
        truncated_name = name[:-i] + '\u2026'
        r = fmetrics.boundingRect(truncated_name)
        w = r.width()
        scaled_w = w * views.win_scaling_factor
        if scaled_w < max_width:
            break

    return truncated_name

def is_skip(elem, left_count, topic_filter):

    # if theme_only == True:                 
    if topic_filter == views.TOPIC_FILTER_LEFT:

        # if the left only mode is on
        if elem[ds_doc.IS_TOPIC] == False:
            # skip, if it is not a topic word
            return True # skip  

        elif left_count < 1 and elem[ds_doc.ISLEFT] == False:
            # skip if it's a right-side word and left_count < 1 (==0)
            return True # skip

        else:
            return False            # otherwise, it's not a skip word.
    else:
        return False


############################################################
#
############################################################
# import pyttsx3

# engine = pyttsx3.init()

# def readAloud(list_of_texts):
#     global engine

#     voices = engine.getProperty('voices')      # Getting details of current voice
#     engine.setProperty('voice', voices[2].id)  # 

#     for text in list_of_texts:
#         engine.say(text)

#     engine.runAndWait()
#     engine.stop()

# def stopReading():
#     global engine

#     engine.stop()
