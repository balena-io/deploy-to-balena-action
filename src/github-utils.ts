import * as github from '@actions/github';
import { exec } from '@actions/exec';

type MetaContext = {
	owner: string;
	name: string;
	ref: string;
};

export async function attachToWorkflow(
	workflowId: string,
	data: object,
): Promise<void> {
	return;
}

export async function getFromWorkflow(
	workflowId: string,
	key: string,
): Promise<string> {
	return 'abc';
}

export function repositoryMetaContext(): MetaContext {
	return {
		owner: github.context.payload.repository.owner.login,
		name: github.context.payload.repository.name,
		ref: github.context.payload.pull_request.head.sha,
	};
}

export function isPullRequest(): boolean {
	return github.context.payload.hasOwnProperty('pull_request');
}
