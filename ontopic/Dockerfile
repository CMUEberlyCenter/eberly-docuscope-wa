FROM docker.io/python:3.7 AS base
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONFAULTHANDLER=1
RUN apt-get update && apt-get install -y --no-install-recommends apt-utils gcc ffmpeg libsm6 libxext6

FROM base AS deps
RUN pip install --upgrade pip
RUN pip install pipenv
COPY ./Pipfile .
COPY ./Pipfile.lock .
RUN PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy

FROM base AS runtime
ENV PYTHONOPTIMIZE=2
ENV PATH="/.venv/bin:$PATH"
RUN useradd --create-home appuser
COPY --from=deps /.venv /.venv
RUN python -m spacy download en
RUN python -m nltk.downloader -d /usr/share/nltk_data stopwords
USER appuser
WORKDIR /home/appuser
COPY . .

# Expose the ports we're interested in
EXPOSE 5000

# For now we have to use an older version of Spacy because the language
# model was compiled for this one and won't work with 3>
# RUN pip install spacy==2.3.5


# RUN export FLASK_APP=app.py
# RUN export FLASK_ENV=development
# RUN export FLASK_DEBUG=0

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
