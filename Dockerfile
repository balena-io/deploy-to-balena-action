# Container image that runs your code
FROM node:12-alpine

RUN apk add --no-cache -t .build-deps \
        build-base \
        curl \
        git \
        linux-headers \
        python3 && \
    npm install balena-cli -g --production --unsafe-perm && \
    apk del --purge .build-deps

# Fail early if balena binary won't run
RUN balena --version

# Defines our working directory in container
WORKDIR /usr/src/app

# Copies the package.json first for better cache on later pushes
COPY package*.json ./

# Install dependencies
RUN npm ci

# TODO: only install required dep not dev as well. Dev is needed for the build script though (tsc).

# This will copy all files in our root to the working directory in the container
COPY . ./

# Build TS project
# We don't run lint checks or tests because this image is built
# on every invocation of the github action is running so they add time to complete the action
RUN npm run build

# Start
ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]