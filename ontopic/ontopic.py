from flask import make_response, jsonify
from urllib.parse import unquote
import os, threading, psutil, platform
import prometheus
import base64
import html

from dslib.models.document import DSDocument

driver=prometheus.PythonPrometheus ()

##
#
##
class OnTopic:

  def __init__(self):
    print ("OnTopic()");
    f = open("resources/rules.json", "r")
    self.rules=f.read();
    self.document=DSDocument ()

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

  def rules (self):
    response = make_response(self.rules, 200)
    response.mimetype = "application/json"
    return response

  def ontopic (self,request):
    
    #json=request.get_json()
    #data=json ["data"]
    #raw=data["base"];
    #decoded=base64.b64decode(raw)
    #unescaped=unquote(decoded)

    #print (unescaped)

    f = open("resources/sentencedata.json", "r")
    sentences=f.read();

    response = make_response(sentences, 200)
    response.mimetype = "application/json"
    response.headers["Content-Type"] = "application/json"
    return response    
