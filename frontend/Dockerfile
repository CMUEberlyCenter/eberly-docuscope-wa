FROM docker.io/node:25-slim AS base
RUN mkdir -p /app
ENV NODE_ENV=production

FROM base AS build
# ci in /tmp to take advantage of layer caching
WORKDIR /tmp
COPY ./package*.json /tmp/
RUN npm ci
RUN npx -y bun ci
RUN cp -a /tmp/node_modules /app
WORKDIR /app
COPY . /app
RUN npm run build
RUN npm run build:server

FROM base
LABEL org.opencontainers.image.description="myProse web application"
LABEL org.opencontainers.image.licenses=CC-BY-NC-SA-4.0
EXPOSE 8888
ENV PORT=8888
WORKDIR /app
COPY ./package.json .
COPY --from=build /app/dist/ /app/dist/
COPY --from=build /app/build/ /app/build/
COPY --from=build /app/public/ /app/public/
CMD [ "node", "build/server/index.js" ]
