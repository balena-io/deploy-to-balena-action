import * as github from '@actions/github';
import * as core from '@actions/core';

type CheckRun = {
	id: number;
	name: string;
	status: string;
};

let octokit: ReturnType<typeof github.getOctokit> | null = null;

export function init(token: string) {
	octokit = github.getOctokit(token);
}

export async function getChecks(
	owner: string,
	repo: string,
	ref: string,
): Promise<CheckRun[]> {
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
					owner,
					repo,
					ref,
				},
			)
		).data;
	} catch (e: any) {
		core.error(e.message);
		throw new Error(`Failed to fetch check runs for: ${owner}/${repo}:${ref}`);
	}
	return response.check_runs;
}

// https://docs.github.com/en/rest/reference/git#create-a-reference
export async function createTag(tag: string, sha: string): Promise<string> {
	if (!octokit) {
		throw new Error('Octokit has not been initialized');
	}

	core.info(`Creating refs/tags/${tag}`);

	const response = await octokit.rest.git.createRef({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		ref: `refs/tags/${tag}`,
		sha,
	});

	return response.data.url;
}
