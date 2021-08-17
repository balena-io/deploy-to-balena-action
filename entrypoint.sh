#!/bin/sh

balena login --token ${BALENA_TOKEN}

exec node /usr/src/app/build/main.js