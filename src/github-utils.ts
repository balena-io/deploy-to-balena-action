import * as github from '@actions/github';
import * as core from '@actions/core';

const repoContext = {
	owner: github.context.payload.repository?.owner.login || '',
	name: github.context.payload.repository?.name || '',
	ref: github.context.payload.pull_request?.head.sha || '',
};

type CheckRun = {
	id: number;
	name: string;
	status: string;
};

export async function getChecks(): Promise<CheckRun[]> {
	const token = core.getInput('github_token', { required: true });
	const octokit = github.getOctokit(token);
	// Get the checks for this commit
	let response;
	try {
		response = (
			await octokit.request(
				'GET /repos/{owner}/{repo}/commits/{ref}/check-runs',
				{
					owner: repoContext.owner,
					repo: repoContext.name,
					ref: repoContext.ref,
				},
			)
		).data;
	} catch (e: any) {
		core.error(e.message);
		throw new Error(
			`Failed to fetch check runs for: ${repoContext.owner}/${repoContext.name}:${repoContext.ref}`,
		);
	}
	return response.check_runs;
}

// https://docs.github.com/en/rest/reference/git#create-a-reference
export async function createRef(tag: string, sha: string): Promise<string> {
	const token = core.getInput('github_token', { required: true });
	const octokit = github.getOctokit(token);

	core.debug(`Creating refs/tags/${tag}`);

	const response = await octokit.rest.git.createRef({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		ref: `refs/tags/${tag}`,
		sha,
	});

	core.debug(JSON.stringify(response.data));
	// TODO: catch 'ref already exists'	errors and don't throw

	return response.data.url;
}
