# https://hub.docker.com/_/node
FROM node:17.8.0-alpine3.15

# Defines our working directory in container
WORKDIR /usr/src/app

# Install all dependencies, run build, purge dev dependencies
# hadolint ignore=DL3018
RUN apk add --no-cache git && \
    apk add --no-cache -t .build-deps \
        build-base \
        curl \
        linux-headers \
        python3

# Copy package.json first for caching
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

# Install packages
RUN npm ci

# Copy rest of files (all) see we can build application 
# This is done in another step so dependencies have their own layer cached 
COPY . ./

# Build source and delete extra dependencies
RUN npm run build && npm run --production && \
	apk del --purge .build-deps

# Install balena binary in PATH
RUN ln -sf /usr/src/app/node_modules/balena-cli/bin/balena /usr/bin/balena && \
    balena version

# Start
ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]
