clear
python --version

if [ ! -d "./data/default_model" ]; then
  echo "Error: no model installed, please execute download and install a language model under ./data first"
  exit
fi

#export PYTHONPATH="/Library/Python/3.7/site-packages"
export FLASK_APP=app.py
export FLASK_ENV=development
export FLASK_DEBUG=0
python3 app.py
