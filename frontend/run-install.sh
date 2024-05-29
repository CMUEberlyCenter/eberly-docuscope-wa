clear
cat ../banner.txt
node -e "console.log(require('./package.json').version);"
npm ci
