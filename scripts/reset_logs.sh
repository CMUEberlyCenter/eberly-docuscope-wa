#!/bin/bash
# Reset the logging collection in the myprose database.  Run from the repository root.
docker compose exec mongo mongosh myprose --eval "db.logging.deleteMany({})" --authenticationDatabase admin --username $(cat secrets/mongo_user) --password $(cat secrets/mongo_pass)