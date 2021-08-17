# Balena CI Github Action

This action allows you to send some source to Balena builders. Depending on the context available to the action, it will either make your release a draft or not. See the workflows below for more info.

### Usage

```
jobs:
  balena_cloud_build:
    runs-on: ubuntu-latest
    name: Build release for fleet
    steps:
      - uses: actions/checkout@v2
      - uses: balena-io/balena-ci@master
        id: build
        with:
          balena_token: ${{ secrets.BALENA_TOKEN }}
          fleet: sample-fleet
          workflow_name: balena_cloud_build
      - name: Log release ID built
        run: echo "Built release ID ${{ steps.build.outputs.release_id }}"
```

## Inputs

| key | Description | Required |
| --- | --- | --- |
| balena_token | API key to balenaCloud | true
| fleet | Name of fleet to make releases for | true
| workflow_name | name of your workflow running this action. This is necessary to attach some metadata to be looked up again when the action runs on merge to main. | true
| versionbot | Tells action to use Versionbot branch for versioning | false

## Outputs

| key | Description |
| --- | --- |
| release_id | ID of the release build

## Workflows

Both of the following workflows use the same example in the [usage](#usage) but just require you to change the trigger (on event).

### Draft release workflow (recommended)

```
on:
  # Trigger the workflow on push or pull request to main branch
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
```

This workflow will create a draft release when you open a pull request. Devices tracking latest will not run this release. Once the PR is merged the action will run again and mark your previously built release as final.

### Commit to master

```
on:
  # Trigger the workflow only on push to main branch
  push:
    branches:
      - main
```

This workflow is useful if you push directly to master and want releases built. It will push your source and releases be marked as final.

### Development

Ensure you have [balena-cli](https://github.com/balena-io/balena-cli/) installed on your machine. The CLI will be called if you decide to actually run the action however tests do not invoke the real CLI.

Install the depenedencies:

```
npm ci
```

Tests can be ran with:

```
npm run test
```

To actually run the action on your machine using the installed CLI make a `.env` copy from [env.example](env.example) and replace the values with the correct ones.

Now you can run the action with the following command which will source the .env file.

```
npm run action
```
