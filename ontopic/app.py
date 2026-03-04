"""onTopic Web API"""

import logging
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, Header, Request, Response
from langcodes import tag_is_valid, closest_supported_match
from pydantic import AfterValidator, BaseModel, Field

from localization.NLP import NLP_MODELS, Locale
from ds_document import DSDocument, TopicSort

app = FastAPI(
    title="onTopic Tools",
    description="onTopic text analysis tools for generating sentence density "
    "and term matrix data for a given text.",
    version="2.1.0",
    license={
        "name": "CC BY-NC-SA 4.0",
        "url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    },
)


app.state.nlp_models = NLP_MODELS

# Unused, to be removed, replace with prometheus library
# @app.get("/metrics")
# async def metrics():
#   pass


class OnTopicRequest(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic input JSON."""

    base: Annotated[str, Field(description="The HTML fragment string to be analysed.")]
    custom: Annotated[
        Optional[str],
        Field(description="Custom settings for the analysis", deprecated=True),
    ] = None
    customStructured: Annotated[
        Optional[list[str]],
        Field(
            description="Custom structured settings for the analysis", deprecated=True
        ),
    ] = None


type Lemma = list[str | bool | None | int]


class NounChunk(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic Clarity noun chunk data."""

    text: str
    start: int
    end: int


class Token(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic sentence Tokens."""

    text: Annotated[str, Field(description="The text of the token")]
    is_root: Annotated[
        bool, Field(description="Whether the token is the root of the sentence")
    ]


class SentenceData(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic Clarity sentence statistics."""

    NOUNS: Annotated[int, Field(description="Total number of nouns in the sentence")]
    HNOUNS: Annotated[
        int, Field(description="Total number of head nouns in the sentence")
    ]
    L_HNOUNS: Annotated[
        int, Field(description="Head nouns on the left side of the main verb")
    ]
    R_HNOUNS: Annotated[
        int, Field(description="Head nouns on the right side of the main verb")
    ]
    L_NOUNS: Annotated[
        list[Lemma],
        Field(description="List of noun lemmas on the left side of the main verb"),
    ]
    R_NOUNS: Annotated[
        list[Lemma],
        Field(description="List of noun lemmas on the right side of the main verb"),
    ]
    MV_LINKS: Annotated[
        int, Field(description="Total number of links from the root verb")
    ]
    MV_L_LINKS: Annotated[
        int, Field(description="Total number of left links from the root verb")
    ]
    MV_R_LINKS: Annotated[
        int, Field(description="Total number of right links from the root verb")
    ]
    V_LINKS: Annotated[
        int, Field(description="Total number of links from all the non-root verbs")
    ]
    V_L_LINKS: Annotated[
        int, Field(description="Total number of left links from all the non-root verbs")
    ]
    V_R_LINKS: Annotated[
        int,
        Field(description="Total number of right links from all the non-root verbs"),
    ]
    NR_VERBS: Annotated[int, Field(description="Total number of non-root verbs")]
    NPS: list[str]
    NUM_NPS: Annotated[int, Field(description="Total number of noun phrases")]
    L_NPS: Annotated[
        int,
        Field(description="Number of noun phrases on the left side of the main verb"),
    ]
    R_NPS: Annotated[
        int,
        Field(description="Number of noun phrases on the right side of the main verb"),
    ]
    BE_VERB: Annotated[
        bool, Field(description="Whether the sentence contains a be verb")
    ]
    HEADING: Annotated[bool, Field(description="Whether the sentence is a heading")]
    NOUN_CHUNKS: list[NounChunk]
    TOKENS: list[Token]
    MOD_CL: None | tuple[int, int, str, int]  # [start, end, mod_cl, last_np]


class ClaritySentenceData(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic Clarity sentence lemma support data."""

    text: str
    text_w_info: list[Lemma]
    sent_analysis: SentenceData
    lemmas: list[Lemma]
    accum_lemmas: list[Lemma]
    given_lemmas: list[Lemma]
    new_lemmas: list[Lemma]
    given_accum_lemmas: list[Lemma]
    new_accum_lemmas: list[Lemma]


type ClarityData = str | tuple[int, int, ClaritySentenceData, bool]


class CoherenceParagraph(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic Coherence paragraph data."""

    first_left_sent_id: int
    is_left: bool
    is_topic_sent: bool
    para_pos: int


class CoherenceDatum(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic Coherence supporting data."""

    is_non_local: Optional[bool] = None
    is_topic_cluster: Optional[bool] = None
    paragraphs: list[CoherenceParagraph | None] = []
    sent_count: Optional[int]
    topic: list[str] = []


class CoherenceData(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic Coherence data."""

    error: Optional[str] = None
    data: list[CoherenceDatum] = []
    num_paras: int = 0
    num_topics: int = 0


class LocalSentenceData(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic local data item sentence data."""

    is_left: bool
    is_topic_sent: bool
    para_pos: int
    sent_pos: int


class LocalDatum(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic local data list item."""

    is_global: bool
    is_non_local: Optional[bool] = None
    is_topic_cluster: Optional[bool] = None
    num_sents: int
    sentences: list[LocalSentenceData | None] = []
    topic: list[str] = []


class LocalData(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic local data."""

    error: Optional[str] = None
    data: list[LocalDatum] = []


class OnTopicData(BaseModel):  # pylint: disable=too-few-public-methods
    """onTopic JSON data."""

    clarity: Annotated[
        Optional[list[ClarityData]],
        Field(description="Clarity analysis data for each sentence"),
    ] = []
    coherence: Annotated[
        Optional[CoherenceData], Field(description="Coherence analysis data")
    ] = None
    html: Annotated[
        Optional[str],
        Field(description="The annotated HTML output of the original text."),
    ] = ""
    html_sentences: Optional[list[list[str]]] = []
    local: Optional[list[LocalData]] = []


def validate_language(lang: Optional[str]) -> str:
    """Validate the language tag and return a standardized version."""
    if lang is None or lang == "*":
        return "en"
    if not tag_is_valid(lang):
        raise ValueError(f"Invalid language tag: {lang}")
    match = closest_supported_match(lang, app.state.nlp_models.keys())
    if match is None:
        raise ValueError(f"Unsupported language: {lang}")
    return match


def get_locale(request: Request) -> Locale:
    """Get the appropriate NLP model based on the Accept-Language header."""
    accept_language = request.headers.get("Accept-Language", "en")
    try:
        lang = validate_language(accept_language)
    except ValueError as e:
        logging.warning(f"Language validation error: {e}, defaulting to 'en'")
        lang = "en"
    return request.app.state.nlp_models.get(lang, request.app.state.nlp_models["en"])


@app.post("/api/v2/ontopic")
async def ontopic(
    response: Response,
    data: OnTopicRequest,
    accept_language: Annotated[
        Optional[str], Header(), AfterValidator(validate_language)
    ] = "en",
    locale=Depends(get_locale),
) -> OnTopicData:
    """Analyse the posted prose for coherence and clarity."""
    logging.info(f"Received onTopic request for language: {accept_language}")
    document = DSDocument(locale=locale)
    document.loadFromHtmlString(f"<body>{data.base}</body>")

    coherence = document.generateGlobalVisData(2, 1, TopicSort.APPEARANCE)
    clarity = document.getSentStructureData()
    # Remove redundant data as it is unexpected in the frontend.
    clarity_data: list[ClarityData] = [
        d[:2] + d[3:] if isinstance(d, tuple) else d for d in clarity
    ]
    topics = document.getCurrentTopics()

    num_paragraphs = coherence.get("num_paras")
    if num_paragraphs:
        logging.info(
            "Number of paragraphs processed: %d (might be 1 for very short text)",
            num_paragraphs,
        )
    else:
        logging.warning(
            "Error obtaining number of paragraphs from %d, setting to 0", num_paragraphs
        )
        num_paragraphs = 0

    # Currently unused in visualization,
    #  reduce processing by not performing this analysis.
    # [LocalData.model_validate(document.generateGlobalVisData([i], 1, 2))
    #  for i in range(1, nrParagraphs+1)]
    local = []

    response.headers["Content-Language"] = accept_language or "en"
    return OnTopicData(
        coherence=CoherenceData.model_validate(coherence),
        local=local,
        clarity=clarity_data,
        html=document.toHtml(topics, -1),
        html_sentences=document.getHtmlSents(clarity),
    )


class SegmentRequest(BaseModel):  # pylint: disable=too-few-public-methods
    """segment request input JSON"""

    text: str


@app.post("/api/v2/segment")
async def segment(
    response: Response,
    data: SegmentRequest,
    accept_language: Annotated[
        Optional[str], Header(), AfterValidator(validate_language)
    ] = "en",
    locale: Locale = Depends(get_locale),
) -> str:
    """Segment the given text into sentences.

    Returns the original text with added id attributes for paragraphs
    and spans with id attributes for deliminating the sentences.
    """
    logging.info(f"Received segment request for language: {accept_language}")
    with locale.nlp.memory_zone():
        document = DSDocument(locale=locale)
        document.loadFromHtmlString(f"<body>{data.text}</body>")
    response.headers["Content-Language"] = accept_language or "en"
    return document.toXml()


@app.get("/api/v2/languages")
async def languages() -> list[str]:
    """Return the list of supported languages."""
    return list(app.state.nlp_models.keys())

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
    asyncio.run(serve(app, config)) # type: ignore
