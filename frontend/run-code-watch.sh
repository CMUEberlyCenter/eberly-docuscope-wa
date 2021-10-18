clear
cat ../banner.txt
cat ../.version

if [ ! -d "node_modules" ]; then
  echo "Error: no node_modules folder found, please execute 'run-prep.sh first"
  exit
fi

npm run start
