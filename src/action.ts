import * as core from '@actions/core';
import { context } from '@actions/github';

import * as github from './github-utils';
import * as versionbot from './versionbot-utils';
import * as balena from './balena-utils';
import * as git from './git';

export async function run(): Promise<void> {
	// Name of the workflow this action is running in (to store and get data from)
	const workflowName = process.env.GITHUB_WORKFLOW;
	// If the workflow does not have a name then fail early
	if (!workflowName) {
		throw new Error('Workflow must contain a name');
	}

	// If the payload does not have a repository object then fail early
	if (!context.payload.repository) {
		throw new Error('Workflow payload was missing repository object');
	}

	// Get the master branch so we can infer intent
	const target = context.payload.repository.master_branch;
	// Environment to build releases in
	const environment = core.getInput('environment', { required: false });
	// Name of the fleet to build for
	const fleet = core.getInput('fleet', { required: true });
	// File path to release source code
	const src = process.env.GITHUB_WORKSPACE || '';

	// If we are pushing directly to the target branch then just build a release without draft flag
	if (context.eventName === 'push' && context.ref === `ref/heads/${target}`) {
		await balena.push(fleet, src, false);
		return; // Done action!
	} else if (context.eventName !== 'pull_request') {
		throw new Error(`Unsure how to proceed with event: ${context.eventName}`);
	}

	// If a pull request was closed and merged then finalize releases!
	if (
		context.event.action === 'closed' &&
		context.payload.pull_request?.merged
	) {
		// Get all the previous releases built during this workflow filtered by environment
		const previousReleases = await getReleases(workflowName, environment);
		// Finalize all the releases
		for (const r of previousReleases) {
			await balena.finalize(r.id);
		}
		if (previousReleases.length > 0) {
			// if there releases, clear them so subsequent calls to this action don't try to finalize already final releases
			await clearReleases(workflowName, environment);
		}
		return; // Action is done!
	}

	// If the action has made it this far then we will build a draft release

	// Indicate to action if repo uses Versionbot for versioning
	const hasVersionbot = core.getInput('versionbot', { required: false });
	// Extract info about the git repository
	const { name: repoName } = github.repositoryMetaContext();

	// If the repository uses Versionbot then checkout Versionbot branch
	if (hasVersionbot) {
		const versionbotBranch = await versionbot.getBranch();
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.checkout(repoName, versionbotBranch);
	}

	// Now send the source to the builders which will build a draft
	const releaseId = await balena.push(fleet, src);
	// Persist built release to workflow
	await setRelease(workflowName, environment, { id: releaseId });
	// Set the built releaseId in the output
	core.setOutput('releaseId', releaseId);
	// Action is now done and will run again once we merge
}

/**
 * A release
 * @typedef {Object} Release
 * @property {string} id - ID provided from builders which identifies the release in balenaCloud
 */

type Release = {
	id: string;
};

/**
 * Allows you to persist a release to the workflouw output (do not get removed after 90 days like normal outputs)
 *
 * This function only accepts a single release because we only want to create 1 release per run.
 * However, it will find previously created releases and add to that list.
 *
 * @param {string} workflow - name of the workflow to set output for (typically the workflow running this action)
 * @param {string} environment - environment the release were built on
 * @param {release} data - release object to store
 *
 */

async function setRelease(
	workflowName: string,
	environment: string,
	data: Release,
): Promise<void> {
	await github.setOutput(workflowName, JSON.stringify({ releases: data }));
}

// This function returns an array of releases because when we finalize a release we will just do all
/**
 * Fetches a list of releases attached to the output of the given workflow
 *
 * Since releases are stored by environment, the function will filter releases on that.
 *
 * @param {string} workflow - name of the workflow to get output from
 * @param {string} environment - environment the releases were built on
 *
 */

async function getReleases(
	workflowName: string,
	environment: string,
): Promise<Release[]> {
	const output = await github.getOutput(workflowName);
	const outputJSON = JSON.parse(output);
	if (outputJSON.hasOwnProperty('releases')) {
		return outputJSON.releases;
	}
	return [];
}
