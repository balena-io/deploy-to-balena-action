import { expect } from 'chai';
import { stub } from 'sinon';
import * as github from '@actions/github';

import * as githubUtils from '../../src/github-utils';

describe('src/github-utils', () => {
	const getOctokitStub = stub(github, 'getOctokit');

	afterEach(() => {
		getOctokitStub.reset();
	});

	after(() => {
		getOctokitStub.restore();
	});

	describe('getChecks', () => {
		const requestStub = stub();
		before(() => {
			getOctokitStub.returns({
				// @ts-expect-error
				request: requestStub,
			});
			githubUtils.init('123'); // initilize module so interal client uses requestStub
		});

		afterEach(() => {
			requestStub.reset();
		});

		it('passes correct parameters', async () => {
			requestStub.resolves({
				data: {
					check_runs: [],
				},
			});
			// Return empty data from checks as we are just checking parameters passed
			await githubUtils.getChecks({
				owner: 'balena-io',
				name: 'deploy-to-balena-action',
				sha: 'b1304df8fcfc2836b7224e94fe1348f3c48f5138',
				pullRequest: null,
			});
			expect(requestStub).to.have.been.calledWith(
				'GET /repos/{owner}/{repo}/commits/{ref}/check-runs',
				{
					owner: 'balena-io',
					repo: 'deploy-to-balena-action',
					ref: 'b1304df8fcfc2836b7224e94fe1348f3c48f5138',
				},
			);
		});

		it('returns checks from response data', async () => {
			requestStub.resolves({
				data: {
					check_runs: [
						{
							id: 123,
							name: 'sample-check',
							status: 'finished',
						},
					],
				},
			});
			await expect(
				githubUtils.getChecks({
					owner: 'balena-io',
					name: 'deploy-to-balena-action',
					sha: 'b1304df8fcfc2836b7224e94fe1348f3c48f5138',
					pullRequest: null,
				}),
			).to.eventually.deep.equal([
				{
					id: 123,
					name: 'sample-check',
					status: 'finished',
				},
			]);
		});
	});

	describe('createTag', () => {
		const createRefStub = stub();
		before(() => {
			getOctokitStub.returns({
				rest: {
					git: {
						// @ts-expect-error
						createRef: createRefStub,
					},
				},
			});
			githubUtils.init('123'); // initilize module so interal client uses requestStub
		});

		afterEach(() => {
			createRefStub.reset();
		});

		it('passes correct parameters', async () => {
			createRefStub.resolves({
				data: {
					url: '',
				},
			});
			await githubUtils.createTag(
				{
					owner: 'balena-io',
					name: 'deploy-to-balena-action',
					sha: 'b1304df8fcfc2836b7224e94fe1348f3c48f5138',
					pullRequest: null,
				},
				'v0.5.6',
			);
			// Check that stub was passed correct value
			expect(createRefStub).to.have.been.calledWith({
				owner: 'balena-io',
				repo: 'deploy-to-balena-action',
				ref: 'refs/tags/v0.5.6',
				sha: 'b1304df8fcfc2836b7224e94fe1348f3c48f5138',
			});
		});
		it('returns tagged url', async () => {
			createRefStub.resolves({
				data: {
					url: 'https://github.com/balena-io/deploy-to-balena-action/releases/tag/v0.5.6',
				},
			});
			await expect(
				githubUtils.createTag(
					{
						owner: 'balena-io',
						name: 'deploy-to-balena-action',
						sha: 'b1304df8fcfc2836b7224e94fe1348f3c48f5138',
						pullRequest: null,
					},
					'v0.5.6',
				),
			).to.eventually.equal(
				'https://github.com/balena-io/deploy-to-balena-action/releases/tag/v0.5.6',
			);
		});
	});
});
