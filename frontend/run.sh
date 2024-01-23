clear
cat ../banner.txt
cat ../.version

if [ ! -f ".env" ]; then
  echo "Error: .env file found, please configure the environment first"
  exit
fi

if [ ! -d "node_modules" ]; then
  echo "Error: no node_modules folder found, please execute 'run-prep.sh first"
  exit
fi

npm dev:server
