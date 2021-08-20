#!/bin/sh

BALENARC_BALENA_URL=${BALENA_URL} \ 
    balena login --token ${BALENA_TOKEN}

balena whoami

exec node /usr/src/app/build/main.js
