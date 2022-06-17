# https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/

clear
echo "Creating virtual environment ..."
if [ -d "env" ]; then
  echo "Error: a virtual environment already exists, aborting"
  exit
fi
python3 -m venv env
