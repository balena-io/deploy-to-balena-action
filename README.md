# Deploy to Balena Github Action

This action allows you to push to Balena builders as an automated way to create releases on your fleet. Depending on the context available to the action, it will either make your release a draft or not.

## Usage

Here is an example workflow.yml file. Workflow files should be added to the `.github/workflows/` directory within your project. See our [workflows](#workflows) section to find out more.

```
on:
 pull_request:
    types: [opened, synchronize, closed]
    branches:
      - main
      - master

jobs:
  balena_cloud_build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: balena-io/deploy-to-balena-action@master
        id: build
        with:
          balena_api_key: ${{ secrets.BALENA_API_KEY }}
          fleet: my_org/sample_fleet
      - name: Log release ID built
        run: echo "Built release ID ${{ steps.build.outputs.release_id }}"
```

## Inputs

Inputs are provided using the `with:` section of your workflow YML file.

| key | Description | Required | Default |
| --- | --- | --- | --- |
| balena_api_key | API key to balenaCloud | true | |
| fleet | The slug of the fleet (eg: `my_org/sample_fleet`) for which the release is for | true | |
| environment | Domain of API hosting your fleets | false | balena-cloud.com |
| cache | If a release matching the commit already exists do not build again | false | true |
| versionbot | Tells action to use Versionbot branch for versioning | false | false |
| create_tag | Create a tag on the git commit with the final release version | false | false |
| source | Specify a source directory (for `Dockerfile.template` or `docker-compose.yml`) | false | root directory |
| layer_cache | Use cached layers of previously built images for this project | false | true |
| registry_secrets | JSON string containing image registry credentials used to pull base images | false | |
| default_branch | Used to finalize a release when code is pushed to this branch | false | Repo configured [default branch](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches#about-the-default-branch) |

`balena_api_key` and other tokens needs to be stored in GitHub as an [encrypted secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) that GitHub Actions can access. 

`environment` can be used to specify a custom domain for the backend that will build and deploy your release. If for example you want to deploy to staging environment, you would set it to `balena-staging.com` or if you run your own instance of balenaCloud such as openBalena then specify your domain here.

`registry_secrets` uses a standard secrets.json file format that contains the registry domain with username/password or token inside. You can pass a JSON file as a string like so in your workflow file:

```
         registry_secrets: |
            {
              "ghcr.io": {
                "username": "${{ secrets.REGISTRY_USER }}",
                "password": "${{ secrets.REGISTRY_PASS }}"
              }
            } 
```

## Outputs

| key | Description | Nullable |
| --- | --- | --- |
| release_id | ID of the release built | true |
| version | Version of the release built | true |

The `release_id` output could be null because the action might just finalize previously built releases.
 
## Workflows

This action is leveraging the `is_final` trait of a release to enable you to develop releases in a way that make it easier to test.

With this value, we can mark a release as draft so that it is built and available to your devices to be tested by manually pinning, but any device tracking latest won't upgrade to it.

### Draft release workflow (recommended)

In the sample config shown above under [usage](#usage) we are triggering the action to run on pull_request events: opened, synchronize, and closed. This allows us to build releases as a draft when a new pull request is opened and whenever it gets updated. The draft release will be available for you to pin devices to and test out then, once the pull request has become merged the closed event is triggered. This time the action will know that it just has to mark the previously built draft release as final.

Now, devices tracking latest will automatically download the release and this was all powered through your github workflow!

### Commit to main

This workflow is useful if you push directly to main. This workflow will build your release and notice that it is merging directly to the default branch so not build them as drafts. Devices tracking latest will automatically download these new releases.

To use this workflow just replace the events found from the sample workflow config under [usage](#usage) with:

```
on:
  push:
    branches:
      - main
```

### Additional comments about workflows

If you need to build a release for multiple fleets across several environments (balena-cloud.com, balena-staging.com, etc) you can create multiple workflow files for each environment and use a matrix to pass a list of fleet names into 1 job. See how Balena's Supervisor does this with the [staging deployment workflow](https://github.com/balena-os/balena-supervisor/blob/caf3c1fd5867c127346058742cfa4864e9072313/.github/workflows/staging-balena-ci.yml). 

## Development

See the [development](DEVELOPMENT.md) docs.
