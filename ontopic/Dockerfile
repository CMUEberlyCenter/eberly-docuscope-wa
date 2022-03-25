# Regular image
FROM python:3.7
# Small footprint image
#FROM python:3.7-alpine

COPY . /app
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends apt-utils

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN python -m spacy download en
RUN python -m nltk.downloader -d /usr/share/nltk_data stopwords
ENTRYPOINT ["python"]
CMD ["app.py"]
