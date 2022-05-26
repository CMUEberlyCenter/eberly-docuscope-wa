clear
cat ../banner.txt
cat ../.version
docker build . --network="host" --tag=gallery-frontend
