FROM node:latest

# ENV NODE_ENV=production

WORKDIR /app

# Setup some minimal files we'll need to get going
COPY ["package.json", "package-lock.json*", "./"]

# With the --production flag (or when the NODE_ENV environment variable is set to production), 
# npm will not install modules listed in devDependencies. To install all modules listed in 
# both dependencies and devDependencies when NODE_ENV environment variable is set to production, 
# you can use --production=false

#RUN npm install --production=false

RUN npm config set color false

#RUN ping -c 5 www.cnn.com

RUN ping -c 5 registry.npmjs.org

RUN npm install --loglevel info --color=false

COPY ./public ./public
COPY ./server-express.js ./
COPY ./.env ./

EXPOSE 8888

CMD [ "node", "server.js" ]
