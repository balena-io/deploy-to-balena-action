import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';

import * as gh from '../../src/github-utils';
import * as versionbot from '../../src/versionbot-utils';

describe('src/versionbot-utils', () => {
	let checksStub: SinonStub;
	const repoContext = {
		owner: 'balena-io',
		repo: 'deploy-to-balena-aciton',
		ref: '123',
	};

	before(() => {
		checksStub = stub(gh, 'getChecks');
	});

	afterEach(() => {
		checksStub.reset();
	});

	after(() => {
		checksStub.restore();
	});

	it('finds branch created by versionbot', async () => {
		checksStub.resolves([
			{ id: 1, name: 'VersionBot/generate-version', status: 'completed' }, // Versionbot check has completed
			{ id: 2, name: 'AnotherAction/Action', status: 'completed' },
			{ id: 3, name: 'Something/Else', status: 'running' },
		]);
		const prNumber = Math.floor(Math.random() * 10000);
		await expect(
			versionbot.getBranch(repoContext, prNumber),
		).to.eventually.equal(`versionbot/pr/${prNumber}`);
	});

	it('waits until versionbot action completes', async () => {
		checksStub.resolves([
			{ id: 1, name: 'VersionBot/generate-version', status: 'running' }, // Versionbot is still running
			{ id: 2, name: 'AnotherAction/Action', status: 'completed' },
			{ id: 3, name: 'Something/Else', status: 'running' },
		]);
		// Wait 2 seconds before making versionbot check complete
		setTimeout(() => {
			checksStub.resolves([
				{ id: 1, name: 'VersionBot/generate-version', status: 'completed' }, // Versionbot is completed
				{ id: 2, name: 'AnotherAction/Action', status: 'completed' },
				{ id: 3, name: 'Something/Else', status: 'running' },
			]);
		}, 2000);
		const prNumber = Math.floor(Math.random() * 10000);
		// Start checking for versionbot branch
		await expect(
			versionbot.getBranch(repoContext, prNumber),
		).to.eventually.equal(`versionbot/pr/${prNumber}`);
	});
});
