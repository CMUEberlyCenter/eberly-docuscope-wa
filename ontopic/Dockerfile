FROM docker.io/python:3.13 AS base
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONFAULTHANDLER=1
RUN apt-get update && apt-get install -y --no-install-recommends apt-utils gcc ffmpeg libsm6 libxext6

FROM base AS deps
RUN pip install --upgrade pip setuptools wheel
RUN pip install pipenv
COPY ./Pipfile .
COPY ./Pipfile.lock .
RUN PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy

FROM base AS runtime
LABEL org.opencontainers.image.description="onTopic service"
LABEL org.opencontainers.image.licenses=CC-BY-NC-SA-4.0
ENV PYTHONOPTIMIZE=2
ENV PATH="/.venv/bin:$PATH"
RUN useradd --create-home appuser
COPY --from=deps /.venv /.venv
RUN python -m spacy download en_core_web_sm
# RUN python -m nltk.downloader -d /usr/share/nltk_data stopwords
USER appuser
WORKDIR /home/appuser
COPY . .

# Expose the ports we're interested in
EXPOSE 5000
CMD ["hypercorn", "-b", "0.0.0.0:5000", "--root-path", "/", "app:app"]
