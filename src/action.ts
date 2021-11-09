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
	const src = process.env.GITHUB_WORKSPACE || '';
	// ID of release built
	let releaseId: string | null = null;
	// Version of release built
	let rawVersion: string | null = null;

	// If we are pushing directly to the target branch then just build a release without draft flag
	if (context.eventName === 'push' && context.ref === `refs/heads/${target}`) {
		releaseId = await balena.push(fleet, src, {
			draft: false,
			tags: { sha: context.sha },
		});
		// Set the built releaseId in the output
		core.setOutput('release_id', releaseId);

		rawVersion = await balena.getReleaseVersion(parseInt(releaseId, 10));
		core.setOutput('version', rawVersion);

		if (core.getBooleanInput('create_ref', { required: false })) {
			await createRef(rawVersion, context.sha);
		}

		return; // Done action!
	} else if (context.eventName !== 'pull_request') {
		if (context.eventName === 'push') {
			throw new Error(
				`Push workflow only works with ${target} branch. Event tried pushing to: ${context.ref}`,
			);
		}
		throw new Error(`Unsure how to proceed with event: ${context.eventName}`);
	}

	// If a pull request was closed and merged then finalize the release!
	if (
		context.payload.action === 'closed' &&
		context.payload.pull_request?.merged
	) {
		// Get the previous release built
		const previousRelease = await balena.getReleaseByTags(fleet, {
			sha: context.payload.pull_request?.head.sha,
			pullRequestId: context.payload.pull_request?.id,
		});
		if (previousRelease && !previousRelease.isFinal) {
			await balena.finalize(previousRelease.id);
		} else {
			// Throw an error so the action fails
			throw new Error(
				'Action reached point of finalizing a release but did not find one',
			);
		}
		return; // Action is complete because we finalized the release previously built
	}

	// If the action has made it this far then we will build a draft release

	// If the repository uses Versionbot then checkout Versionbot branch
	if (core.getBooleanInput('versionbot', { required: false })) {
		const versionbotBranch = await versionbot.getBranch(
			context.payload.pull_request?.number!,
		);
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.checkout(versionbotBranch);
	}

	// Now send the source to the builders which will build a draft
	releaseId = await balena.push(fleet, src, {
		tags: {
			sha: context.payload.pull_request?.head.sha,
			pullRequestId: context.payload.pull_request?.id,
		},
	});

	// Set the built releaseId in the output
	core.setOutput('release_id', releaseId);

	rawVersion = await balena.getReleaseVersion(parseInt(releaseId, 10));
	core.setOutput('version', rawVersion);

	if (core.getBooleanInput('create_ref', { required: false })) {
		await createRef(rawVersion, context.payload.pull_request?.head.sha);
	}

	// Action is now done and will run again once we merge
}
