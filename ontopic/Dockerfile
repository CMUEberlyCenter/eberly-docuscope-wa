# Regular image
FROM docker.io/python:3.7
# Small footprint image
#FROM python:3.7-alpine

COPY . /app
WORKDIR /app

# Expose the ports we're interested in
EXPOSE 5000
ENV FLASK_APP=app.py
ENV FLASK_ENV=development
ENV FLASK_DEBUG=0

RUN apt-get update && apt-get install -y --no-install-recommends apt-utils
RUN apt-get install ffmpeg libsm6 libxext6 -y

RUN pip install --upgrade pip
# For now we have to use an older version of Spacy because the language
# model was compiled for this one and won't work with 3>
RUN pip install flask psutil pathlib python-docx nltk beautifulsoup4 ftfy PyQt5 reportlab numpy pydocx unidecode spacy==2.3.5

RUN python -m spacy download en
RUN python -m nltk.downloader -d /usr/share/nltk_data stopwords

ENTRYPOINT ["python"]
CMD ["app.py"]
