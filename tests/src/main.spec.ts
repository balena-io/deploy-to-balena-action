import * as core from '@actions/core';
import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';

import * as action from '../../src/action';
import * as githubUtils from '../../src/github-utils';
import * as balenaUtils from '../../src/balena-utils';

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
				source: '/workdir',
				github_token: 'ghTokenExample',
			}[inputName];
		});

		// Return some sample boolean inputs
		getBooleanInput.callsFake((inputName: string) => {
			return {
				cache: false,
				versionbot: true,
				create_tag: true,
				create_ref: false,
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
		actionStub.throws(new Error('Something went wrong'));

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
			await new Promise((resolve) => {
				setTimeout(resolve, 1);
			});
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
			source: '/workdir',
			githubToken: 'ghTokenExample',
		});
		// Since github actions pass by default there's no need to check if the action passes
		// So, let's check if the action correctly handles failures instead
		expect(setFailedStub).to.have.been.calledWith('Something went wrong');
		setFailedStub.restore();
	});
});
