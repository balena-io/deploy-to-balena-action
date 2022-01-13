import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';

import * as gh from '../../src/github-utils';
import * as versionbot from '../../src/versionbot-utils';
import sleep from '../lib/sleep';

describe('src/versionbot-utils', () => {
	let checksStub: SinonStub;

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
		await expect(versionbot.getBranch(5)).to.eventually.equal(
			'versionbot/pr/5',
		);
	});

	it('waits until versionbot action completes', async () => {
		return new Promise((resolve, reject) => {
			checksStub.resolves([
				{ id: 1, name: 'VersionBot/generate-version', status: 'running' }, // Versionbot is still running
				{ id: 2, name: 'AnotherAction/Action', status: 'completed' },
				{ id: 3, name: 'Something/Else', status: 'running' },
			]);
			// Start checking for versionbot branch
			versionbot.getBranch(1000).then((branch) => {
				// Since promise resolved we expect the branch to be returned now
				try {
					expect(branch).to.equal('versionbot/pr/1000');
				} catch (e) {
					reject(e);
				}
				resolve(); // Test has completed
			});
			// Wait 2 seconds before making versionbot check complete
			sleep(2000).then(() => {
				// Update checks so Versionbot has completed
				checksStub.resolves([
					{ id: 1, name: 'VersionBot/generate-version', status: 'completed' }, // Versionbot is still completed
					{ id: 2, name: 'AnotherAction/Action', status: 'completed' },
					{ id: 3, name: 'Something/Else', status: 'running' },
				]);
			});
		});
	});
});
