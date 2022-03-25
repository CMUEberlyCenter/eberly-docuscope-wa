#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
class OTR_Divider(Flowable):
class OTR_Topic(Flowable): 
class OTReport():
class NumberedCanvas(canvas.Canvas):

"""

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import platform

import time
#from utils import resource_path

# reportlab
from reportlab.platypus.flowables import Flowable
from reportlab.lib import colors
from reportlab.lib.units import inch

from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, PageTemplate, NextPageTemplate
from reportlab.platypus import Frame, Paragraph, Spacer, Image, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from pathlib import Path

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

from dslib.views import point, pica

import dslib.views as views

################################################################################
#
# OTR_Divider
#
################################################################################

class OTR_Divider(Flowable):
    def __init__(self, wd, wt=0.25*point, col=colors.black):
        Flowable.__init__(self)
        self.width  = wd
        self.weight = wt
        self.color  = col

    def draw(self):
        c = self.canv
        c.setLineWidth(self.weight)
        c.setStrokeColor(self.color)
        c.line(0,0,self.width,0)


################################################################################
#
# OTR_Topic
#
################################################################################

class OTR_Topic(Flowable): 
    def __init__(self, text):
        Flowable.__init__(self)
        self.text=text
        self.right_only = False

    def getText(self):
        return self.text

    def setRightOnly(self, val):
        self.right_only = val

    def draw(self):
        canvas = self.canv
        canvas.rotate(90)
  
        if self.right_only:
            canvas.setFillColorRGB(120/255, 163/255, 217/255)
        else:
            canvas.setFillColorRGB(  0,  38/255, 136/255)

        canvas.drawString(2*point, -3*point, self.text)

header_str = ""

################################################################################
#
# OTReport (OTR)
#
################################################################################

class OTReport():
    def __init__(self, controller, fpath, doc):
        self.doc = doc

        self.controller = controller

        # create a document with 3 templates
        f = Path(fpath)
        if f.is_file():
           os.remove(f)

        pdfdoc = SimpleDocTemplate(fpath, pagesize=letter,
                                    rightMargin=1.0*inch, leftMargin=1.0*inch,
                                    topMargin=6*pica, bottomMargin=0.5*inch)
                            
        one_column_template = PageTemplate(id='one_column',
                        frames=[
                            Frame(
                                pdfdoc.leftMargin,
                                pdfdoc.bottomMargin,
                                pdfdoc.width,
                                pdfdoc.height,
                                id='left',
                               showBoundary=0
                            )                 
                        ]
                    )    

        pdfdoc.addPageTemplates([one_column_template])
                
        # define paragraph styles
        styles=getSampleStyleSheet()

        styles.add(ParagraphStyle(name='OT_Body', fontSize=11, fontName='Times-Roman', leftIndent=0,
                                  leading=14, alignment=TA_LEFT, spaceAfter=9*point,
                                  underlineProportion=0.0))

        styles.add(ParagraphStyle(name='OT_Heading', fontSize=11, fontName='Helvetica', 
                                  leading=14, alignment=TA_LEFT, spaceAfter=9*point))

        styles.add(ParagraphStyle(name='OT_Section_Heading', fontSize=11, fontName='Helvetica', 
                                  leading=14, alignment=TA_LEFT, spaceAfter=9*point,
                                  firstLineIndent=6, backColor='#000000', textColor='#ffffff'))

        self.pdfdoc = pdfdoc
        self.styles = styles
         

    def generateReport(self, filename, tvframe, pvframe, svframe):

        def is_pv_empty(data):
            for d in data:
                if d.get('data', []) is not None:
                    return False
            return True

        content=[]   # list of flowables
        content.append(NextPageTemplate('one_column'))  # we'll use the one column layout first.

        global header_str
        header_str = "<b>OnTopic Report</b> | {} | {}".format(filename, time.ctime())

        num_sections = self.controller.getNumSections()

        for sec in range(num_sections):

            self.controller.sectionChanged(sec)

            if num_sections > 1:
                content.append(Paragraph("<b>Section</b> {}".format(sec+1), self.styles["OT_Section_Heading"]))

            tv_data = tvframe.getPDFData()
            pv_data = pvframe.getPDFData()
            sv_data = svframe.getPDFData()

            if tv_data is not None and tv_data['data'] is not None:

                self.controller.setFilters(views.VISMODE_TEXT)
                topics = tvframe.getHeaderLabels()      
                paragraphs = self.doc.toXML(topics=topics)

                if len(paragraphs)>1:

                    content.append(Paragraph("<b>Text View</b>", self.styles["OT_Heading"]))

                    for para_str in paragraphs:
                        content.append(Paragraph(para_str, self.styles["OT_Body"]))

                    content.append(PageBreak())
                      
                    nrows = len(tv_data['data'])
                    ncols = len(tv_data['data'][0])

                    if ncols > 1:
                        cw = 1*pica
                        ch = 1*pica
                        header_ht = 6*pica

                        table = Table(tv_data['data'], 
                                     colWidths=[cw]*ncols,
                                     rowHeights=[header_ht] + [ch]*(nrows-1),
                                     repeatRows=1)

                        table.hAlign = 'LEFT'
                        slist = [('ALIGN',      (0,1), (-1,-1), 'CENTER'),   # 
                                 ('VALIGN',     (0,1), (-1,-1), 'MIDDLE'),   # 
                                 ('ALIGN',      (0,0), (-1,0),  'LEFT'),     # headers
                                 ('FONTSIZE',   (0,1), (0,-1), 8),           # font for the sent numbers
                                 ('FONTSIZE',   (0,0), (-1,0), 10)]          # font for header

                        # for t in tv_data['topics']:
                        #    slist.append(('BACKGROUND', t, t, colors.Color(169.0/255.0,239.0/255.0,122.0/255.0)))
                         
                        table.setStyle(TableStyle(slist))
                        content.append(table)
                        content.append(PageBreak())


            if pv_data is not None:

                self.controller.setFilters(views.VISMODE_PARAGRAPH)

                # for highighitng the global key topics
                # key_lemmas = list()
                if tv_data is not None and tv_data['data'] is not None:
                    # key_topics = tv_data['topics']   # persistent topics found by TextVisFrame.
                    tv_header = [x.text if type(x)!=str else x for x in tv_data['data'][0]]
                    # for t in key_topics:
                        # key_lemmas.append(tv_header[t[0]])

                if is_pv_empty(pv_data) == False:

                    content.append(Paragraph("<b>Paragraph View</b>", self.styles["OT_Heading"]))

                    for data in pv_data:
                        # Note: pv_data is a list of dictionaries    

                        cw = 1*pica
                        ch = 1*pica

                        if data['data']!=None:
                            pvdata = data['data']
                            pv_header = [x.text if type(x)!=str else x for x in data['data'][0]]
                            para_str = self.doc.toXML(topics=pv_header, para_pos=data['ppos'])

                            if [s for s in pv_header if type(s) == str and s.strip()!='']:
                                header_ht = 6*pica
                                nrows = len(data['data'])
                                ncols = len(data['data'][0])
                            else:
                                pv_header = []
                                pvdata = [['']]
                                nrows = 1
                                ncols = 1
                                header_ht = pica

                        else:
                            pv_header = []
                            para_str = self.doc.toXML(topics=pv_header, para_pos=data['ppos'])
                            nrows = 1
                            ncols = 1
                            pvdata = [['']]
                            header_ht = pica

                        table = Table(pvdata,
                                    colWidths=[cw]*ncols,
                                    rowHeights=[header_ht] + [ch]*(nrows-1),
                                    repeatRows=1)

                        table.hAlign = 'LEFT'
                        slist = [('ALIGN',      (0,1), (-1,-1), 'CENTER'),   # 
                                 ('VALIGN',     (0,1), (-1,-1), 'MIDDLE'),   # 
                                 ('ALIGN',      (0,0), (-1,0),  'LEFT'),     # headers
                                 ('FONTSIZE',   (0,1), (0,-1), 8),           # font for the sent numbers
                                 ('FONTSIZE',   (0,0), (-1,0), 10)]          # font for header

                        table.setStyle(TableStyle(slist))
                        table.keepWithNext = True
                        content.append(KeepTogether([OTR_Divider(self.pdfdoc.width-12),
                                                     Spacer(self.pdfdoc.width-12, 2*point),
                                                     table, 
                                                     Paragraph(" ", self.styles["OT_Body"]),            
                                                     Paragraph(para_str[0], self.styles["OT_Body"]),
                                                     Paragraph(" ", self.styles["OT_Body"])
                                                     ]))
                    content.append(PageBreak())

            if sv_data is not None:

                self.controller.setFilters(views.VISMODE_SENTENCE)

                content.append(Paragraph("<b>Sentence View</b>", self.styles["OT_Heading"]))

                nrows = len(sv_data)
                ncols = len(sv_data[0])

                cw = 1*pica
                ch = 0.75*pica
                header_ht = 1*pica

                table = Table(sv_data, 
                                    colWidths=[1.5*pica, 7*pica, 7*pica, 22*pica],
                                    #rowHeights=[header_ht] + [ch]*(nrows-1),
                                    repeatRows=1)

                table.hAlign = 'LEFT'
                slist = [
                         ('VALIGN',     (0,0), (-1,-1), 'TOP'),  
                         ('ALIGN',      (0,0), (-1,-1),  'LEFT'),    
                         ('FONTSIZE',   (0,0), (2,-1), 10),      
                         ('LINEBELOW',  (0,0), (-1,-1), 0.25, colors.gray)]
                         
                table.setStyle(TableStyle(slist))
                content.append(table)

            content.append(PageBreak())
            pass

        self.pdfdoc.build(content, canvasmaker=NumberedCanvas)

      # self.controller.sectionChanged(0)                  

# From: https://gist.github.com/nenodias/8c54500eb27884935d05b3ed3b0dd793
class NumberedCanvas(canvas.Canvas):

    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []
 
    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        """add page info to each page (page x of y)"""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
 
    def draw_page_number(self, page_count):
        # Change the position of this to wherever you want the page number to be
        self.setFont("Helvetica", 8)
        global header_str
        
        hstyle = ParagraphStyle(name='OT_Header', fontSize=7, fontName='Helvetica', 
                                  leading=8.4, alignment=TA_LEFT)

        # Header
        header = Paragraph(header_str, hstyle)
        w, h = header.wrap(6.5*inch, 1.0*inch)
        header.drawOn(self,  1.0*inch + 6, 11*inch - 3*pica)
        
#        self.drawString( 1.0*inch + 6, 11*inch - 3*pica, header_str)

        self.drawRightString(7.5*inch,     11*inch - 3*pica,
                             "{}/{}".format(self._pageNumber, page_count))
