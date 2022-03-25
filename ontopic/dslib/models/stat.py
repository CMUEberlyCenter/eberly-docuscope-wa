#!/usr/bin/env python
# -*- coding: utf-8 -*-# coding=utf-8

"""
"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"


import math
from collections import Counter 

import pprint                                  # pretty prnting for debugging
pp = pprint.PrettyPrinter(indent=4)            # create a pretty printing object used for debugging.

def aggregateParaStats(para_stats_list, aggr_topic_paras, aggr_topic_sents):
    new_para_stats = dict()

    temp = dict()

    for para_stats in para_stats_list:
        for para_id, stat in para_stats.items():

            # get the topic, and paragraphs and sentences it is in.
            topic = stat.topic()
            para_ids, sent_ids = stat.getParaSentIDs()
            clusters_counter   = stat.cluster_counter()
            dimensions_counter = stat.dimension_counter()
            lat_counter        = stat.lat_counter()

            temp[topic] = sent_ids

            if new_para_stats.get(para_id, None) == None:
                new_para_stats[para_id] = DSStat()
            new_para_stats[para_id].addStat(stat)

    return new_para_stats

def combineStats(s1, s2):
    new_stat = DSStat()

    new_stat.clusters   = s1.clusters + s2.clusters
    new_stat.dimensions = s1.dimensions + s2.dimensions
    new_stat.lats       = s1.lats + s2.lats
    new_stat.text       = s1.text + " " + s2.text

    return new_stat

class DSStat():
    """
    DSStat is used to hold the counts per a unit of data. A unit may
    be 100 words, paragraph, etc.
    """
    DOC = 0    # count / # of total words
    LOG = 1    # log( 1+count) or 0 if count == 0

    def __init__(self):
        self.clusters   = Counter()
        self.dimensions = Counter()
        self.lats       = Counter()
        self.text       = ""

    def addStat(self, stat):
        self.clusters += stat.clusters
        self.dimensions += stat.dimensions
        self.lats += stat.lats
        self.text += " "
        self.text += stat.text

    def addCategory(self, clust_name, dim_name, lat_name):
        self.addCluster(clust_name)
        self.addDimension(dim_name)
        self.addLAT(lat_name)

    def addCluster(self, clust_name):
        if self.clusters.get(clust_name, None) is not None:
            self.clusters[clust_name] += 1
        else:
            self.clusters[clust_name] = 1

    def addDimension(self, dim_name):
        if self.dimensions.get(dim_name, None) is not None:
            self.dimensions[dim_name] += 1
        else:
            self.dimensions[dim_name] = 1

    def addLAT(self, lat_name):
        if self.lats.get(lat_name, None) is not None:
            self.lats[lat_name] += 1
        else:
            self.lats[lat_name] = 1

    def getClusterCount(self, clust_name):
        if self.clusters.get(clust_name, None) is not None:
            return self.clusters[clust_name]

    def getClusterFreq(self, clust_name, method=DOC):
        if self.clusters.get(clust_name) is not None:
            num_words = len(self.text.split())
            c_count   = self.clusters[clust_name]

            if c_count is None:
                return None
            else:           
                if num_words == 0:
                    return 0
                else:
                    if method == DSStat.DOC:
                        return c_count/num_words
                    elif method == DSStat.LOG:
                        return math.log10(1 + c_count)
        return None

    def getDimensionCount(self, dim_name):
        if self.dimensions.get(dim_name) is not None:
            return self.dimensions[dim_name]

    def getDimensionFreq(self, dim_name, method=DOC):
        if self.dimensions.get(dim_name) is not None:
            num_words = len(self.text.split())
            d_count   = self.dimensions[dim_name]
            if d_count is None:
                return None
            else:           
                if num_words == 0:
                    return 0
                else:
                    if method == DSStat.DOC:
                        return d_count/num_words
                    elif method == DSStat.LOG:
                        return math.log10(1 + d_count)
        return None

    def getLATCount(self, lat_name):
        if self.lats.get(lat_name) is not None:
            return self.lats[lat_name]

    def getText(self):
        return self.text

    def setText(self, text):
        # print("setText() text =", text)
        self.text = text

    def printData(self):
        pp.pprint(self.clusters)
        pp.pprint(self.dimensions)
        pp.pprint(self.lats)
        pp.pprint(self.text)