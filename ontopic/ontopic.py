from flask import make_response, jsonify
from urllib.parse import unquote
from urllib.parse import quote_from_bytes
import os, threading, psutil, platform
import prometheus
import base64
import html
import json

import dslib.utils as utils
import dslib.views as views

from dslib.models.document import DSDocument

driver=prometheus.PythonPrometheus ()

##
#
##
class OnTopic:

  ##
  #
  ##
  def __init__(self):
    print ("OnTopic()");

    self.systemErrorMessage=""
    self.systemReady=True

    if (os.path.isfile("resources/rules.json")==False):
      self.systemReady=False
      self.systemErrorMessage="Unable to load data model"
    else:  
      f = open("resources/rules.json", "r")
      self.rules=f.read();

    if (os.path.exists("data/default_model") == False):
      self.systemErrorMessage="Unable to locate default language model"
      self.systemReady=False

    if (os.path.exists("data/large_model") == False):
      self.systemErrorMessage="Unable to locate large language model"
      self.systemReady=False

  ##
  #
  ##
  def createList(self, r1, r2):
    # Testing if range r1 and r2 are equal
    if (r1 == r2):
      return r1
    else:
      # Create empty list
      res = []
  
      # loop to append successors to 
      # list until r2 is reached.
      while(r1 < r2+1 ):              
        res.append(r1)
        r1 += 1

      return res

  ##
  #
  ##
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

  ##
  #
  ##
  def metrics (self):
    response = make_response(driver.metrics(), 200)
    response.mimetype = "text/plain"
    return response

  ##
  #
  ##
  def rules (self):
    response = make_response(self.rules, 200)
    response.mimetype = "application/json"
    return response

  ##
  #
  ##
  def ontopic (self,request):    
    print ('ontopic()')

    envelope=request.get_json()

    #print (envelope)

    data=envelope ["data"]
    raw=data["base"]
    customString=data["custom"]
    custom="";

    if (isinstance(customString, str)):
      custom = customString.split(";")

    #print ("Custom: ");
    #print (custom);

    decoded=base64.b64decode(raw).decode('utf-8')

    unescaped=unquote(decoded)

    #print ("decoded and unqoted:")
    #print (unescaped)

    document=DSDocument ()
    document.loadFromTxt (unescaped)

    # What's the difference between the two methods below?
    #document.setUserTopics (custom);
    document.setUserDefinedTopics (custom);

    coherence=document.generateGlobalVisData (2,1,views.TOPIC_SORT_APPEARANCE)
    clarity=document.getSentStructureData()
    topics=document.getCurrentTopics ()
    html=document.toHtml_OTOnly_DSWA(topics,-1)

    # https://stackabuse.com/encoding-and-decoding-base64-strings-in-python/
    html_bytes = html.encode('utf-8')
    html_base64 = base64.b64encode(html_bytes)

    nrParagraphs=coherence ['num_paras'];

    print ("Number of paragraphs processed: " + str(nrParagraphs));

    local=[]

    for i in range(nrParagraphs):
      localSelected=[];
      localSelected.append(i);
      print ("Processing paragraph " + str(i) + ", with selected paragraph: " + str (localSelected));
      localDict=document.generateLocalVisData (localSelected,1,2);
      print (localDict);
      #local.append (json.dumps(localDict));
      local.append (localDict);

    #print ("Found coherence data: ")
    #print(type(coherence))
    #print (coherence)
    #print (json.dumps(coherence))

    #print ("Found clarity data (ontopic): ")
    #print(type(clarity))
    #print (clarity)
    #print (json.dumps(clarity))

    #print ("Found html data: ")
    #print (html)

    #print (json.dumps(topics))
    #print (json.loads(json.dumps(topics)))

    data = {}
    data['coherence'] = json.loads(json.dumps(coherence))
    data['local'] = local
    data['clarity'] = json.loads(json.dumps(clarity))
    data['html'] = html_base64.decode("utf-8")

    #print ("data: ")
    #print (data)

    response = make_response(data, 200)
    response.mimetype = "application/json"
    response.headers["Content-Type"] = "application/json"

    return response    
