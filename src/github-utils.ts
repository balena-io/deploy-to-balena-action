import * as github from '@actions/github';
import * as core from '@actions/core';

import { RepoContext } from './types';

type CheckRun = {
	id: number;
	name: string;
	status: string;
};

let octokit: ReturnType<typeof github.getOctokit> | null = null;

export function init(token: string) {
	octokit = github.getOctokit(token);
}

export async function getChecks(context: RepoContext): Promise<CheckRun[]> {
	if (!octokit) {
		throw new Error('Octokit has not been initialized');
	}
	// Get the checks for this commit
	let response;
	try {
		response = (
			await octokit.request(
				'GET /repos/{owner}/{repo}/commits/{ref}/check-runs',
				{
					owner: context.owner,
					repo: context.name,
					ref: context.sha,
				},
			)
		).data;
	} catch (e: any) {
		core.error(e.message);
		throw new Error(
			`Failed to fetch check runs for: ${context.owner}/${context.name}:${context.sha}`,
		);
	}
	return response.check_runs;
}

// https://docs.github.com/en/rest/reference/git#create-a-reference
export async function createTag(
	context: RepoContext,
	tag: string,
): Promise<string> {
	if (!octokit) {
		throw new Error('Octokit has not been initialized');
	}

	core.info(`Creating refs/tags/${tag}`);

	const response = await octokit.rest.git.createRef({
		owner: context.owner,
		repo: context.name,
		ref: `refs/tags/${tag}`,
		sha: context.sha,
	});

	return response.data.url;
}
