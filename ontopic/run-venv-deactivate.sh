# https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/

clear
echo "Deactivating virtual environment ..."
if [ ! -d "env" ]; then
  echo "Error: no virtual environment created, please excute ./run-venv-create.sh first"
  exit
fi
deactivate
which python
