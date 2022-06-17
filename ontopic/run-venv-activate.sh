clear
echo "Activating virtual environment ..."
if [ ! -d "env" ]; then
  echo "Error: no virtual environment created, please excute ./run-venv-create.sh first"
  exit
fi
source ./env/bin/activate
which python
