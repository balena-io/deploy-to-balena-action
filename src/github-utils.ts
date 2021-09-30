import * as github from '@actions/github';
import * as core from '@actions/core';

const environment = core.getInput('environment', { required: false });
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
	core.debug(`Saving release with id: ${release.id}`);
	// Get current output so we can add to it if needed
	const output = await getOutput();
	// If output doesn't have environment set then initiate object
	if (!output.hasOwnProperty(environment)) {
		core.debug(`Output does not contain release for ${environment}`);
		output[environment] = {};
	}
	// Store releases in ReleaseStore by environment and job
	output[environment][github.context.job] = release;
	// Store new output
	return setOutput(output);
}

/**
 * Get stored Release from the workflow's output filtered by this action's environment context
 *
 * @return {Release} Release from the ReleaseStore
 */

export async function getRelease(): Promise<Release | null> {
	core.debug('Getting releases');
	// Get workflow's output data
	const output = await getOutput();
	// Check if output contains Releases for the environment
	if (!output.hasOwnProperty(environment)) {
		core.debug(`Output does not contain releases for ${environment}`);
		// No Release found
		return null;
	}
	core.debug(`Found releases for ${environment}`);
	// Check if the environment has a release for this job
	if (!output[environment].hasOwnProperty(github.context.job)) {
		core.debug(
			`Output contained a release for ${environment} but not job ${github.context.job}`,
		);
		// No Release found for this job
		return null;
	}
	// Return Release
	return output[environment][github.context.job];
}

async function getOutput(): Promise<ReleaseStore> {
	core.debug('Getting workflow output');
	const thisCheckRun = await getThisCheck();
	if (!thisCheckRun.output.text) {
		core.debug('Did not find existing output values');
		return {};
	}
	core.debug(`Found existing output: ${thisCheckRun.output.text}`);
	return JSON.parse(thisCheckRun.output.text);
}

async function setOutput(data: ReleaseStore): Promise<void> {
	core.debug(`Setting output ${JSON.stringify(data)}`);
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
			completed_at: new Date().toISOString(),
		};
	}
	const token = core.getInput('github_token', { required: true });
	const octokit = github.getOctokit(token);
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
	const check = checks.check_runs
		.filter((c: CheckRun) => c.name === github.context.job)
		.sort(
			(a: CheckRun, b: CheckRun) =>
				new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
		)[0];
	if (!check) {
		throw new Error(
			`Unable to find target ${github.context.job} in checks ran on commit ${repoContext.ref}.`,
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
	const token = core.getInput('github_token', { required: true });
	const octokit = github.getOctokit(token);
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
	completed_at: string;
};
