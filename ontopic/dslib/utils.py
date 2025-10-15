#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"


import os, sys
import string
import shutil
import json
import ftfy
import re
from bs4 import BeautifulSoup as bs  
import pathlib

app_dir = ''
resource_dir = ''
cache_dir = ''

def set_app_dir(d):
    global app_dir
    app_dir = d

def set_cache_dir(d):
    global cache_dir
    cache_dir = d

def set_resource_dir(d):
    global resource_dir
    resource_dir = d

def resource_path(relative_path):
    global resource_dir
    filename = os.path.join(resource_dir, relative_path)
    filename = filename.replace("\\", "/")
    return filename

def resource_path_old(relative_path):
    if hasattr(sys, '_MEIPASS'):            
        base_path = sys._MEIPASS		
    else:
        base_path = os.path.dirname(sys.executable)

    filename = os.path.join(base_path, relative_path)

    if os.path.exists(filename) != True:
        filename = "./{}".format(relative_path)

    filename = filename.replace("\\", "/")

    return filename

def get_temp_dir_path():
    return os.path.join(app_dir, "temp")

def remove_temp_dir():
    temp_dir = get_temp_dir_path()
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

def remove_punct_and_space(x, exceptions="_"):     # by default, underscore characters are not removed.
    x = x.replace(" ","")
    puncts_to_remove = string.punctuation

    if exceptions != "":
        table = str.maketrans({key: None for key in exceptions})
        puncts_to_remove = puncts_to_remove.translate(table)

    table = str.maketrans({key: None for key in puncts_to_remove})
    return x.translate(table)

def repair_encoding_problems(path):
    try:
        fhandle = open(path, 'rb')
        bs = fhandle.read()

        # Fix encoding problems. This will replace non-UTF8 characters
        # with UTF8 characteres.
        text = bs.decode('sloppy-windows-1252')
        text = ftfy.fix_text(text)

        # Remove duplicate entries in each file
        # patterns = text.splitlines()
        # patterns = list(set(patterns))
        # patterns.sort()
        
        # text = '\r\n'.join(patterns)
        
        fhandle.close()

        return text

    except:
        return None

def convert_invalid_xml_chars(text):
    res = text
    if text.find(" & "):
        res = text.replace(" & ", " &amp; ")
    return res
    

def remove_doublespaces_and_newlines(text):
    res = text.strip()
    res = res.replace('\n', ' ')
    res = res.replace('  ', ' ').replace('  ', ' ').replace('  ', ' ')
    return res

############################################################
#
############################################################
    
def remove_non_ascii_patterns(path):
    patterns = ""
    fhandle = open(path, 'rb')
    for line in fhandle:
        try:
            p = line.decode('utf-8')
            p.encode(encoding='utf-8').decode('ascii')
            patterns += p
        except UnicodeDecodeError:
            pass
    fhandle.close()
    return patterns

def remove_non_utf8_patterns(path):
    patterns = ""
    fhandle = open(path, 'rb')
    for line in fhandle:
        try:
            # if line.startswith(codecs.BOM_UTF8):
            p = line.decode('utf-8-sig')
            patterns += p
        except UnicodeDecodeError:
            p = ""
            pass
    fhandle.close()
    return patterns
    

def is_exported_default_dict_dir(path):
    tones_path = os.path.join(path, "_tones.txt")
    wc_path    = os.path.join(path, "_wordclasses.txt")
    help_path  = os.path.join(path, "_help.txt")
    info_path  = os.path.join(path, "info.json")
    dict_path  = os.path.join(path, "dict.ser")
    custom_tones_path = os.path.join(path, "_custom_tones.txt")
    custom_help_path  = os.path.join(path, "_custom_help.txt")            

    if (os.path.exists(dict_path)  and \
        os.path.exists(tones_path) and \
        os.path.exists(wc_path)    and \
        os.path.exists(help_path)  and \
        os.path.exists(info_path)) != True:
        # There is at least one missing file. Return False.
        return False

    elif os.path.exists(custom_tones_path) == True or \
         os.path.exists(custom_help_path) == True:
        # Just in case, check if it is a custom dictionary folder.
        return False
    else: 
        # Just to really make sure that it is not a custom dictionary folder,
        # or something went wrong, we'll check the info.json.
        with open(info_path) as fin:
            info = json.load(fin)
        if info.get('customized', False) == True:
            return False

        return True

def is_custom_dict_dir(path):
    tones_path = os.path.join(path, "_tones.txt")
    help_path  = os.path.join(path, "_help.txt")    
    wc_path    = os.path.join(path, "_wordclasses.txt")
    info_path  = os.path.join(path, "info.json")
    custom_tones_path = os.path.join(path, "_custom_tones.txt")
    custom_help_path  = os.path.join(path, "_custom_help.txt")

    if (os.path.exists(tones_path) and \
        os.path.exists(wc_path)    and \
        os.path.exists(help_path)  and \
        os.path.exists(info_path)  and \
        os.path.exists(custom_tones_path) and \
        os.path.exists(custom_help_path)) != True:
        # Just in case, check if it is a custom dictionary folder.
        return False
    else: 
        with open(info_path) as fin:
            info = json.load(fin)
        if info['customized'] == False:
            return False

        return True

