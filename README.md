# Balena CI Github Action

This action allows you to send some source to Balena builders. Depending on the context available to the action, it will either make your release a draft or not.

## Usage

Here is an example workflow.yml file. See our [workflows](#workflows) section to understand it some more.

```
name: balenaci # Workflow must contain a name

on:
  push

jobs:
  balena_cloud_build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: balena-io/balena-ci@master
        id: build
        with:
          balena_token: ${{ secrets.BALENA_TOKEN }}
          fleet: sample-fleet
      - name: Log release ID built
        run: echo "Built release ID ${{ steps.build.outputs.release_id }}"
```

## Inputs

| key | Description | Required | Default |
| --- | --- | --- | --- |
| balena_token | API key to balenaCloud | true | |
| fleet | Name of fleet to make release for | true | |
| environment | Domain of API hosting your fleets | false | balena-cloud.com |
| versionbot | Tells action to use Versionbot branch for versioning | false | false |
| target | Name of branch that code gets merged into | false | master |
| finalize | Should the action finalize the release after being built | false | true |

`environment` can be used to specify a custom domain for the backend that will build and deploy your release. If for example you want to deploy to staging environment, you would set it to `balena-staging.com` or if you run your own instance of balenaCloud such as openBalena then specify your domain here.

`target` was added because not all projects use the master branch as the final destination for code. This variable is used so the action knows when it should try to finalize the previously built releases.

`finalize` can be used when you have to build for several fleets and want the deployment to be atomic. For example, if you build for 2 fleets, you would have 2 steps running this action and just change the `fleet` variable. This will cause the 1st step which builds for fleet-1 to build then finalize without knowing if fleet-2 which is built after was successful. Therefore, with this variable, you can tell the action to not finalize the release and allow another step to finalize all the releases built during the workflow. See the [Building for multiple fleets](#building-for-multiple-fleets) workflow for more info.

## Outputs

| key | Description |
| --- | --- |
| release_id | ID of the release built |

## Workflows

This action is leveraging the `is_final` trait of a release to enable you to develop releases in a way that make it way easier to test.

With this value we can mark a release as draft so that it is built and available to your devices to be tested but any device tracking latest won't upgrade to it!

### Draft release workflow (recommended)

When you push code to a branch to be reviewed like in a Pull Request, the commit will trigger the `push` event and allow the action to build your release. While your code is being reviewed in the pull request, you can pin some devices to the draft release and perform some more testing without having to merge code or be worried about devices in the fleet downloading this test code.

Once the Pull Request gets merged this causes the `push` event to trigger again since the PR branch is now merged into your target branch (typically master). This time, the action will see that releases have already been built and now mark them as finalized. Now, devices tracking latest will automatically download the release and this was all powered through your github workflow!

### Commit to master

This workflow is useful if you push directly to master and want releases built. This workflow will build your release and notice that it is merging directly to the target branch and automatically make it finalized.

### Building for multiple fleets

If your application runs on multiple fleets that have different architectures, you can safely build atomic releases that will only finalize for all fleets if they all build. For example, given the following workflow steps:

```
steps:
      - uses: actions/checkout@v2
      - uses: balena-io/balena-ci@master
        with:
          balena_token: ${{ secrets.BALENA_TOKEN }}
          fleet: aarch64-supervisor
          finalize: false
      - uses: balena-io/balena-ci@master
        with:
          balena_token: ${{ secrets.BALENA_TOKEN }}
          fleet: amd64-supervisor
```

We are telling the workflow to build the source code for `aarch64-supervisor`and `amd64-supervisor` fleets. Since steps run in sequence, the first invocation of this action will have to know if the next step builds successfully before finalizing itself. This is to prevent situations where one fleet gets a new release but do to whatever reason the 2nd fleet fails to build and cannot be finalized. With the use of the `finalize` input you can specify to the action that it shouldn't finalize after building. The next step (the one building for amd64-supervisor fleet) does not have this finalize input and will therefore finalize for all the releases built in the workflow.

In the future we may offer a way to run builds all in parallel by just having a single step and passing the fleets as an input.

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

To actually run the action on your machine using the installed CLI make a `.env` copy from [env.example](env.example) and replace the values with the correct ones.

Now you can run the action with the following command which will source the .env file.

```
npm run action
```
