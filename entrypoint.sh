#!/bin/sh

BALENARC_BALENA_URL=${BALENA_URL}

export BALENARC_BALENA_URL

set -e

[ -z "${BALENA_TOKEN}" ] && echo "BALENA_TOKEN input cannot be empty" && exit 1

# Authenticate CLI with token
balena login --token "${BALENA_TOKEN}" 

# Test CLI is working
balena whoami > /dev/null 

# Test git is working
git --version

# Fix for https://github.com/actions/checkout/issues/760
git config --global --add safe.directory /github/workspace 

if [ -n "${REGISTRY_SECRETS}" ]; then
  mkdir -p "${HOME}/.balena/"
  echo "${REGISTRY_SECRETS}" > "$HOME/.balena/secrets.json"
fi

# Run action
exec node /app/build/main.js
