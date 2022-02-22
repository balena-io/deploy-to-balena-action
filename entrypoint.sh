#!/bin/sh

BALENARC_BALENA_URL=${BALENA_URL}

export BALENARC_BALENA_URL

set -eo pipefail

[ -z "$BALENA_TOKEN" ] && echo "BALENA_TOKEN input cannot be empty" && exit 1

# Authenticate CLI with token
balena login --token ${BALENA_TOKEN} 

# Test CLI is working
balena whoami > /dev/null 

# Test git is working
git --version

# Run action
exec node /usr/src/app/build/src/main.js
