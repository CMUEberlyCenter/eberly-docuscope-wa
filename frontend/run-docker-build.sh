clear
cat ../banner.txt
cat ../.version
sudo docker build . --network="host" --tag=gallery-frontend
