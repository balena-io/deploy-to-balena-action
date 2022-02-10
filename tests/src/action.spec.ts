import * as core from '@actions/core';
import { expect } from 'chai';
import { stub } from 'sinon';

import * as versionbot from '../../src/versionbot-utils';
import * as balena from '../../src/balena-utils';
import * as git from '../../src/git';
import * as github from '../../src/github-utils';
import * as action from '../../src/action';

// Sample context
const context = {
	eventName: 'push',
	ref: 'refs/heads/main',
	sha: 'fba0317620597271695087c168c50d8c94975a29',
	payload: {
		repository: {
			owner: 'balena-io',
			name: 'a-repository',
			sha: 'fba0317620597271695087c168c50d8c94975a29',
			master_branch: 'main',
		},
	},
};

// Sample inputs
const inputs = {
	fleet: 'my-org/my-fleet',
	cache: true,
	source: '/src',
};

describe('src/action', () => {
	const pushStub = stub(balena, 'push');
	const vbBranchStub = stub(versionbot, 'getBranch');
	const fetchStub = stub(git, 'fetch');
	const checkoutStub = stub(git, 'checkout');
	const createTagStub = stub(github, 'createTag');
	const releaseVersionStub = stub(balena, 'getReleaseVersion');
	const releaseByTagStub = stub(balena, 'getReleaseByTags');
	const setOutputStub = stub(core, 'setOutput');
	const errorLogStub = stub(core, 'error');

	beforeEach(() => {
		pushStub.resolves(123456); // Resolve a default releaseID
		vbBranchStub.resolves('vb-branch-123'); // Resolve a default branch
		fetchStub.resolves(); // Resolve nothing
		checkoutStub.resolves(); // Resolve nothing
		createTagStub.resolves(); // Resolve nothing
		releaseVersionStub.resolves('v0.5.6'); // Resolve a default version
		setOutputStub.returns(); // Returns nothing
		errorLogStub.returns(); // Returns nothing
	});

	afterEach(() => {
		pushStub.reset();
		vbBranchStub.reset();
		fetchStub.reset();
		checkoutStub.reset();
		createTagStub.reset();
		releaseVersionStub.reset();
		releaseByTagStub.reset();
		setOutputStub.reset();
		errorLogStub.reset();
	});

	after(() => {
		pushStub.restore();
		vbBranchStub.restore();
		fetchStub.restore();
		checkoutStub.restore();
		createTagStub.restore();
		releaseVersionStub.restore();
		releaseByTagStub.restore();
		setOutputStub.restore();
		errorLogStub.restore();
	});

	it('exits early on missing data', async () => {
		await expect(
			// @ts-expect-error
			action.run({ payload: {} }, inputs),
		).to.be.rejectedWith('Workflow payload was missing repository object');
	});

	it('errors on unknown workflow', async () => {
		await expect(
			action.run(
				// @ts-expect-error
				{ ...context, eventName: 'pull_request_review_comment' },
				inputs,
			),
		).to.be.rejectedWith(
			'Unsure how to proceed with event: pull_request_review_comment',
		);
	});

	it('gets versionbot branch', async () => {
		// @ts-expect-error
		await action.run(context, { ...inputs, versionbot: true });
		expect(vbBranchStub).to.have.been.calledOnce;
		expect(checkoutStub).to.have.been.calledWith('vb-branch-123');
	});

	it('set correct outputs', async () => {
		// @ts-expect-error
		await action.run(context, { ...inputs, versionbot: true });
		expect(setOutputStub).to.have.been.calledTwice;
		expect(setOutputStub.getCall(0)).to.have.been.calledWith(
			'version',
			'v0.5.6',
		);
		expect(setOutputStub.getCall(1)).to.have.been.calledWith(
			'release_id',
			123456,
		);
	});

	it('creates a tag', async () => {
		// @ts-expect-error
		await action.run(context, { ...inputs, createTag: true });
		expect(createTagStub).to.have.been.called;
		// Check that create tag value was passed
		expect(createTagStub.lastCall.args[1]).to.equal('v0.5.6');
	});

	it('exits if build command errors', async () => {
		pushStub.throws(new Error('Build process returned non-0 exit code'));
		// Check that the action throws the error from the push command
		await expect(
			action.run(context as any, { ...inputs, versionbot: true } as any),
		).to.be.rejectedWith('Build process returned non-0 exit code');
		// Check that the action logs an error message
		expect(errorLogStub).to.have.been.calledWith(
			'Build process returned non-0 exit code',
		);
	});

	describe('PR workflow', () => {
		it('builds a draft release', async () => {
			const prContext = {
				eventName: 'pull_request',
				payload: {
					repository: {
						owner: 'balena-io',
						name: 'a-repository',
						sha: '123456',
						master_branch: 'main',
					},
					pull_request: {
						id: 4423422,
						number: 44,
						merged: false,
						head: {
							sha: 'fba0317620597271695087c168c50d8c94975a29',
						},
					},
				},
			};
			// @ts-expect-error
			await action.run(prContext, inputs);
			// Check that the last arg (buildOptions) does not contain draft: true
			expect(pushStub.lastCall.lastArg).to.deep.equal({
				tags: {
					sha: 'fba0317620597271695087c168c50d8c94975a29',
					pullRequestId: 4423422,
				},
			});
		});

		it('finalizes when a PR closes', async () => {
			const prContext = {
				eventName: 'pull_request',
				payload: {
					action: 'closed',
					repository: {
						owner: 'balena-io',
						name: 'a-repository',
						sha: '123456',
						master_branch: 'main',
					},
					pull_request: {
						id: 4423422,
						number: 44,
						merged: true,
						head: {
							sha: 'fba0317620597271695087c168c50d8c94975a29',
						},
					},
				},
			};
			const finalizeStub = stub(balena, 'finalize');
			// Stub a previously built release
			releaseByTagStub.resolves({
				id: 123456,
				isFinal: false,
			});
			// @ts-expect-error
			await action.run(prContext, inputs);
			// Check that the release was finalized
			expect(finalizeStub).to.have.been.calledWith(123456);
			finalizeStub.restore();
		});
	});

	describe('Main workflow', () => {
		it('builds a finalized release', async () => {
			// @ts-expect-error
			await action.run(context, inputs);
			// Check that the last arg (buildOptions) does not contain draft: true
			expect(pushStub.lastCall.lastArg).to.deep.equal({
				draft: false,
				tags: {
					sha: 'fba0317620597271695087c168c50d8c94975a29',
				},
			});
		});
	});
});
