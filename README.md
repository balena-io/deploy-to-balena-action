# Balena CI Github Action

This action allows you to send some source to Balena builders. Depending on the context available to the action, it will either make your release a draft or not.

## Usage

Here is an example workflow.yml file. See our [workflows](#workflows) section to understand it some more.

```
name: balenaci # Workflow must contain a name

on:
 pull_request:
    types: [opened, synchronize, closed]
    branches:
      - master

jobs:
  balena_cloud_build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: balena-io/balena-ci@master
        id: build
        with:
          balena_token: ${{ secrets.BALENA_TOKEN }}
          fleet: my-org/sample-fleet
      - name: Log release ID built
        run: echo "Built release ID ${{ steps.build.outputs.release_id }}"
```

## Inputs

| key | Description | Required | Default |
| --- | --- | --- | --- |
| balena_token | API key to balenaCloud | true | |
| fleet | Fleet the release is for in slug format (org/fleet) | true | |
| environment | Domain of API hosting your fleets | false | balena-cloud.com |
| versionbot | Tells action to use Versionbot branch for versioning | false | false |

`environment` can be used to specify a custom domain for the backend that will build and deploy your release. If for example you want to deploy to staging environment, you would set it to `balena-staging.com` or if you run your own instance of balenaCloud such as openBalena then specify your domain here.

## Outputs

| key | Description | Nullable |
| --- | --- | --- |
| release_id | ID of the release built | true |

The `release_id` output could be null because the action might just finalize previously built releases.
 
## Workflows

This action is leveraging the `is_final` trait of a release to enable you to develop releases in a way that make it easier to test.

With this value, we can mark a release as draft so that it is built and available to your devices to be tested but any device tracking latest won't upgrade to it!

### Draft release workflow (recommended)

In the sample config shown above under [usage](#usage) we are triggering the action to run on pull_request events: opened, synchronize, and closed. This allows us to build releases as a draft when a new pull request is opened and whenever it gets updated. The draft release will be available for you to pin devices to and test out then, once the pull request has become merged the closed event is triggered. This time the action will know that it just has to mark the previously built draft release as final.

Now, devices tracking latest will automatically download the release and this was all powered through your github workflow!

### Commit to master

This workflow is useful if you push directly to master. This workflow will build your release and notice that it is merging directly to the default branch so not build them as drafts. Devices tracking latest will automatically download these new releases.

To use this workflow just replace the events found from the sample workflow config under [usage](#usage) with:

```
on: 
  push
```

## Development

Ensure you have [balena-cli](https://github.com/balena-io/balena-cli/) installed on your machine. The CLI will be called if you decide to actually run the action however tests do not invoke the real CLI.

Install the depenedencies:

```
npm ci
```

Tests can be ran with:

```
npm run test
```

### Performing a dry run

This action interacts with external services such as updating the output of a workflow as well as building releases in balenaCloud. Because of this, it's not possible to fully run the action because only github apps can update workflow outputs and building a release costs a lot of compute + time.

To perform a "dry run" of the action without producing any side effects you can do so by copying the env.example file in the [event](events) you want to run. Name your copy .env and make sure the modify the input and primary variables.

Once you finish that you can run the action with the following commands:

```
npm run action:push
npm run action:pull-request
```

This will run through the entire actions logic except for updating workflow output and triggering a build.

To add new events you can just copy the payloads from Github's [Webhook events and payloads](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads) docs.
