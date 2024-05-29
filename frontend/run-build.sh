clear
cat ../banner.txt
node -e "console.log(require('./package.json').version);"
rm -rf ./public/*

if [ ! -d "node_modules" ]; then
  echo "Error: no node_modules folder found, please execute 'npm ci'"
  exit
fi

npm run build
