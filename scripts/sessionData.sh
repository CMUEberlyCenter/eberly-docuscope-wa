#!/bin/bash
# Run the session data aggregation script.  Run from the repository root.
docker compose exec -iT mongo mongosh myprose --authenticationDatabase admin --username $(cat secrets/mongo_user) --password $(cat secrets/mongo_pass) --quiet < scripts/sessionData.js
