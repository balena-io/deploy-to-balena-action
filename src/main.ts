// import { join } from 'path';
import * as core from '@actions/core';
// import { context } from '@actions/github';

import { Inputs } from './types';
import * as action from './action';
import * as githubUtils from './github-utils';
import * as balenaUtils from './balena-utils';

// If a github action is running this then a GITHUB_WORKSPACE value will be set
// const WORKSPACE =
// 	process.env.GITHUB_ACTIONS === '1' ? process.env.GITHUB_WORKSPACE! : '';

// Capture inputs
const inputs: Inputs = {
	balenaToken: core.getInput('balena_token', { required: true }),
	fleet: core.getInput('fleet', { required: true }),
	release: parseInt(core.getInput('release_id', { required: true })),
	environment: core.getInput('environment', { required: false }),
	testCommand: core.getInput('test_command', { required: false }),
	testTimeout: parseInt(core.getInput('test_timeout', { required: false })),
	githubToken: core.getInput('github_token', { required: false })
};

(async () => {
	try {
		// Initialize github client
		githubUtils.init(inputs.githubToken);
		// Initialize balena SDK
		await balenaUtils.init(inputs.environment, inputs.balenaToken);
		// acquire a test device
		const device = await balenaUtils.setupDevice(inputs.fleet, inputs.release);
		// run user tests
		await action.test(device, inputs.testCommand, inputs.testTimeout);
		// teardown device
		await balenaUtils.teardownDevice(device);
	} catch (e: any) {
		core.setFailed(e.message);
	}
})();
