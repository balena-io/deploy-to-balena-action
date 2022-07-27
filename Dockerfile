# https://hub.docker.com/_/node
FROM node:14.19.3-bullseye-slim as base

WORKDIR /app

ENV DEBIAN_FRONTEND noninteractive

# hadolint ignore=DL3008
RUN apt-get update && apt-get install --no-install-recommends -y \
    ca-certificates git jq wget unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY cli/package.json /tmp/cli-package.json

# Install balena-cli via standalone zip to save install time
RUN BALENA_CLI_VERSION="$(jq -r .dependencies.\"balena-cli\" /tmp/cli-package.json | cut -c2-)" && \
	wget -q -O balena-cli.zip "https://github.com/balena-io/balena-cli/releases/download/v${BALENA_CLI_VERSION}/balena-cli-v${BALENA_CLI_VERSION}-linux-x64-standalone.zip" && \
	unzip balena-cli.zip && rm balena-cli.zip /tmp/cli-package.json

FROM base AS dev

COPY *.json ./

# Install all dependencies required for building
RUN npm ci

FROM dev as build

COPY src/ src/

# Full build with dev dependencies
RUN npm run build

FROM base AS prod

# Copy built files and package files only
COPY --from=build /app/package*.json ./
COPY --from=build /app/build /app/build

# Add balena-cli to PATH
ENV PATH /app/balena-cli:$PATH

# Install production dependencies only
RUN balena version && npm ci --production

COPY entrypoint.sh /app/entrypoint.sh

# Start
ENTRYPOINT [ "/app/entrypoint.sh" ]
