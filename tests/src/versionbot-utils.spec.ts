import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';

import * as gh from '../../src/github-utils';
import * as versionbot from '../../src/versionbot-utils';

describe('src/versionbot-utils', () => {
	let checksStub: SinonStub;
	const prNumber = Math.floor(Math.random() * 10);
	const prId = Math.floor(Math.random() * 10000);
	const repoContext = {
		owner: 'balena-io',
		name: 'deploy-to-balena-aciton',
		sha: '123',
		pullRequest: {
			id: prId,
			number: prNumber,
			merged: false,
		},
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
		await expect(versionbot.getBranch(repoContext)).to.eventually.equal(
			`versionbot/pr/${prNumber}`,
		);
	});

	it('handles invalid context gracefully', async () => {
		await expect(
			versionbot.getBranch({ notAPullRequest: 123 } as any),
		).to.eventually.be.rejectedWith(
			'Cannot find Versionbot branch for non-PR context: {"notAPullRequest":123}',
		);
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
		// Start checking for versionbot branch
		await expect(versionbot.getBranch(repoContext)).to.eventually.equal(
			`versionbot/pr/${prNumber}`,
		);
	});
});
