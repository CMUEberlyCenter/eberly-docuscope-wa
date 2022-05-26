clear
cat ../banner.txt
cat ../.version
rm ./public/*

if [ ! -d "node_modules" ]; then
  echo "Error: no node_modules folder found, please execute 'run-prep.sh first"
  exit
fi

npm run build
