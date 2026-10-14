#!/bin/bash

# Default values
COMPOSE="docker compose -f compose.yaml -f compose.production.yaml"
ADMIN_PASSWORD_FILE=${ADMIN_PASSWORD_FILE:-./secrets/admin_password}
[ -z "${ADMIN_EMAIL_FILE+x}" ] && ADMIN_EMAIL_FILE=${ADMIN_EMAIL_FILE:-./secrets/admin_email}
[ -z "${ADMIN_PASSWORD_FILE+x}" ] && ADMIN_PASSWORD_FILE=${ADMIN_PASSWORD_FILE:-./secrets/admin_password}
[ -z "${ADMIN_PASSWORD+x}" ] && [ -f "${ADMIN_PASSWORD_FILE}" ] && ADMIN_PASSWORD=$(cat "$ADMIN_PASSWORD_FILE")
[ -z "${ADMIN_EMAIL+x}" ] && [ -f "${ADMIN_EMAIL_FILE}" ] && ADMIN_EMAIL=$(cat "$ADMIN_EMAIL_FILE")
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ROLE=${ROLE:-user}

# Parse command line arguments
SHORT_OPTS="h,d,u:,p,e:,r:"
LONG_OPTS="help,dev,username:,password,email:,role:"

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
      echo "  -u Username for the user"
      echo "  -p Prompt for password for the user"
      echo "  -e Email for the user"
      echo "  -r Role for the user: user or admin"
      echo "  -d Use development compose file (compose.yaml) instead of production compose file (compose.production.yaml)"
      shift
      ;;
    -u|--username)
      ADMIN_USERNAME="$2"
      shift 2
      ;;
    -p|--password)
      IFS= read -rs -p "Enter password: " ADMIN_PASSWORD
      echo
      shift
      ;;
    -e|--email)
      ADMIN_EMAIL="$2"
      shift 2
      ;;
    -r|--role)
      ROLE="$2"
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
      echo "  -u Username for the user"
      echo "  -p Prompt for password for the user"
      echo "  -e Email for the user"
      echo "  -r Role for the user: user or admin"
      echo "  -d Use development compose file (compose.yaml) instead of production compose file (compose.production.yaml)"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$ADMIN_EMAIL" ]]; then
  echo "Error: email is required. Use -e or --email to specify it or set the ADMIN_EMAIL environment variable."
  exit 1
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "Error: password is required. Use -p or --password to specify it or set the ADMIN_PASSWORD environment variable."
  exit 1
fi
if [[ -z "$ADMIN_USERNAME" ]]; then
  echo "Error: username is required. Use -u or --username to specify it or set the ADMIN_USERNAME environment variable."
  exit 1
fi
if [[ -z "$ROLE" ]]; then
  echo "Error: role is required. Use -r or --role to specify it or set the ROLE environment variable."
  exit 1
fi

# Create the admin user using the specified parameters
$COMPOSE -it frontend npx @auth@latest create-admin --email $ADMIN_EMAIL --password $ADMIN_PASSWORD --name $ADMIN_USERNAME --role $ROLE
