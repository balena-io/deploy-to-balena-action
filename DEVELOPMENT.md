# Development

Install the depenedencies:

```
npm ci
```

Tests can be ran with:

```
npm run test
```

## Performing a dry run

> Make sure you have [balena-cli](https://github.com/balena-io/balena-cli/) installed on your machine and it's authenticated.

This action interacts with external services such as updating the output of a workflow as well as building releases in balenaCloud. Because of this, it's not possible to fully run the action because only github apps can update workflow outputs and building a release costs a lot of compute + time.

To perform a "dry run" of the action without producing any side effects you can do so by copying the env.example file in the [event](events) you want to run. Name your copy .env and make sure the modify the input and primary variables.

Once you finish that you can run the action with the following commands:

```
npm run action:open-pr
npm run action:sync-pr
npm run action:close-pr
npm run action:push
```

This will run through the entire actions logic except for updating workflow output and triggering a build.

To add new events you can just copy the payloads from Github's [Webhook events and payloads](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads) docs.
