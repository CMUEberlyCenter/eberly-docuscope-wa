#!/bin/bash

COMPOSE="docker compose -f compose.yaml -f compose.production.yaml"

while getops "pd" opt; do
  case " ${opt} " in
    p)
      # Prompt for admin credentials
      read -p "Enter admin email: " ADMIN_EMAIL
      read -sp "Enter admin password: " ADMIN_PASSWORD
      echo
      read -p "Enter admin username: " ADMIN_USERNAME
      ;;
    d)
      # Use default admin credentials
      COMPOSE="docker compose -f compose.yaml"
    *)
      echo "Usage: $0 [-p] [-d]"
      echo "  -p Prompt for admin credentials"
      echo "  -d Use development compose file (compose.yaml) instead of production compose file (compose.production.yaml)"
      exit 1
      ;;
  esac
done
shift $((OPTIND -1))

$COMPOSE -it frontend npx @auth@latest create-admin --email $ADMIN_EMAIL --password $ADMIN_PASSWORD --name $ADMIN_USERNAME --role admin
