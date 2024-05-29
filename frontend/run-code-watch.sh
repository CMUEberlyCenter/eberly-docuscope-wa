clear
cat ../banner.txt
node -e "console.log(require('./package.json').version);"

if [ ! -d "node_modules" ]; then
  echo "Error: no node_modules folder found, please execute 'run-prep.sh first"
  exit
fi

npm run watch:client
