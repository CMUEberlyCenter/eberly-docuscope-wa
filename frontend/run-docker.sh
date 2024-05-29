clear
cat ../banner.txt
node -e "console.log(require('./package.json').version);"
docker run  --network="host" -i dswa-frontend
