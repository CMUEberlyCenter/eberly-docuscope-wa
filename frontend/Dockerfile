FROM docker.io/oven/bun:slim AS base
RUN mkdir -p /app
ENV NODE_ENV=production
WORKDIR /app

FROM base AS install
RUN mkdir -p /tmp/dev
RUN mkdir -p /tmp/prod
COPY ./package*.json /tmp/dev
COPY ./package*.json /tmp/prod
COPY ./bun.lock* /tmp/dev
COPY ./bun.lock* /tmp/prod
RUN cd /tmp/dev && bun install --frozen-lockfile
RUN cd /tmp/prod && bun install --production --frozen-lockfile

FROM base AS prerelease
COPY --from=install /tmp/dev/node_modules node_modules
COPY . .
RUN bun run build
RUN bun run build:server

FROM docker.io/node:25-slim AS release
# Using node image as bun image has had issues with native modules in some cases
# TODO: check if bun can be used directly here with ltijs security module and other native modules
LABEL org.opencontainers.image.description="myProse web application"
LABEL org.opencontainers.image.licenses=CC-BY-NC-SA-4.0
EXPOSE 8888
ENV PORT=8888
WORKDIR /app
COPY --from=install /tmp/prod/node_modules node_modules
COPY --from=prerelease /app/dist/ ./dist/
COPY --from=prerelease /app/build/ ./build/
COPY --from=prerelease /app/public/ ./public/
COPY --from=prerelease /app/package.json ./package.json
CMD [ "node", "build/server/index.js" ]
