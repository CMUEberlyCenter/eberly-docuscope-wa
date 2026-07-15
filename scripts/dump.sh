#!/bin/bash

# Dump the myprose database from the MongoDB container.  Run at repository root.
docker compose exec -T mongo mongodump --authenticationDatabase admin --username $(cat secrets/mongo_user) --password $(cat secrets/mongo_pass) --db myprose --archive > myprose.dump