clear
cat banner.txt

cd ./frontend
./run-build.sh
cd ..

if [ ! -f ".env" ]; then
  echo "Error: .env file found, please configure the environment first"
  exit
fi

if [ -z ${MYSQL_UID+x} ]; 
then 
  echo "var is MYSQL_UID unset, setting ...";
  MYSQL_UID=$(id -u)
fi

if [ -z ${MYSQL_GID+x} ]; 
then 
  echo "var is MYSQL_GID unset, setting ...";
  MYSQL_GID=$(id -g)
fi

echo "Configuring db for: $MYSQL_UID:$MYSQL_GID ..."

mkdir -pv ./dswadb

echo "Starting docker-compose ..."

MYSQL_UID=$MYSQL_UID docker-compose -f docker-compose-dev.yml up --force-recreate --build --remove-orphans