clear
cat banner.txt

docker compose -f docker-compose.yml up -d --force-recreate --build --remove-orphans
