clear
cat banner.txt

docker-compose -f docker-compose.yml up --force-recreate --build --remove-orphans
