clear

# https://blog.devart.com/mysql-backup-tutorial.html
# mysqldump -u [user name] –p [password] -h [host name] [options] [database_name] [tablename] > [dumpfilename.sql]

if [ $# -eq 0 ] 
then
  echo "No arguments supplied. Please provide the container id and the admin MySQL password"
  exit 1
fi

if [ ! "$(docker ps -a | grep $1)" ] 
then
  echo "The container with id %1 does not exist"
  exit 1
fi


dt=$(date '+%d-%m-%Y');
echo "Using time stamp: $dt"

backup="./db-backup-$dt.sql"

#docker exec $1 mysqldump --help
docker exec $1 mysqldump --verbose --user dswa --host dswadb -p"$2" dswa > $backup
