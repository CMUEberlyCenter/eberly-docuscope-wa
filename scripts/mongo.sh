#!/bin/bash
# Connect to the MongoDB container.  Run from the repository root.
docker compose exec mongo mongosh myprose --authenticationDatabase admin --username $(cat secrets/mongo_user) --password $(cat secrets/mongo_pass)