# Regular image
FROM docker.io/python:3.7
# Small footprint image
#FROM python:3.7-alpine

COPY . /app
WORKDIR /app

# Expose the ports we're interested in
EXPOSE 5000

RUN apt-get update && apt-get install -y --no-install-recommends apt-utils
RUN apt-get install ffmpeg libsm6 libxext6 -y

RUN pip install --upgrade pip
RUN pip install flask
RUN pip install psutil
RUN pip install pathlib
RUN pip install python-docx
RUN pip install nltk
RUN pip install beautifulsoup4
RUN pip install ftfy
RUN pip install PyQt5
RUN pip install reportlab
RUN pip install numpy
RUN pip install pydocx
RUN pip install unidecode

# For now we have to use an older version of Spacy because the language
# model was compiled for this one and won't work with 3>
RUN pip install spacy==2.3.5

RUN python -m spacy download en
RUN python -m nltk.downloader -d /usr/share/nltk_data stopwords

RUN export FLASK_APP=app.py
RUN export FLASK_ENV=development
RUN export FLASK_DEBUG=0

ENTRYPOINT ["python"]
CMD ["app.py"]
