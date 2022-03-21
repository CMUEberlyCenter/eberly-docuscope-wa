from flask import make_response
import os, threading, psutil, platform
import prometheus

driver=prometheus.PythonPrometheus ()

##
#
##
class OnTopic:

  def __init__(self):
    print ("OnTopic()");
    f = open("resources/rules.json", "r")
    self.rules=f.read();

  def ping (self):
    memInString = "<tr><td>" + str(psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2) + " Mb</td></tr>";
    # https://docs.python.org/3/library/threading.html
    threadString = "<tr><td>" + str(threading.active_count()) + " threads</td></tr>";
    machineString = "<tr><td>" + platform.machine() + "</td></tr>"
    versionString = "<tr><td>" + platform.version() + "</td></tr>"
    platformString = "<tr><td>" + platform.platform() + "</td></tr>"
    nameString = "<tr><td>" + str(platform.uname()) + "</td></tr>"
    systemString = "<tr><td>" + platform.system() + "</td></tr>"
    cpuString = "<tr><td>" + platform.processor() + "</td></tr>"
    return ("<html><body><table>" + memInString+threadString+machineString+versionString+platformString+nameString+systemString+cpuString + "<table></body></html>");    

  def metrics (self):
    response = make_response(driver.metrics(), 200)
    response.mimetype = "text/plain"
    return response

  def getRules (self):
    response = make_response(self.rules, 200)
    response.mimetype = "application/json"
    return response
