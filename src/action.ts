import * as core from '@actions/core';
import { context } from '@actions/github';

import * as versionbot from './versionbot-utils';
import * as balena from './balena-utils';
import * as git from './git';
import { createRef } from './github-utils';

export async function run(): Promise<void> {
	// If the payload does not have a repository object then fail early (the events we are interested in always have this)
	if (!context.payload.repository) {
		throw new Error('Workflow payload was missing repository object');
	}

	// Get the master branch so we can infer intent
	const target = context.payload.repository.master_branch;
	// Name of the fleet to build for
	const fleet = core.getInput('fleet', { required: true });
	// File path to release source code
	const src =
		`${process.env.GITHUB_WORKSPACE}/${core.getInput('source')}` || '';
	// ID of release built
	let releaseId: string | null = null;
	// Version of release built
	let rawVersion: string | null = null;

	// If a pull request was closed and merged then just finalize the release!
	if (
		context.payload.action === 'closed' &&
		context.payload.pull_request?.merged
	) {
		// Get the previous release built
		const previousRelease = await balena.getReleaseByTags(fleet, {
			sha: context.payload.pull_request?.head.sha,
			pullRequestId: context.payload.pull_request?.id,
		});
		if (!previousRelease) {
			throw new Error(
				'Action reached point of finalizing a release but did not find one',
			);
		} else if (previousRelease.isFinal) {
			core.info('Release is already finalized so skipping.');
			return;
		}
		// Finalize release and done!
		return await balena.finalize(previousRelease.id);
	}

	// If the repository uses Versionbot then checkout Versionbot branch
	if (core.getBooleanInput('versionbot', { required: false })) {
		const versionbotBranch = await versionbot.getBranch(
			context.payload.pull_request?.number!,
		);
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.checkout(versionbotBranch);
	}

	// If we are pushing directly to the target branch then just build a release without draft flag
	if (context.eventName === 'push' && context.ref === `refs/heads/${target}`) {
		// Make a final release because context is master workflow
		releaseId = await balena.push(fleet, src, {
			draft: false,
			tags: { sha: context.sha },
		});
	} else if (context.eventName !== 'pull_request') {
		// Make sure the only events now are Pull Requests
		if (context.eventName === 'push') {
			throw new Error(
				`Push workflow only works with ${target} branch. Event tried pushing to: ${context.ref}`,
			);
		}
		throw new Error(`Unsure how to proceed with event: ${context.eventName}`);
	} else {
		// Make a draft release because context is PR workflow
		releaseId = await balena.push(fleet, src, {
			tags: {
				sha: context.payload.pull_request?.head.sha,
				pullRequestId: context.payload.pull_request?.id,
			},
		});
	}

	if (!releaseId) {
		throw new Error('A release should have built by now');
	}

	// Now that we built a release set the expected outputs
	rawVersion = await balena.getReleaseVersion(parseInt(releaseId, 10));
	core.setOutput('version', rawVersion);
	core.setOutput('release_id', releaseId);

	if (core.getBooleanInput('create_ref', { required: false })) {
		await createRef(rawVersion, context.payload.pull_request?.head.sha);
	}
}
