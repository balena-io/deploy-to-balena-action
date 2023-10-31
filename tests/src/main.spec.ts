import { join } from 'path';
import * as core from '@actions/core';
import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';

import { sleep } from '../lib/sleep';
import * as action from '../../src/action';
import * as githubUtils from '../../src/github-utils';
import * as balenaUtils from '../../src/balena-utils';

const WORKSPACE =
	process.env.GITHUB_ACTIONS === '1' ? process.env.GITHUB_WORKSPACE! : '';

// Since this tool accepts an input from the environment
// the tests might run with or without the GITHUB_WORKSPACE value
// Therefore, we dynamically set the source used in tests so that
// tests pass in environments with this env var set or not
const dynamicSource = join(WORKSPACE, '/src');

describe('src/main', () => {
	let getInputStub: SinonStub;
	let getBooleanInput: SinonStub;
	let actionStub: SinonStub;
	let ghUtilStub: SinonStub;
	let balenaUtilStub: SinonStub;

	before(() => {
		getInputStub = stub(core, 'getInput');
		getBooleanInput = stub(core, 'getBooleanInput');
		actionStub = stub(action, 'run');
		ghUtilStub = stub(githubUtils, 'init');
		balenaUtilStub = stub(balenaUtils, 'init');

		// Return promises
		balenaUtilStub.resolves();
		ghUtilStub.resolves();

		// Return some sample inputs
		getInputStub.callsFake((inputName: string) => {
			return {
				balena_token: 'balenaTokenExample',
				fleet: 'my-org/my-fleet',
				environment: 'balena-cloud.com',
				source: dynamicSource,
				github_token: 'ghTokenExample',
				default_branch: '',
				note: 'My useful note',
			}[inputName];
		});

		// Return some sample boolean inputs
		getBooleanInput.callsFake((inputName: string) => {
			return {
				cache: false,
				versionbot: true,
				create_tag: true,
				create_ref: false,
				layer_cache: true,
				multi_dockerignore: true,
				debug: true,
			}[inputName];
		});
	});

	afterEach(() => {
		getInputStub.reset();
		getBooleanInput.reset();
		actionStub.reset();
		ghUtilStub.reset();
		balenaUtilStub.reset();
	});

	after(() => {
		getInputStub.restore();
		getBooleanInput.restore();
		actionStub.restore();
		ghUtilStub.restore();
		balenaUtilStub.restore();
	});

	it('initilizes action correctly', async () => {
		const setFailedStub = stub(core, 'setFailed');
		// Actions pass by default so make this fail to test if failure is set
		actionStub.rejects(new Error('Something went wrong'));

		require('../../src/main'); // run code to test

		// Check that requires modules were initilized before running the action
		expect(ghUtilStub).to.have.been.calledWith('ghTokenExample');
		expect(balenaUtilStub).to.have.been.calledWith(
			'balena-cloud.com',
			'balenaTokenExample',
		);

		while (!actionStub.lastCall) {
			// Since the main file performs async operations without a way to know
			// once it is done we will wait until the action is called.
			// The test timeout will make this fail if it runs for longer then allowed time.
			await sleep(1);
		}
		// Check that the action was given correct input parameters
		// Not checking first input which is the context as this is loaded by the github module
		expect(actionStub.lastCall.args[1]).to.deep.equal({
			balenaToken: 'balenaTokenExample',
			fleet: 'my-org/my-fleet',
			environment: 'balena-cloud.com',
			cache: false,
			versionbot: true,
			createTag: true,
			source: '/src',
			githubToken: 'ghTokenExample',
			layerCache: true,
			defaultBranch: '',
			multiDockerignore: true,
			debug: true,
			note: 'My useful note',
		});
		// Since github actions pass by default there's no need to check if the action passes
		// So, let's check if the action correctly handles failures instead
		expect(setFailedStub).to.have.been.calledWith('Something went wrong');
		setFailedStub.restore();
	});
});
