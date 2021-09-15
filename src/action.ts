import * as core from '@actions/core';
import { context } from '@actions/github';

import * as github from './github-utils';
import * as versionbot from './versionbot-utils';
import * as balena from './balena-utils';
import * as git from './git';

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

	// If we are pushing directly to the target branch then just build a release without draft flag
	if (context.eventName === 'push' && context.ref === `refs/heads/${target}`) {
		releaseId = await balena.push(fleet, src, false);
		// Set the built releaseId in the output
		core.setOutput('releaseId', releaseId);
		return; // Done action!
	} else if (context.eventName !== 'pull_request') {
		if (context.eventName === 'push') {
			throw new Error(
				`Push workflow only works with ${target} branch. Event tried pushing to: ${context.ref}`,
			);
		}
		throw new Error(`Unsure how to proceed with event: ${context.eventName}`);
	}

	// If a pull request was closed and merged then finalize releases!
	if (
		context.payload.action === 'closed' &&
		context.payload.pull_request?.merged
	) {
		// Get all the previous releases built during this workflow
		const previousReleases = await github.getReleases();
		// Finalize all the releases
		for (const rId in previousReleases) {
			if (!previousReleases[rId].finalized) {
				await balena.finalize(rId);
				await github.saveRelease({ id: rId, finalized: true });
			}
		}
		return; // Action is done!
	}

	// If the action has made it this far then we will build a draft release

	// Indicate to action if repo uses Versionbot for versioning
	const hasVersionbot = core.getInput('versionbot', { required: false });

	// If the repository uses Versionbot then checkout Versionbot branch
	if (hasVersionbot) {
		const versionbotBranch = await versionbot.getBranch(
			context.payload.pull_request?.id,
		);
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.checkout(versionbotBranch);
	}

	// Now send the source to the builders which will build a draft
	releaseId = await balena.push(fleet, src);
	// Persist built release to workflow
	await github.saveRelease({ id: releaseId, finalized: false });
	// Set the built releaseId in the output
	core.setOutput('releaseId', releaseId);
	// Action is now done and will run again once we merge
}
