clear
cat ../banner.txt
node -e "console.log(require('./package.json').version);"
rm -rfv ./dist/*
rm -rfv ./build
rm -rfv ./node_modules
