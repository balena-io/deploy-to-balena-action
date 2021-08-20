import * as core from '@actions/core';

import * as github from './github-utils';
import * as versionbot from './versionbot-utils';
import * as balena from './balena-utils';
import * as git from './git';

export async function run(): Promise<void> {
	// Name of the workflow this action is running in (to store and get data from)
	const workflowName = process.env.GITHUB_WORKFLOW;

	// If the workflow does not have a name then fail early
	if (!workflowName) {
		throw new Error('Workflow must contain a name.');
	}

	// Let's try to find if this workflow previously built a release
	const previousReleaseId = await github.getOutput(workflowName);

	// If the action is running in the context of a pull request then build with draft flag
	// Otherwise, this release will be marked as final.
	// This is for workflows where you push directly to branches without PR so drafts are not needed
	const isDraft = github.isPullRequest();

	// If the workflow contains a previous release and is not a pull request then just mark it as final
	if (previousReleaseId && !isDraft) {
		// This happens when the action ran during a PR and now it is merged so mark as final
		await balena.finalize(previousReleaseId);
		return;
	}

	// Now we know we're going to push some code so let's get some more variables...

	// Name of fleet or fleets to build releases for
	const fleetInput = core.getInput('fleet', { required: true });
	// Split input on comma delimiter and trim whitespaces
	const fleets = fleetInput.split(',').map((f) => f.trim());
	// Indicate to action if repo uses Versionbot for vesrioning
	const hasVersionbot = core.getInput('versionbot');
	// File path to release source code
	const src = process.env.GITHUB_WORKSPACE || '';
	// Extract info about the git repository
	const { name: repoName } = github.repositoryMetaContext();

	// If the repository uses Versionbot then checkout Versionbot branch
	if (hasVersionbot) {
		const versionbotBranch = await versionbot.getBranch();
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.checkout(repoName, versionbotBranch);
	}

	const releasesBuilt: string[] = [];
	// For each fleet push a release
	for (const fleet of fleets) {
		// Now send the source to the builders
		const releaseId = await balena.push(fleet, src, isDraft);
		// Push to list of built releases
		releasesBuilt.push(releaseId);
	}

	// If we just made draft releases we need to persist the IDs of each release so we can finalize it at a later point
	if (isDraft) {
		const releases = releasesBuilt.map((release) => {
			return { id: release, finalized: false };
		});
		await github.setOutput(workflowName, { releases });
	}

	// Now we're all done!
}
