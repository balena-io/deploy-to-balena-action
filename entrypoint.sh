#!/bin/sh

BALENARC_BALENA_URL=${BALENA_URL}

export BALENARC_BALENA_URL

[ -z "$BALENA_TOKEN" ] && echo "BALENA_TOKEN input cannot be empty" && exit 1

balena login --token ${BALENA_TOKEN}

if [ $? -eq 1 ]; then
  echo Failed to authenticate CLI
  exit 1
fi

balena whoami

git --version

exec node /usr/src/app/build/main.js
