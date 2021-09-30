#!/bin/sh

BALENARC_BALENA_URL=${BALENA_URL}

export BALENARC_BALENA_URL

balena login --token ${BALENA_TOKEN}

balena whoami

git --version

exec node /usr/src/app/build/main.js
