import * as github from '@actions/github';
import * as core from '@actions/core';

const token = core.getInput('github_token', { required: true });
const environment = core.getInput('environment', { required: false });
const octokit = github.getOctokit(token);
const repoContext = {
	owner: github.context.payload.repository?.owner.login || '',
	name: github.context.payload.repository?.name || '',
	ref: github.context.payload.pull_request?.head.sha || '',
};

/**
 * Allows you to persist a release to the workflow output (does not get removed after 90 days like step/action outputs)
 *
 * @param {release} release - Release to persist
 *
 */

export async function saveRelease(release: Release): Promise<void> {
	// Get current output so we can add to it if needed
	const output = await getOutput();
	// If output doesn't have environment set then initiate object
	if (!output.hasOwnProperty(environment)) {
		output[environment] = {};
	}
	// Set the new Release in the ReleaseStore
	output[environment][release.id] = release;
	// Store new output
	return setOutput(output);
}

/**
 * Get stored Releases from the workflow's output filtered by this action's environment context
 *
 * @return {Releases} Releases from the output
 */

export async function getReleases(): Promise<Releases> {
	// Get workflow's output data
	const output = await getOutput();
	// Check if output contains a Releases for the environment
	if (!output.hasOwnProperty(environment)) {
		// No Releases found
		return {};
	}
	// Return Release
	return output[environment];
}

async function getOutput(): Promise<ReleaseStore> {
	const thisCheckRun = await getThisCheck();
	if (!thisCheckRun.output.text) {
		return {};
	}
	return JSON.parse(thisCheckRun.output.text);
}

async function setOutput(data: ReleaseStore): Promise<void> {
	return updateRun(JSON.stringify(data));
}

async function getThisCheck(): Promise<CheckRun> {
	if (process.env.GITHUB_ACTIONS === 'false') {
		core.debug(
			'Not getting check runs from Github API because action is false.',
		);
		return {
			id: -1,
			name: 'fake',
			output: { text: '', summary: '', title: '' },
		};
	}
	// Make sure the context has a check run (workflow) name
	if (!github.context.workflow) {
		throw new Error('Workflow must contain a name');
	}
	// Get the checks for this commit
	let checks;
	try {
		checks = (
			await octokit.request(
				'GET /repos/{owner}/{repo}/commits/{ref}/check-runs',
				{
					owner: repoContext.owner,
					repo: repoContext.name,
					ref: repoContext.ref,
				},
			)
		).data;
	} catch (e) {
		throw new Error(
			`Failed to fetch check runs for: ${repoContext.owner}/${repoContext.name}:${repoContext.ref}`,
		);
	}
	// Find the check run that matches the name in the context
	const check = checks.check_runs.filter(
		(c: CheckRun) => c.name === github.context.workflow,
	)[0];
	if (!check) {
		throw new Error(
			`Unable to find target ${github.context.workflow} in checks ran on commit ${repoContext.ref}.`,
		);
	}
	return check;
}

async function updateRun(data: string): Promise<void> {
	if (process.env.GITHUB_ACTIONS === 'false') {
		core.debug('Not updating check run on Github API because action is false.');
		return; // Do not actually update output if this code is not being ran by Github
	}
	const thisCheckRun = await getThisCheck();
	await octokit.request(
		'PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}',
		{
			owner: repoContext.owner,
			repo: repoContext.name,
			check_run_id: thisCheckRun.id,
			output: {
				title: 'Build release',
				summary: 'Succssfully built a release!',
				text: data,
			},
		},
	);
}

interface ReleaseStore {
	[key: string]: Releases;
}

interface Releases {
	[key: string]: Release;
}

type Release = {
	id: string;
	finalized: boolean;
};

type CheckRun = {
	id: number;
	name: string;
	output: {
		title: string;
		summary: string;
		text: string;
	};
};