def is_exported_custom_dict_dir(path):
    help_path  = os.path.join(path, "_help.txt")    
    info_path  = os.path.join(path, "info.json")
    dict_path  = os.path.join(path, "dict.ser")

    if (os.path.exists(dict_path)  and \
        os.path.exists(help_path)  and \
        os.path.exists(info_path)) != True:
        # Just in case, check if it is a custom dictionary folder.
        return False
    else: 
        with open(info_path) as fin:
            info = json.load(fin)
        if info['customized'] == False:
            return False

        return True

def is_rules_dir(path):
    rule_path    = os.path.join(path, "rules.json")    
    values_path  = os.path.join(path, "values.json")    
    info_path    = os.path.join(path, "info.json")

    if (os.path.exists(rule_path) and \
        os.path.exists(values_path) and \
        os.path.exists(info_path)) != True:
        return False
    else:
        return True


def inchesToDoubleQuotes(p):
    """
    Helper function: Given a paragraph, replace all the inche
    marks (i.e., '\"') to actual smart/curly quotes.
    """

    buf = ""

    bQuote = False
    for c in p:
        if bQuote == False and c == "\"": # open
            buf += "\u201C"
            bQuote = True
        # elif bQuote == False and c == "\u201C":
            # buf += c
            # bQuote = True
        elif bQuote == True and c == "\"": # close
            buf += "\u201D"
            bQuote = False
        # elif bQuote == False and c == "\u201D":
            # buf += c
            # bQuote = False
        else:
            buf += c

    return buf
        

CHAR_THRESHOLD = 0.3
TEXT_CHARACTERS = ''.join(
    [chr(code) for code in range(32,127)] +
    list('\b\f\n\r\t')
)
TEXT_CHARACTERS = bytearray(TEXT_CHARACTERS.encode())

def isbinary(s):
    global TEXT_CHARACTERS
    global CHAR_THRESHOLD
    
    data = bytearray(s.encode())
    data_length = len(data)
    if (not data_length):
        # empty files considered text
        return False

    if (b'\x00' in data):
        # file containing null bytes is binary
        return True

    # remove all text characters from file chunk, get remaining length
    binary_length = len(data.translate(None, TEXT_CHARACTERS))

    # if percentage of binary characters above threshold, binary file
    if (float(binary_length) / data_length) >= CHAR_THRESHOLD:
        return True
    else:
        return False

def remove_hrefs(text):
    """
    This function removes a URL from a string.
    """
    utlpattern = r"(https|http):[A-z0-9/.-]+"  # UTL regex pattern
    for m in re.finditer(utlpattern, text):    # find one or more URL patterns,
        text = text.replace(m.group(), "")     # remove the URL from the message.
    return text

############################################################
# Debugging
############################################################

def human_readable_size(B):
    B = float(B)
    KB = float(1024)
    MB = float(KB ** 2) # 1,048,576
    GB = float(KB ** 3) # 1,073,741,824
    TB = float(KB ** 4)

    if B < KB:
        return '{0} {1}'.format(B,'Bytes' if 0 == B > 1 else 'Byte')
    elif KB <= B < MB:
        return '{0:.2f} KB'.format(B/KB)
    elif MB <= B < GB:
        return '{0:.2f} MB'.format(B/MB)
    elif GB <= B < TB:
        return '{0:.2f} GB'.format(B/GB)
    elif TB <= B:
        return '{0:.2f} TB'.format(B/TB)

def get_size(obj, seen=None):
    """Recursively finds size of objects"""
    size = sys.getsizeof(obj)
    if seen is None:
        seen = set()
    obj_id = id(obj)
    if obj_id in seen:
        return 0
    # Important mark as seen *before* entering recursion to gracefully handle
    # self-referential objects
    seen.add(obj_id)
    if isinstance(obj, dict):
        size += sum([get_size(v, seen) for v in obj.values()])
        size += sum([get_size(k, seen) for k in obj.keys()])
    elif hasattr(obj, '__dict__'):
        size += get_size(obj.__dict__, seen)
    elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes, bytearray)):
        size += sum([get_size(i, seen) for i in obj])

    return size 

debug_data_export_enabled = False
debug_data_export_path = None

def set_enable_debug_data_export(val, path=None):
    global debug_data_export_enabled
    global debug_data_export_path
    debug_data_export_enabled = val
    if val:
        if path is None:
            debug_data_export_path    = pathlib.Path.home() / "ds_debug_data"
        else:
            debug_data_export_path    = pathlib.Path(path)

        if debug_data_export_path.is_dir() == False:
            pathlib.Path.mkdir(debug_data_export_path)
    else:
        debug_data_export_enabled = False
        debug_data_export_path = None        

def export_debug_data(data, filename):
    global debug_data_export_enabled
    if debug_data_export_enabled:
        file_path = debug_data_export_path / filename
        with open(file_path, 'w') as fout:
            if filename.endswith(".json"):
                fout.write(json.dumps(data, indent=4))
            elif filename.endswith(".txt"):
                fout.write(data)
            elif filename.endswith(".html"):
                soup = bs(data, "html.parser")   # beautiful soup
                fout.write(soup.prettify())




