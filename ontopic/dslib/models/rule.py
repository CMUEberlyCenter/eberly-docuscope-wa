#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
rules.py

"""
import json

from datetime import date
from datetime import datetime

from itertools import combinations

from collections import OrderedDict 

import os, sys
import platform
import string
import re
import copy
import shutil
import traceback

import bs4
from bs4 import BeautifulSoup as bs  

import dslib.utils as utils
import dslib.views as views

import pprint     
pp = pprint.PrettyPrinter(indent=4)

def simplifyHtml(html_str, doc_type):
    def extract_font_style(style_attr):
        
        attrs = style_attr.split(';')
        font_style = ''
        for a in attrs:
            a = a.strip()
            if a.startswith('font-style') or a.startswith('font-weight') \
                    or a.startswith('color') or a.startswith('background-color'):
                font_style += a
                font_style += "; "
                
        return font_style.strip()

    def generate_class_string(style_attr):
        
        attrs = style_attr.split(';')

        cls      = ''
        weight   = 'normal'
        color    = '#000000'
        bg_color = '#ffffff'

        for a in attrs:
            a = a.strip()
            if a.startswith('font-weight'):
                weight = a[12:]
            elif a.startswith('color'):
                color = a[6:]
            elif a.startswith('background-color'):
                bg_color = a[17:]

        cls = ''
        if weight == '600' and color == '#023da1':
            cls = 'topic'
        # elif bg_color == '#ffc505':
            # cls = 'experience'

        return cls

    def simplify_examples(obj):
        res = ""
        if type(obj) == bs4.element.Tag:
            if len(obj.contents) > 0:
                if obj.name == 'span':
                    style = obj.get('style', None)

                    cls = ''
                    if style is not None:
                        cls = generate_class_string(style)

                    if cls != '':
                        res += "<{} class=\"{}\">".format(obj.name, cls)
                    else:
                        res += "<{}>".format(obj.name)

                else:
                    res += "<{}>".format(obj.name)   # usually <p>

                for child in obj.contents:
                    res += simplify_examples(child)

                res += "</{}>".format(obj.name)

        elif type(obj) == bs4.element.NavigableString:
            res = str(obj)
        
        return res

    def simplify_descriptions(obj):
        res = ""
        if type(obj) == bs4.element.Tag:
            if len(obj.contents) > 0:
                if obj.name == 'span':
                    style = obj.get('style', None)

                    font_style = ''
                    if style is not None:
                        font_style = extract_font_style(style)

                    if font_style != '':
                        res += "<{} style=\"{}\">".format(obj.name, font_style)
                    else:
                        res += "<{}>".format(obj.name)

                else:
                    res += "<{}>".format(obj.name)   # usually <p>

                for child in obj.contents:
                    res += simplify_descriptions(child)

                res += "</{}>".format(obj.name)

        elif type(obj) == bs4.element.NavigableString:
            res = str(obj)
            res = utils.inchesToDoubleQuotes(res)

        return res

    soup = bs(html_str, "html.parser")
    body = soup.find('body')
    res = "<body>"

    if doc_type == 'description':
        for child in body.contents:
            res += simplify_descriptions(child)

    elif doc_type == 'example':
        for child in body.contents:
            res += simplify_examples(child)

    res += "</body>"

    return res

class DSRuleSet():

    # def __init__(self, custom_dict):
    def __init__(self, directory):

        self.custom_dict = None
        self.directory = directory

        if directory is not None:
            json_path = os.path.join(directory, "rules.json")

            if os.path.exists(json_path) == True:
                with open(json_path) as fin:
                    info = json.load(fin)
                self.name = info.get('name', '')
                self.rules = list()
                for rule in info.get('rules', list()):
                    self.rules.append(DSRule(rule_dict=rule, directory=directory))
            else:
                self.name = ''
                self.rules = list()
        else:
            self.name = ''
            self.rules = list()

        # self.patterns = DSSamplePatterns(custom_dict)

        self.values = None
        if directory is not None:
            json_path = os.path.join(directory, "values.json")
            if os.path.exists(json_path) == True:
                with open(json_path) as fin:
                    self.values = json.load(fin)
            else:
                d = dict()
                d[views.EXPECTATIONS] = ""
                d[views.COHERENCE]    = ""
                d[views.CLARITY]      = ""
                # d[views.IMPRESSIONS]  = ""
                self.values = d
        else:
            d = dict()
            d[views.EXPECTATIONS] = ""
            d[views.COHERENCE]    = ""
            d[views.CLARITY]      = ""
            # d[views.IMPRESSIONS]  = ""
            self.values = d

    def areValuesLoaded(self):
        if self.values is None:
            return True
        else:
            return False

    def getPanelDescriptions(self, panel):
        if self.values is not None:
            return self.values.get(panel, "n/a")
        else:
            return "n/a"

    # def areSamplePatterns(self):
        # return self.patterns.areSamplePatterns()

    # def getSamplePatterns(self, cluster):
        # return self.patterns.getSamplePatterns(cluster)

    def removeTopicCluster(self, lemma):
        result = dict()
        for rule in self.rules:
            if rule.isGroup():
                for sub_rule in rule.getChildren():
                    topic = sub_rule.getTopic(0)
                    if topic['lemma'] == lemma:
                        sub_rule.removeTopic(0)
            else:
                topic = rule.getTopic(0)
                if topic['lemma'] == lemma:
                    topic.removeTopic(0)

        return result        

    def getTopicClusters(self):
        result = dict()
        for rule in self.rules:
            if rule.isGroup():
                for sub_rule in rule.getChildren():
                    topic = sub_rule.getTopic(0)
                    if topic is not None and topic['user_defined']:
                        result[topic['lemma']] = topic.get('pre_defined_topics',[])
            else:
                topic = rule.getTopic(0)
                if topic is not None and topic['user_defined']:
                    result[topic['lemma']] = topic.get('pre_defined_topics',[])

        return result

    # def getPredefinedWordsAndPhrases(self, topic):
        # pass

    def getRules(self):
        return self.rules

    def getRule(self, index):
        if len(self.rules) > index:
            return self.rules[index]
        else:
            return None

    def setName(self, name):
        self.name = name

    def getName(self):
        return self.name

    def setName(self, name):
        self.name = name

    def orderRules(self, names):
        ordered_rules = list()

        for name in names:
            for r in self.rules:
                if r.getName() == name:
                    ordered_rules.append(r)
        self.rules = ordered_rules


    def deleteRule(self, deleted_rule):
        if deleted_rule in self.rules:
            self.rules.remove(deleted_rule)
            return True

        else:
            for rule in self.rules:
                if deleted_rule in rule.children:
                    return rule.children.remove(deleted_rule)

        return False

    def insertRule(self, index, rule):
        r = self.findRuleByName(rule.getName())
        if r is None:
            self.rules.insert(index, rule)
            return True
        else:
            return False

    def addRule(self, rule):

        r = self.findRuleByName(rule.getName())
        if r is None:
            self.rules.append(rule)
            return True
        else:
            return False

    # def getRuleByImpression(self, lemma):
    #     for rule in self.rules:
    #         if rule.isGroup():
    #             for sub_rule in rule.getChildren():
    #                 topics = sub_rule.getImpressions()
    #                 if topics:
    #                     topic = topics[0]
    #                     if topic['lemma'] == lemma:
    #                         return sub_rule
            # else:
            #     topics = rule.getImpressions()
            #     if topics:
            #         topic = topics[0]
            #         if topic['lemma'] == lemma:
            #             return rule
        return None

    def getRuleByTopic(self, lemma):
        for rule in self.rules:
            if rule.isGroup():
                for sub_rule in rule.getChildren():
                    topics = sub_rule.getTopics()
                    if topics:
                        topic = topics[0]
                        if topic['lemma'] == lemma:
                            return sub_rule
            else:
                topics = rule.getTopics()
                if topics:
                    topic = topics[0]
                    if topic['lemma'] == lemma:
                        return rule
        return None

    def getRuleByName(self, name):
        for rule in self.rules:
            if rule.getName() == name:
                return rule
            else:
                for sub_rule in rule.getChildren():
                    if sub_rule.getName() == name:
                        return sub_rule
        return None

    def findRuleByName(self, name):
        for r in self.rules:
            if r.getName() == name:
                return r
        return None

    def orderRules(self, names):
        ordered_rules = list()

        for name in names:
            for r in self.rules:
                if r.getName() == name:
                    ordered_rules.append(r)
        self.rules = ordered_rules

    def moveRule(self, moved_rule, dest_rule, index):
        self.deleteRule(moved_rule)                    # Remove the rule form the set temporarily
        if dest_rule is not None:
            dest_rule.insertChild(index, moved_rule)   # Insert it as a child
        else:
            self.insertRule(index, moved_rule)         # Insert it at the top level

    def setValuesDescription(self, panel, html_str):
        if panel in self.values:
            self.values[panel] = html_str

    def getValuesDescription(self, panel):
        if self.values is not None and panel in self.values:
            return self.values[panel]

    def save(self, dir_path):

        d = OrderedDict()
        d['name'] = self.name
        d['rules'] = list()

        for r in self.rules:
            rule_d = r.toDict()
            d['rules'].append(rule_d)

        rules_json_path = os.path.join(dir_path, "rules.json")
        with open(rules_json_path, 'w') as fout:
            json.dump(d, fout, indent=4)

        values_json_path = os.path.join(dir_path, "values.json")
        if os.path.exists(values_json_path):
            os.remove(values_json_path)
        with open(values_json_path, 'w') as fout:
            json.dump(self.values, fout, indent=3)

        impressions_json_path = os.path.join(dir_path, "impressions.json")
        if os.path.exists(impressions_json_path):
            os.remove(impressions_json_path)
        with open(impressions_json_path, 'w') as fout:
            json.dump(self.impressions, fout, indent=3)

    def getNoLexicalOverlapTopics(self):
        # print("getNoLexicalOverlapTopics()")
        res = list()
        for rule in self.rules:
            topic = rule.getTopic(0)

            if rule.isGroup():
                for sub_rule in rule.getChildren():
                    topic = sub_rule.getTopic(0)
                    if topic and topic['no_lexical_overlap']:
                        res.append(topic['lemma'])

            elif topic and topic['no_lexical_overlap']:
                res.append(topic['lemma'])

        # print("    res =", res)
        return res

    def getDirectory(self):
        return self.directory

    def setDirectory(self, directory):
        self.directory = directory

    def findDuplicates(self):

        def intersection(lst1, lst2):
            return list(set(lst1) & set(lst2))
        
        res = []

        # Make make a list of lists of pre-defined topics.        
        lst = []
        for rule in self.rules:
            topic = rule.getTopic(0)
            if rule.isGroup():
                for sub_rule in rule.getChildren():
                    sub_topic = sub_rule.getTopic(0)
                    if sub_topic is None:
                        continue
                    pre_defined_topics = sub_topic.get('pre_defined_topics', [])
                    if pre_defined_topics:
                        lst.append((sub_topic['lemma'], pre_defined_topics))
            else:            
                pre_defined_topics = topic.get('pre_defined_topics', [])
                if pre_defined_topics:
                    lst.append((topic['lemma'], pre_defined_topics))

        # find duplicates
        for c in combinations(lst, 2):
            l1 = c[0]
            l2 = c[1]
            duplicates = intersection(l1[1], l2[1])
            for d in duplicates:
                res.append((l1[0], l2[0], d))

        return res

    def setClusterTypes(self, common_lst, rare_lst):
        self.impressions = dict()
        self.impressions['common_clusters'] = common_lst
        self.impressions['rare_clusters']   = rare_lst

class DSRule():
    def __init__(self, rule_dict = None, directory=None, group=False):

        if rule_dict is None:
            self.name            = ''
            self.description     = ''
            self.topics          = list()  # lemma
            # self.experiences     = list()
            self.examples        = ''
            self.type            = 'active'
            self.is_group        = group
            self.parent          = None
            self.children        = list()
            self.cv_description  = ''
            self.values          = list()

        else:
            self.name            = rule_dict.get('name', '')
            self.description     = rule_dict.get('description', '')
            self.topics          = rule_dict.get('topics', [])
            # self.experiences     = rule_dict.get('experiences', [])
            self.examples        = rule_dict.get('examples', '')
            self.is_group        = rule_dict.get('is_group', False)
            self.cv_description  = rule_dict.get('cv_description', '')
            self.values          = rule_dict.get('values', [])

            if self.is_group:
                self.type        = 'bounded_optional'
            else:
                self.type        = rule_dict.get('type', 'active')

            self.parent          = None

            self.children = list()
            for rule in rule_dict.get('children', []):
                sub_rule = DSRule(rule_dict=rule, directory=directory)
                sub_rule.setParent(self)                
                self.children.append(sub_rule)

            if self.topics:
                # deal with the old rule.
                for t in self.topics:
                    try:
                        temp = t['no_lexical_overlap']
                    except:
                        t['no_lexical_overlap'] = False

        # self.user_defined_topic = None
    def setCustomDict(self, custom_dict):
        self.custom_dict = custom_dict

    def toDict(self):
        d = dict()
        d['name']           = self.name
        d['description']    = self.description
        d['topics']         = self.topics
        # d['experiences']    = self.experiences
        d['examples']       = self.examples
        d['type']           = self.type
        d['is_group']       = self.is_group
        d['children']       = [c.toDict() for c in self.children]
        d['cv_description'] = self.cv_description       
        d['values']         = self.values

        if self.parent is not None:
            d['parent'] = self.parent.getName()
        else:
            d['parent'] = None

        return d

    def getName(self):
        return self.name

    def getDescription(self):
        return self.description

    def getCVDescription(self):
        return self.cv_description

    def getValues(self):
        return self.values

    def getTopic(self, index):
        if self.topics and len(self.topics) > index:
            t = self.topics[index]
            if t['lemma'] == '-' or t['lemma'] == '':
                return None
            else:
                return t
        else:
            return None

    def getTopics(self):
        lst = []
        for t in self.topics:
            # if t.get('impression', False) == False:
            lst.append(t)
        return lst

        return self.topics

    # def getImpression(self, index):
    #     if self.topics and len(self.topics) > index:
    #         return self.topics[index]
    #     else:
    #         return None

    # def getImpressions(self):
    #     lst = []
    #     for t in self.topics:
    #         if t.get('impression', False):
    #             lst.append(t)
    #     return lst

    # def getExperiences(self):
        # return self.experiences

    def getExamples(self):
        return self.examples

    def setName(self, name):
        self.name = name

    def setDescription(self, description):
        self.description = description

    def setCVDescription(self, cv_description):   # cv = communication values
        self.cv_description = cv_description

    def setValues(self, values):
        self.values = values

    def setExamples(self, examples):
        self.examples = examples

    def deleteChild(self, rule):
        if rule in self.children:
            self.children.remove(rule)
            return True
        else:
            return False

    def insertChild(self, index, rule):
        if len(self.children) >= index:
            self.children.insert(index, rule)
            rule.setParent(self)

    def addChild(self, rule):
        self.children.append(rule)
        rule.setParent(self)

    def getChildren(self):
        return self.children

    def setParent(self, parent_rule):
        self.parent = parent_rule

    def getParent(self):
        return self.parent

    def isParent(self):
        if self.parent is not None:
            return True
        else:
            return False

    def setType(self, t):
        self.type = t

    def getType(self):
        return self.type

    def isGroup(self):
        return self.is_group

    def setTopics(self, topics):
        self.topics = topics

    # def setExperiences(self, experiences):
        # self.experiences = experiences

    def isMatchingTopic(self, topic): 
        """
        We expect that 'topic' is lemma
        """
        if topic in self.topic:
            return True
        else:
            return False

    def isMatchingExperience(self, experience):
        if experience in self.experience:
            return True
        else:
            return False

    # def getUserDefinedTopic(self):
        # return self.user_defined_topic

    # def setUserDefinedTopic(self, topic):
        # self.user_defined_topic = topic

    def removeTopic(self, index):
        if len(self.topics) > index:
            del self.topics[index]

    # def getExperienceLabel(self, index):
    #     e = self.getExperience(index)
    #     if e is not None:
    #         c = self.custom_dict.getCluster(e)
    #         if c is not None:
    #             return c['label']
    #         else:
    #             return None
    #     else:
    #         return None

    # def getExperience(self, index):
    #     if self.experiences and len(self.experiences) > index:
    #         return self.experiences[index]
    #     else:
    #         return None

# class DSSamplePatterns():
#     def __init__(self, custom_dict=None):

#         self.custom_dict = custom_dict
#         self.data = None

#         json_path = os.path.join(custom_dict.getDirectory(), "patterns.json")

#         if os.path.exists(json_path):
#             with open(json_path) as fin:
#                 self.data = json.load(fin)

#     def areSamplePatterns(self):
#         if self.data is not None:
#             return True
#         else:
#             return False

#     def getSamplePatterns(self, cluster):
#         if self.data is None:
#             return None

#         d = dict()
#         for lat, patterns in self.data.items():
#             _, c = self.custom_dict.getDimensionAndCluster(lat)
#             if c == cluster:
#                 for pattern, count in patterns.items():
#                     if pattern:
#                         p = pattern.lower()
#                         if p not in d:
#                             d[p] = count
#                         else:
#                             d[p] += count

#         patterns = list()
#         for key, value in d.items():
#             patterns.append( (value, key) )

#         patterns.sort(reverse=True)

#         result = list()
#         for p in patterns:
#             if p[0]>1:
#                 result.append("{} ({})".format(p[1], p[0]))

#         text = '\n'.join(result)
#         text = text.strip()

#         return text



