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
from dslib.models.synonym import DSSynset

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
  # So in general we have to test 4 cases:
  # - A garbage text
  # - A text where the back-end will find some unrelated topics regardless of what is defined in the rules and clusters
  # - A text where the back-end will find pre-defined topics and some unrelated topics
  # - A text where the back-end will find pre-defined topics, custom topics and unrelated topics
  # 
  ##
  def ontopic (self,request):    
    print ('ontopic()')

    envelope=request.get_json()

    #print (envelope)

    data=envelope ["data"]
    raw=data["base"]
    customString=data["custom"]
    customTopics=data["customStructured"];
    custom="";

    print (customTopics)

    # Load and process the non-structured semi-colon separated list of topics. We will
    # remove this once the structured version works well

    if (isinstance(customString, str)):
      custom = customString.split(";")

    decoded=base64.b64decode(raw).decode('utf-8')
    unescaped=unquote(decoded)

    multiword_topics = list();
    synsets = list ()

    for topic in customTopics:      
      lemma = topic ["lemma"]
      topics = topic ["topics"]
      # Create a DSSynset object
      sd = { "lemma": lemma, "synonyms": topics}
      ss = DSSynset (synset_dict=sd)
      for t in topics:
        if ' ' in t:
          multiword_topics.append(t)

    # We should now be ready to start processing text

    document=DSDocument ()

    # New method, using the structured approach so that we can tie results back to topic clusters
    document.setMultiwordTopics(multiword_topics)
    document.setUserDefinedSynonyms(synsets)
    document.loadFromTxt (unescaped)

    # Old method, using the linear list
    #document.setUserDefinedTopics (custom);

    coherence=document.generateGlobalVisData (2,1,views.TOPIC_SORT_APPEARANCE)
    clarity=document.getSentStructureData()
    topics=document.getCurrentTopics ()
    html=document.toHtml_OTOnly_DSWA(topics,-1)
    html_sentences=document.getHtmlSents (clarity);

    # https://stackabuse.com/encoding-and-decoding-base64-strings-in-python/
    #html_bytes = html.encode('utf-8')
    #html_base64 = base64.b64encode(html_bytes)
    #html_base64 = base64.b64encode(html.encode('utf-8'));

    # If there is not enough text to process or if there aren't enough results the coherence data might
    # result to be: {'error': 'ncols is 0'}

    nrParagraphs=coherence.get ('num_paras');

    if nrParagraphs:
      print ("Number of paragraphs processed: " + str(nrParagraphs) + " (might be 1 for very short text)");
    else:
      print ("Error obtaining nr of paragraphs, setting to 0")
      nrParagraphs=0;
 
    local=[]

    for i in range(nrParagraphs):
      localSelected=[];
      localSelected.append(i+1);
      localDict=document.generateLocalVisData (localSelected,1,2);
      local.append (localDict);

    data = {}
    data['coherence'] = json.loads(json.dumps(coherence))
    data['local'] = local
    data['clarity'] = json.loads(json.dumps(clarity))
    data['html'] = base64.b64encode(html.encode('utf-8')).decode("utf-8")
    #data['html_sentences'] = base64.b64encode(html_sentences.encode('utf-8')).decode("utf-8")
    data['html_sentences'] = json.loads(json.dumps(html_sentences))

    #print ("data: ")
    #print (data)

    response = make_response(data, 200)
    response.mimetype = "application/json"
    response.headers["Content-Type"] = "application/json"

    return response    
