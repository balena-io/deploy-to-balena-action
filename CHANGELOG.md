# Change Log

All notable changes to this project will be documented in this file
automatically by Versionist. DO NOT EDIT THIS FILE MANUALLY!
This project adheres to [Semantic Versioning](http://semver.org/).

## 0.1.0 - 2021-10-27

* patch: bump node from 12.22.7-alpine3.11 to 16.12.0-alpine3.11 [dependabot[bot]]
* Cleanup DEVELOPMENT.md and include manual E2E testing notes [Miguel Casqueira]
* Remove GITHUB_TOKEN from docs Defaults to the token in the Github context instead of relying on the user to pass it [Miguel Casqueira]
* Reset CHANGELOG.md [Miguel Casqueira]
* Install CLI via package.json with version pinning [Kyle Harding]
* Support finalizing multiple releases [Miguel Casqueira]
* Allow passing in list of fleets to build release for [Miguel Casqueira]
* Pass balena_url input to CLI as BALENARC_BALENA_URL [Miguel Casqueira]
* Check if context is PR before finalizing [Miguel Casqueira]