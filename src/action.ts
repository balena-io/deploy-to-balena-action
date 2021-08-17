import * as core from '@actions/core';

import * as github from './github-utils';
import * as versionbot from './versionbot-utils';
import * as balena from './balena-utils';
import * as git from './git';

export async function run(): Promise<void> {
	// ID of the workflow this action is running in (to store and get data from)
	const workflowName = core.getInput('workflow_name');

	// Let's try to find if this workflow previously built a release
	const previousReleaseId = await github.getFromWorkflow(
		workflowName,
		'releaseId',
	);

	// If the workflow contains a previous release then just mark it as final
	if (previousReleaseId) {
		// This happens when the action ran during a PR and now it is merged so mark as final
		await balena.finalize(previousReleaseId);
		return;
	}

	// Now we know we're going to push some code so let's get some more variables...

	// Name of fleet to build releases for
	const fleet = core.getInput('fleet');
	// Indicate to action if repo uses Versionbot for vesrioning
	const hasVersionbot = core.getInput('versionbot');
	// File path to release source code
	const src = process.env.GITHUB_WORKSPACE || '';
	// Extract info about the git repository
	const { name } = github.repositoryMetaContext();

	// If the repository uses Versionbot then checkout Versionbot branch
	if (hasVersionbot) {
		const versionbotBranch = await versionbot.getBranch();
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.checkout(name, versionbotBranch);
	}

	// If the action is running in the context of a pull request then build with draft flag
	// Otherwise, this release will be marked as final.
	// This is for workflows where you push directly to branches without PR so drafts are not needed
	const isDraft = github.isPullRequest();
	// Now send the source to the builders
	const releaseId = await balena.push(fleet, src, isDraft);
	// If this is a draft release let's persist the ID to the workflow so it can be finalized later
	if (isDraft) {
		// Persist releaseId to this workflow
		await github.attachToWorkflow(workflowName, { releaseId });
	}
	// Now we're all done!
}
