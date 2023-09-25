#FROM node:latest
FROM docker.io/node:latest

# ENV NODE_ENV=production

COPY . /app
COPY .env /app/.env
WORKDIR /app

# With the --production flag (or when the NODE_ENV environment variable is set to production), 
# npm will not install modules listed in devDependencies. To install all modules listed in 
# both dependencies and devDependencies when NODE_ENV environment variable is set to production, 
# you can use --production=false

#RUN npm install --production=false

RUN npm config set color false

RUN npm ci --loglevel info --color=false

RUN sed -e "s/<now>/$(date)/g" < ./js/global.ts.template > ./js/global.ts

RUN npm run build

EXPOSE 8888

RUN node --version

CMD [ "node", "server-express.js" ]
