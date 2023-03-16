clear
cat ../banner.txt

if [ ! -d "./data/default_model" ]; then
  echo "Error: no model installed, please execute download and install a language model under ./data first"
  exit
fi

docker build -t docuscope-wa-ontopic . --no-cache
