FROM docker.io/node:22 AS base
RUN mkdir -p /app

FROM base AS build
# ci in /tmp to take advantage of layer caching
WORKDIR /tmp
COPY ./package*.json /tmp/
RUN npm ci
RUN cp -a /tmp/node_modules /app
WORKDIR /app
COPY . /app
RUN npm run build

FROM base
EXPOSE 8888
ENV PORT=8888
WORKDIR /app
COPY ./package.json .
COPY --from=build /app/build /app/build
CMD [ "node", "build/server/index.js"]
