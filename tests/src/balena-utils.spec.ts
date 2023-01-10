import * as core from '@actions/core';
import { readFile } from 'fs';
import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';
import * as execHelper from '@actions/exec';
import * as balena from 'balena-sdk';
import * as childProcess from 'child_process';
import * as EventEmitter from 'events';
import rewire = require('rewire');

class MockEmitter extends EventEmitter {
	setEncoding: () => void;
	constructor() {
		super();
		this.setEncoding = () => {
			// noop
		};
	}
}

class MockProcess extends EventEmitter {
	stdout: MockEmitter;
	stderr: MockEmitter;
	constructor() {
		super();
		this.stdout = new MockEmitter();
		this.stderr = new MockEmitter();
	}
}

describe('src/balena-utils', () => {
	let infoStub: SinonStub;
	let execStub: SinonStub;
	const authStub = stub();
	const balenaUtils = rewire('../../src/balena-utils');

	before(() => {
		infoStub = stub(core, 'info');
		execStub = stub(execHelper, 'exec');
	});

	beforeEach(() => {
		execStub.resolves(0); // Make exec calls succeed
	});

	afterEach(() => {
		infoStub.reset();
		execStub.reset();
		authStub.reset();
		balenaUtils.__set__('sdk', null); // reset state of module
	});

	after(() => {
		infoStub.restore();
		execStub.restore();
	});

	describe('push', () => {
		let mockProcess: MockProcess;
		let spawnStub: SinonStub;

		before(() => {
			spawnStub = stub(childProcess, 'spawn');
		});

		beforeEach(() => {
			mockProcess = new MockProcess();
			spawnStub.returns(mockProcess);
		});

		afterEach(() => {
			spawnStub.reset();
		});

		after(() => {
			spawnStub.restore();
		});

		it('uses cached build', async () => {
			const previousBuild = {
				id: '2008424',
				is_final: false,
			};
			balenaUtils.__set__('sdk', {
				models: {
					release: {
						getAllByApplication: async () => {
							return [previousBuild];
						},
					},
				},
			});
			await expect(
				balenaUtils.push('org/fleet', '/tmp/source', true, {
					draft: false,
					tags: {
						sha: 'fba0317620597271695087c168c50d8c94975a29',
						pullRequestId: 111,
					},
				}),
			).to.eventually.deep.equal(previousBuild.id);
		});

		it('Does not set --draft or --nocache', async () => {
			setTimeout(() => {
				mockProcess.emit('exit', 0); // make process exit
			}, 500);

			try {
				await balenaUtils.push('org/fleet', '/tmp/source', false, {
					noCache: false,
					draft: false,
					tags: { sha: 'fba0317620597271695087c168c50d8c94975a29' },
				});
			} catch (e) {
				// expected this
			}

			expect(spawnStub).to.have.been.calledWith('balena', [
				'push',
				'org/fleet',
				'--source',
				'/tmp/source',
				'--release-tag',
				'balena-ci-commit-sha',
				'fba0317620597271695087c168c50d8c94975a29',
			]);
		});

		it('Sets --draft or --nocache', async () => {
			setTimeout(() => {
				mockProcess.emit('exit', 0); // make process exit
			}, 500);

			try {
				await balenaUtils.push('org/fleet', '/tmp/source', false, {
					noCache: true,
					draft: true,
					tags: { sha: 'fba0317620597271695087c168c50d8c94975a29' },
				});
			} catch (e) {
				// expected this
			}

			expect(spawnStub).to.have.been.calledWith('balena', [
				'push',
				'org/fleet',
				'--source',
				'/tmp/source',
				'--release-tag',
				'balena-ci-commit-sha',
				'fba0317620597271695087c168c50d8c94975a29',
				'--draft',
				'--nocache',
			]);
		});

		it('errors when no releaseId is found', async () => {
			setTimeout(() => {
				mockProcess.emit('exit', 0); // make process exit
			}, 500);

			await expect(
				balenaUtils.push('org/fleet', '/tmp/source', false, {
					draft: false,
					tags: { sha: 'fba0317620597271695087c168c50d8c94975a29' },
				}),
			).to.eventually.be.rejectedWith(
				'Was unable to find release ID from the build process.',
			);
		});

		it('returns built releaseId', async () => {
			setTimeout(() => {
				readFile('./tests/data/build.log', (err, data) => {
					if (err) {
						throw err;
					}
					mockProcess.stdout.emit('data', data); // stream build logs
				});
			}, 100);

			setTimeout(() => {
				mockProcess.emit('exit', 0); // make process exit
			}, 500);

			await expect(
				balenaUtils.push('org/fleet', '/tmp/source', false, {
					draft: false,
					tags: { sha: 'fba0317620597271695087c168c50d8c94975a29' },
				}),
			).to.eventually.equal(149241);
		});
	});

	describe('init', () => {
		let sdkStub: SinonStub;

		before(() => {
			sdkStub = stub(balena, 'getSdk');
			sdkStub.returns({
				auth: {
					loginWithToken: authStub,
				},
			} as any);
		});

		afterEach(() => {
			sdkStub.reset();
		});

		after(() => {
			sdkStub.restore();
		});

		it('authenticates SDK client', async () => {
			const endpoint = 'balena-cloud.com';
			const token = '12345';
			await balenaUtils.init(endpoint, token);
			expect(sdkStub).to.have.been.calledWith({
				apiUrl: `https://api.${endpoint}}/`, // Check that the right apiUrl was set
			});
			expect(authStub).to.have.been.calledWith(token); // Check that the right token was used
			expect(balenaUtils.__get__('sdk')).to.not.be.null; // Check that authenticate SDK was set to local instance
		});
	});

	describe('getReleaseByTags', () => {
		it('throws expected error when SDK is not initialized', async () => {
			await expect(
				balenaUtils.getReleaseByTags('org/fleet', {
					sha: 'fba0317620597271695087c168c50d8c94975a29',
					pullRequestId: '412',
				}),
			).to.eventually.be.rejectedWith('balena SDK has not been initialized');
		});

		it('uses correct query parameters when finding a release', async () => {
			const queryStub = stub();
			balenaUtils.__set__('sdk', {
				models: {
					release: {
						getAllByApplication: queryStub,
					},
				},
			});
			queryStub.resolves([
				{
					id: 2008424,
					is_final: false,
				},
			]);
			await balenaUtils.getReleaseByTags('org/fleet', {
				sha: 'fba0317620597271695087c168c50d8c94975a29',
				pullRequestId: '412',
			});
			expect(queryStub).to.have.been.calledWith('org/fleet', {
				$top: 1,
				$select: ['id', 'is_final'],
				$orderby: { created_at: 'desc' },
				$filter: {
					status: 'success',
					$and: [
						{
							release_tag: {
								$any: {
									$alias: 'rt',
									$expr: {
										rt: {
											tag_key: 'balena-ci-id',
											value: '412',
										},
									},
								},
							},
						},
						{
							release_tag: {
								$any: {
									$alias: 'rt',
									$expr: {
										rt: {
											tag_key: 'balena-ci-commit-sha',
											value: 'fba0317620597271695087c168c50d8c94975a29',
										},
									},
								},
							},
						},
					],
				},
			});
		});

		it('returns a release', async () => {
			const queryStub = stub();
			balenaUtils.__set__('sdk', {
				models: {
					release: {
						getAllByApplication: queryStub,
					},
				},
			});
			queryStub.resolves([
				{
					id: 2008424,
					is_final: false,
				},
			]);
			await expect(
				balenaUtils.getReleaseByTags('org/fleet', {
					sha: 'fba0317620597271695087c168c50d8c94975a29',
					pullRequestId: '412',
				}),
			).to.eventually.deep.equal({ id: 2008424, isFinal: false });
		});
	});

	describe('finalize', () => {
		it('passes correct arguments to CLI', async () => {
			await balenaUtils.finalize('1200842');
			expect(execStub).to.have.been.calledWith('balena', [
				'release',
				'finalize',
				'1200842',
			]);
		});
	});

	describe('getReleaseVersion', () => {
		it('throws expected error when SDK is not initialized', async () => {
			await expect(
				balenaUtils.getReleaseVersion(12345),
			).to.eventually.be.rejectedWith('balena SDK has not been initialized');
		});

		it('returns correct release version', async () => {
			balenaUtils.__set__('sdk', {
				models: {
					release: {
						get: () => {
							return { raw_version: '0.0.0-1639156200222' };
						},
					},
				},
			});
			await expect(balenaUtils.getReleaseVersion(2008424)).to.eventually.equal(
				'0.0.0-1639156200222',
			);
		});
	});
});
