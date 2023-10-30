FROM docker.io/node:21
RUN mkdir -p /app
# ci in /tmp to take advantage of layer caching
WORKDIR /tmp
COPY ./package*.json /tmp/
RUN npm ci
RUN cp -a /tmp/node_modules /app
WORKDIR /app
COPY . /app
# TODO Setup workspaces to separate dependencies between server and application
# alternately set up SSR.
RUN npm run build
EXPOSE 8888
ENV PORT=8888
CMD [ "node", "server-express.mjs"]
