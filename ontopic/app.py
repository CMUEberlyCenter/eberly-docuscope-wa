from typing import Any, Optional
from fastapi import FastAPI
from pydantic import BaseModel
from urllib.parse import unquote
from dslib.models.document import DSDocument
import dslib.views as views
from signal import SIGTERM

# import threading
# import platform

import logging

app = FastAPI(
  title="onTopic Tools",
  description="onTopic text analysis tools for generating sentence density and term matrix data for a given text.",
  version="2.0.0",
  license={
    'name': 'CC BY-NC-SA 4.0',
    'url': 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
  })

### Unused, to be removed
# @app.get("/api/v1/ping")
# async def ping():
#   """ Basic performance data.

#   Much of this information should not be publicly exposed in production environment.
#   """
#   # TODO response type (eg) html, json, text, etc.
#   # https://docs.python.org/3/library/threading.html
#   return f"""<html><body><table>
#   <tr><td>{psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2} MB</td></tr>
#   <tr><td>{threading.active_count()} threads</td></tr>
#   <tr><td>{platform.machine()}</td></tr>
#   <tr><td>{platform.version()}</td></tr>
#   <tr><td>{platform.platform()}</td></tr>
#   <tr><td>{platform.uname()}</td></tr>
#   <tr><td>{platform.system()}</td></tr>
#   <tr><td>{platform.processor()}</td></tr>
#   </table></body></html>"""

### Unused, to be removed, replace with prometheus library
# @app.get("/metrics")
# async def metrics():
#   pass

# class CustomTopic(BaseModel): # FIXME unused currently but needs to be specified.
#   """"""
#   lemma: str
#   topics: list[str]

class OnTopicRequest(BaseModel):
  """ onTopic input JSON. """
  base: str
  custom: Optional[str] = ""
  customStructured: Optional[list[str]] = []

type Lemma = list[str|bool|None|int]
class NounChunk(BaseModel):
  """ onTopic Clarity noun chunk data. """
  text: str
  start: int
  end: int

class SentenceData(BaseModel):
  """ onTopic Clarity sentence statistics. """
  NOUNS: int # total # of nouns
  HNOUNS: int # total # of head nouns
  L_HNOUNS: int # head nouns on the left
  R_HNOUNS: int # head nouns on the right
  L_NOUNS: list[Lemma] # nouns on the left
  R_NOUNS: list[Lemma] # nouns on the right
  MV_LINKS: int # total # of links fron the root verb
  MV_L_LINKS: int # total # of left links from the root veb
  MV_R_LINKS: int # total # of right links from the root verb
  V_LINKS: int # total # of links from all the non-root verbs
  V_L_LINKS: int # total # of left links from all the non-root verbs
  V_R_LINKS: int # total # of right links fromn all the non-root verbs
  NR_VERBS: int # total # of non-root verbs
  NPS: list[str]
  NUM_NPS: int # total # of NPs
  L_NPS: int
  R_NPS: int
  BE_VERB: bool
  NOUN_CHUNKS: list[NounChunk]
  MOD_CL: None | tuple[int, int, str, int] # [start, end, mod_cl, last_np]

class ClaritySentenceData(BaseModel):
  """ onTopic Clarity sentence lemma support data. """
  text: str
  text_w_info: list[Lemma]
  sent_analysis: SentenceData
  lemmas: list[Lemma]
  accum_lemmas: list[Lemma]
  given_lemmas: list[Lemma]
  new_lemmas: list[Lemma]
  given_accum_lemmas: list[Lemma]
  new_accum_lemmas: list[Lemma]

type ClarityData = str | tuple[int, int, SentenceData, ClaritySentenceData, bool]

class CoherenceParagraph(BaseModel):
  """ onTopic Coherence paragraph data. """
  first_left_sent_id: int
  is_left: bool
  is_topic_sent: bool
  para_pos: int

class CoherenceDatum(BaseModel):
  """ onTopic Coherence supporting data. """
  is_non_local: Optional[bool] = None
  is_topic_cluster: Optional[bool] = None
  paragraphs: list[CoherenceParagraph|None] = []
  sent_count: Optional[int]
  topic: list[str] = []

class CoherenceData(BaseModel):
  """ onTopic Coherence data. """
  error: Optional[str] = None
  data: list[CoherenceDatum] = []
  num_paras: int = 0
  num_topics: int = 0

class LocalSentenceData(BaseModel):
  """ onTopic local data item sentence data. """
  is_left: bool
  is_topic_sent: bool
  para_pos: int
  sent_pos: int

class LocalDatum(BaseModel):
  """ onTopic local data list item. """
  is_global: bool
  is_non_local: Optional[bool] = None
  is_topic_cluster: Optional[bool] = None
  num_sents: int
  sentences: list[LocalSentenceData|None] = []
  topic: list[str] = []

class LocalData(BaseModel):
  """ onTopic local data. """
  error: Optional[str] = None
  data: list[LocalDatum] = []

class OnTopicData(BaseModel):
  """ onTopic JSON data. """
  clarity: Optional[list[ClarityData]] = []
  coherence: Optional[CoherenceData] = None
  html: Optional[str] = ""
  html_sentences: Optional[list[list[str]]] = []
  local: Optional[list[LocalData]] = []

@app.post("/api/v2/ontopic")
async def ontopic(data: OnTopicRequest):
  """ Use onTopic to analyse the provided prose for coherence and clarity. """
  document = DSDocument()
  document.setMultiwordTopics([]) # FIXME should not be classmethod
  document.setUserDefinedSynonyms([]) # FIXME should not be classmethod
  document.loadFromHtmlString(f"<body>{data.base}</body>")

  coherence=document.generateGlobalVisData(2, 1, views.TOPIC_SORT_APPEARANCE)
  clarity=document.getSentStructureData()
  topics=document.getCurrentTopics()

  nrParagraphs=coherence.get('num_paras')
  if nrParagraphs:
    logging.info(f"Number of paragraphs processed: {nrParagraphs} (might be 1 for very short text)")
  else:
    logging.warning(f"Error obtaining number of paragraphs from {nrParagraphs}, setting to 0")
    nrParagraphs=0
  
  # Currently unused in visualization, reduce processing by not performing this analysis.
  local = [] #[LocalData.model_validate(document.generateGlobalVisData([i], 1, 2)) for i in range(1, nrParagraphs+1)]

  return OnTopicData(
    coherence = CoherenceData.model_validate(coherence),
    local = local,
    clarity = clarity,
    html = document.toHtml_OTOnly_DSWA(topics,-1),
    html_sentences = document.getHtmlSents(clarity)
  )

class SegmentRequest(BaseModel):
  """ segment request input JSON """
  text: str

@app.post("/api/v2/segment")
async def segment(data: SegmentRequest):
  """ Segment the given text into sentences.

  Returns the original text with added id attributes for paragraphs
  and spans with id attributes for deliminating the sentences.
  """
  document = DSDocument()
  document.loadFromHtmlString(f"<body>{data.text}</body>")
  return document.toXml()

# For production, start this with the following:
# > hypercorn app:app --bind 0.0.0.0:5000 --root-path /
# Following is for developement and can be used as follows:
# > python3 app.py
if __name__ == "__main__":
  logging.basicConfig(level=logging.INFO)
  import asyncio
  from hypercorn.asyncio import serve
  from hypercorn.config import Config
  config = Config()
  config.bind = ["0.0.0.0:5000"]
  config.loglevel = "info"
  asyncio.run(serve(app, config))
