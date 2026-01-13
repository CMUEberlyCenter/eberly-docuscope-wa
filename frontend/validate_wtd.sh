#!/usr/bin/env bash
set -e
shopt -s globstar
OPTIND=1

while getopts "d:" opt; do
  case "$opt" in
    d) WRITING_TASKS=$OPTARG
       ;;
    ?) echo "Usage: $0 [-d writing_tasks_directory]"
       exit 0
       ;;
  esac
done
shift $((OPTIND-1))

if ! command -v npx &> /dev/null
then
    echo "npx could not be found, please install Node.js and npm (https://nodejs.org/)."
    exit 1
fi
if ! command -v jq &> /dev/null
then
    echo "jq could not be found, please install jq (https://jqlang.org/)."
    exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color - resets to default

declare -A seen_ids

# find ${WRITING_TASKS} -name \*.json -exec npx ajv-cli validate -s src/lib/WritingTask.schema.json -d {} \;
for file in ${WRITING_TASKS}/**/*.json; do
  valid=`npx ajv-cli validate -s src/lib/WritingTask.schema.json -d "${file}"`
  if [[ $valid =~ " valid" ]]; then
    echo -e "${GREEN}Valid file:${NC} ${file}"
  else
    echo -e "${RED}Invalid file:${NC} ${file}"
    exit 1
  fi
  id=`jq ".info.id" "${file}"`
  if [[ "$id" == "null" ]]; then
    echo -e "  ${YELLOW}Missing info.id in file:${NC} ${file}"
  else
    if [[ -n "${seen_ids[$id]}" ]]; then
      echo -e "${RED}Duplicate ID found:${NC} ${id}"
      exit 1
    fi
    if [[ "$id" =~ ^\"[a-zA-Z0-9_-]+\"$ ]]; then
      echo -e "  ${GREEN}Valid ID:${NC} ${id}"
    else
      echo -e "  ${RED}Invalid ID:${NC} ${id} in file: ${file}"
      exit 1
    fi
    seen_ids[$id]=1
  fi
done
