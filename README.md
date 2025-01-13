# DocuScope Write & Audit

# Administration and Support

For any questions regarding overall project or the language model used, please contact suguru@cmu.edu

The project code is supported and maintained by the [Eberly Center](https://www.cmu.edu/teaching/) at [Carnegie Mellon University](www.cmu.edu). For help with this project or service please contact eberly-assist@andrew.cmu.edu.

# Setup

This application requires several files in order to function:
- Required sensitive information shared with the application via [Docker secrets](https://docs.docker.com/compose/how-tos/use-secrets/):
  - `secrets/anthropic_api_key`: API key provided by Anthropic (default model is claude-3-5-sonnet-20241022)
  - `secrets/mongo_user`: Username to use to access the MongoDB database.
  - `secrets/mongo_pass`: Password to use to access the MongoDB database.
  - `secrets/token`: LTI token.
- Required system files:
  - `private/templates.json`: LLM Prompt templates 
  - `private/writing_tasks/**`: Writing task specification files available to all users.

## Latest stable build using Docker

1. Copy [docker-compose-production.yml](docker-compose-production.yml).
2. Setup required files as specified above.
3. Run `docker compose -f docker-compose-production.yml up -d` to start the application.
4. This web application is configured to use port 8888.

## Building from source using Docker

1. Clone this repository.
2. Setup required files as specified above.
2. From the project's root directory execute `docker compose up -d --build`
4. This web application is configured to use port 8888.

## Using from source without Docker for development
This requires that the following are installed or otherwise available:
- [NodeJS](https://nodejs.org/) >=22.0
- [Python](https://www.python.org/) >=3.12
- [MongoDB](https://www.mongodb.com/) >=8.0

1. Clone this repository.
2. Set the following environment variables:
  - ANTHROPIC_API_KEY: API key provided by Anthropic.
  - LTI_KEY: Key use for LTI token generation.
  - MONGO_HOST: hostname of a running MongoDB (default: "localhost:27017").
  - MONGO_DB: MongoDB database name (default: "myprose").
  - MONGO_USER: MongoDB username.
  - MONGO_PASSWORD: MongoDB password for the given username.
  - PORT: Port to use for application (default: 8888)
  - SCRIBE_TEMPLATES: path to the prompt templates file (default: "private/templates.json").
  - WRITING_TASKS: path to the writing task specifications (default: "private/platforms/")
3. Start the MongoDB server.
4. Start onTopic service in the `ontopic/` directory:
  1. Use [pipenv](https://pipenv.pypa.io/) to install dependencies: `pipenv install`
  2. Start service: `pipenv run python app.py`
5. Start the application in the `frontend/` directory:
  1. Install dependencies: `npm ci`
  2. Build interface: `npm run build:client`
  3. Start service: `npm run dev:server`

# Acknowledgements

This project was partially funded by the A.W. Mellon Foundation, Carnegie Mellon’s Simon Initiative Seed Grant and Berkman Faculty Development Fund.
