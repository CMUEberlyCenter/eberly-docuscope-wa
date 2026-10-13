#!/bin/bash

# Default values
COMPOSE="docker compose -f compose.yaml -f compose.production.yaml"
ADMIN_PASSWORD=$(cat ${ADMIN_PASSWORD_FILE:-./secrets/admin_password})
ADMIN_EMAIL=""
ADMIN_USERNAME="admin"

# Parse command line arguments
SHORT_OPTS="h,d,u:,p:,e:"
LONG_OPTS="help,dev,username:,password:,email:"

PARSED=$(getopt --options=$SHORT_OPTS --longoptions=$LONG_OPTS --name "$0" -- "$@")
if [[ $? -ne 0 ]]; then
  exit 1
fi
# Re-index postional parameters after parsing
eval set -- "$PARSED"

while true; do
  case "$1" in
    -h|--help)
      echo "Usage: $0 [-u username] [-p password] [-e email] [-d]"
      echo "  -u Username for the admin user"
      echo "  -p Password for the admin user"
      echo "  -e Email for the admin user"
      echo "  -d Use development compose file (compose.yaml) instead of production compose file (compose.production.yaml)"
      shift
      ;;
    -u|--username)
      ADMIN_USERNAME="$2"
      shift 2
      ;;
    -p|--password)
      ADMIN_PASSWORD="$2"
      shift 2
      ;;
    -e|--email)
      ADMIN_EMAIL="$2"
      shift 2
      ;;
    -d|--dev)
      COMPOSE="docker compose -f compose.yaml"
      shift
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Usage: $0 [-u username] [-p password] [-e email] [-d]"
      echo "  -u Username for the admin user"
      echo "  -p Password for the admin user"
      echo "  -e Email for the admin user"
      echo "  -d Use development compose file (compose.yaml) instead of production compose file (compose.production.yaml)"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$ADMIN_EMAIL" ]]; then
  echo "Error: Admin email is required. Use -e or --email to specify it or set the ADMIN_EMAIL environment variable."
  exit 1
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "Error: Admin password is required. Use -p or --password to specify it or set the ADMIN_PASSWORD environment variable."
  exit 1
fi
if [[ -z "$ADMIN_USERNAME" ]]; then
  echo "Error: Admin username is required. Use -u or --username to specify it or set the ADMIN_USERNAME environment variable."
  exit 1
fi

# Create the admin user using the specified parameters
$COMPOSE -it frontend npx @auth@latest create-admin --email $ADMIN_EMAIL --password $ADMIN_PASSWORD --name $ADMIN_USERNAME --role admin
