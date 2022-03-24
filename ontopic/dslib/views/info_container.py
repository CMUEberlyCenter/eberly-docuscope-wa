#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__    = "Suguru Ishizaki"
__copyright__ = "2017-20 Suguru Ishizaki, Carnegie Mellon University"

import os, sys
import string

from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *

class InfoContainer(QFrame):

    def setupAnimation(self):
        self.installEventFilter(self)

        self.eff = QGraphicsOpacityEffect(self)
        self.eff.setOpacity(0.0)

        self.fade_in_anim = QPropertyAnimation(self.eff, b"opacity")
        self.fade_in_anim.setDuration(500)
        self.fade_in_anim.setEndValue(1.0)
        self.fade_in_anim.setEasingCurve(QEasingCurve.OutQuad)
        return self.eff

    def fade_in_help(self):
        self.fade_in_anim.start()

    def eventFilter(self, object, event):
        if event.type() == QEvent.Enter:
            self.anim_timer = QTimer()
            self.anim_timer.setSingleShot(True)
            self.anim_timer.timeout.connect(self.fade_in_help)
            self.anim_timer.start(150)

        elif event.type() == QEvent.Leave:
            if self.anim_timer.timerId() >= 0:
                self.anim_timer.stop()
            self.fade_in_anim.stop()
            self.eff.setOpacity(0.0)

        return super().eventFilter(object, event)
