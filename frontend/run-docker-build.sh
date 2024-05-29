clear
cat ../banner.txt
node -e "console.log(require('./package.json').version);"
docker build . --network="host" --tag=dswa-frontend
