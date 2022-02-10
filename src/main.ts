import * as core from '@actions/core';
import { context } from '@actions/github';

import { Inputs } from './types';
import * as action from './action';
import * as githubUtils from './github-utils';
import * as balenaUtils from './balena-utils';

// Capture inputs
const inputs: Inputs = {
	balenaToken: core.getInput('balena_token', { required: true }),
	fleet: core.getInput('fleet', { required: true }),
	environment: core.getInput('environment', { required: false }),
	cache: core.getBooleanInput('cache', { required: false }),
	versionbot: core.getBooleanInput('versionbot', { required: false }),
	createTag:
		core.getBooleanInput('create_tag', { required: false }) ||
		core.getBooleanInput('create_ref', { required: false }),
	source: core.getInput('source', { required: false }),
	githubToken: core.getInput('github_token', { required: false }),
};

(async () => {
	try {
		// Initialize github client
		githubUtils.init(inputs.githubToken);
		// Initialize balena SDK
		await balenaUtils.init(inputs.environment, inputs.balenaToken);
		await action.run(context, inputs);
	} catch (e: any) {
		core.setFailed(e.message);
	}
})();
