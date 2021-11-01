# https://hub.docker.com/_/node
FROM node:15.14.0-alpine3.11

# Defines our working directory in container
WORKDIR /usr/src/app

# Copy all repository files to workdir
COPY . ./

# Install all dependencies, run build, purge dev dependencies
# hadolint ignore=DL3018
RUN apk add --no-cache git && \
    apk add --no-cache -t .build-deps \
        build-base \
        curl \
        linux-headers \
        python3 && \
    npm ci && npm run build && npm prune --production && \
    apk del --purge .build-deps

# Install balena binary in PATH
RUN ln -sf /usr/src/app/node_modules/balena-cli/bin/balena /usr/bin/balena && \
    balena version

# Start
ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]
