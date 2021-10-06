# DocuScope WA front-end codebase and Docker environment

## Development Usage

1. Clone this repo
2. Run `./run_prep.sh` to verify the download and install all the dependencies
3. Run `./run-code-watch.sh` to start webpack development server (starts on port 8888)
2. Run `./run-build.sh` to build the production code in ./dist
2. Run `./run-clean.sh` to remove the node_modules directory and clean up any stale files
2. Run `./run-docker-build.sh` call docker to build the Dockerfile into a runnable image
2. Run `./run-docker.sh` call docker to start a previously built image (does not do a build at this step)
