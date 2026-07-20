FROM docker.io/node:26-slim AS base
RUN mkdir -p /app
WORKDIR /app

FROM base AS install
RUN mkdir -p /tmp/dev
RUN mkdir -p /tmp/prod
COPY ./package*.json /tmp/dev
COPY ./package*.json /tmp/prod
COPY ./patches /tmp/dev/patches
COPY ./patches /tmp/prod/patches
RUN cd /tmp/dev && npm ci
RUN cd /tmp/prod && npm ci --omit=dev

FROM base AS build
COPY --from=install /tmp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build
RUN npm run build:server

FROM base AS release
LABEL org.opencontainers.image.description="myProse web application"
LABEL org.opencontainers.image.licenses=CC-BY-NC-SA-4.0
EXPOSE 8888
ENV PORT=8888
ENV NODE_ENV=production
WORKDIR /app
COPY --from=install /tmp/prod/node_modules node_modules
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/build/ ./build/
COPY --from=build /app/public/ ./public/
COPY --from=build /app/package.json ./package.json
CMD [ "node", "build/server/index.js" ]
