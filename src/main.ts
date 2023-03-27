import { join } from 'path';
import * as core from '@actions/core';
import { context } from '@actions/github';

import { Inputs } from './types';
import * as action from './action';
import * as githubUtils from './github-utils';
import * as balenaUtils from './balena-utils';

// If a github action is running this then a GITHUB_WORKSPACE value will be set
const WORKSPACE =
	process.env.GITHUB_ACTIONS === '1' ? process.env.GITHUB_WORKSPACE! : '';

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
	source: join(WORKSPACE, core.getInput('source', { required: false })),
	githubToken: core.getInput('github_token', { required: false }),
	layerCache: core.getBooleanInput('layer_cache', { required: false }),
	defaultBranch: core.getInput('default_branch', { required: false }),
	multiDockerignore: core.getBooleanInput('multi_dockerignore', { required: false }),
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
